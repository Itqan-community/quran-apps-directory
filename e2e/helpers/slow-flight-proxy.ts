import http from "node:http";
import type { AddressInfo } from "node:net";
import zlib from "node:zlib";
import fs from "node:fs";

export type SlowFlightProxy = {
  port: number;
  close: () => Promise<void>;
};

/**
 * Row tags whose payload is preceded by a hex length and a comma; every other
 * row (tagged or bare) is newline-terminated. Taken from the React Flight
 * client parser (react-server-dom-turbopack-client, processBinaryChunk).
 * Length-prefixed rows may contain newlines inside their payload, so row
 * walking must skip them by length instead of splitting on newlines.
 */
const LENGTH_PREFIXED_TAGS = new Set([
  "T",
  "A",
  "O",
  "o",
  "b",
  "U",
  "S",
  "s",
  "L",
  "l",
  "G",
  "g",
  "M",
  "m",
  "V",
]);

const isHexByte = (b: number) => (b >= 0x30 && b <= 0x39) || (b >= 0x61 && b <= 0x66);

/**
 * Walks the top-level rows of an RSC flight and returns the byte offset where
 * the row with the given id starts, or -1. Length-prefixed rows (SVG text
 * rows, and the `o` chunks of a readable-stream row carrying a nested flight)
 * are skipped whole, so row ids inside nested flights never collide with
 * top-level ones.
 */
function findRowStart(body: Buffer, rowId: string): number {
  const target = Buffer.from(rowId, "ascii");
  let i = 0;
  const n = body.length;
  while (i < n) {
    let j = i;
    while (j < n && isHexByte(body[j])) j++;
    if (j >= n || body[j] !== 0x3a) return -1; // ":"
    const id = body.subarray(i, j);
    let k = j + 1;
    let end: number;
    if (k < n && LENGTH_PREFIXED_TAGS.has(String.fromCharCode(body[k]))) {
      k++;
      let len = 0;
      while (k < n && isHexByte(body[k])) {
        len = len * 16 + (body[k] > 0x60 ? body[k] - 0x57 : body[k] - 0x30);
        k++;
      }
      if (k >= n || body[k] !== 0x2c) return -1; // ","
      k++;
      end = k + len;
      if (end > n) return -1;
    } else {
      const nl = body.indexOf(0x0a, k); // "\n"
      end = nl === -1 ? n : nl + 1;
    }
    if (id.equals(target)) return i;
    i = end;
  }
  return -1;
}

/**
 * Finds the byte offset where the settled content of the flight begins:
 *
 * 1. The dock's streamed count is serialized as a promise reference
 *    (`"count":"$@<row>"` in the dock props row) that resolves in its own
 *    row; that row is the first settled row after the fallback shell. The
 *    i18n catalog also has a `count` key, but its value is a plain string
 *    and never matches the `$@` reference pattern.
 * 2. Fallback: the results Suspense boundary's children reference
 *    (`"children":"$L<row>"` on the row carrying `"fallback"`).
 *
 * Returns the body length (no split) when neither marker is found, so a
 * flight that already resolves everything inline passes through unchanged.
 */
function findSettledStart(body: Buffer): number {
  const text = body.toString("utf8");
  const countRef = /"count":"\$@([0-9a-f]+)"/.exec(text);
  if (countRef) {
    const at = findRowStart(body, countRef[1]);
    if (at > 0) return at;
  }
  const fallbackAt = text.indexOf('"fallback"');
  if (fallbackAt !== -1) {
    const rowEnd = text.indexOf("\n", fallbackAt);
    const suspenseRow = text.slice(fallbackAt, rowEnd === -1 ? undefined : rowEnd);
    const childrenRef = /"children":"\$L([0-9a-f]+)"/.exec(suspenseRow);
    if (childrenRef) {
      const at = findRowStart(body, childrenRef[1]);
      if (at > 0) return at;
    }
  }
  return body.length;
}

/**
 * Local HTTP proxy that replays an RSC flight response in two parts: the
 * streaming fallback shell immediately, then the settled content after
 * `delayMs`. This widens the skeleton window (normally the DB query time,
 * tens of ms) to a testable span, so the test can act while the fallback
 * dock and skeleton are visible.
 *
 * The split point is the start of the row carrying the settled dock's count
 * (see `findSettledStart`): everything before it renders the fallback (dock
 * with a shimmering count, skeleton cards), everything from it on resolves
 * the count and swaps in the settled listing.
 */
export async function startSlowFlightProxy(
  origin: string,
  delayMs = 2_500,
): Promise<SlowFlightProxy> {
  const server = http.createServer((req, res) => {
    const upstream = http.request(
      origin + req.url,
      {
        method: req.method,
        headers: { ...req.headers, host: new URL(origin).host },
      },
      (upstreamRes) => {
        const chunks: Buffer[] = [];
        upstreamRes.on("data", (chunk: Buffer) => chunks.push(chunk));
        upstreamRes.on("end", () => {
          let body = Buffer.concat(chunks);
          if (upstreamRes.headers["content-encoding"] === "gzip") {
            body = zlib.gunzipSync(body);
          }
          const split = findSettledStart(body);
          // TEMP DEBUG
          try {
            const dbgText = body.toString("utf8");
            fs.appendFileSync(
              "/tmp/opencode/proxy-debug.log",
              `[slow-flight-proxy] url=${req.url} len=${body.length} split=${split} ` +
                `countRef=${/"count":"\$@/.test(dbgText)} fallback=${dbgText.indexOf('"fallback"')} ` +
                `shimmer=${dbgText.includes("shimmer-card")}\n`,
            );
          } catch {}

          const headers: http.OutgoingHttpHeaders = {};
          for (const [key, value] of Object.entries(upstreamRes.headers)) {
            if (
              [
                "content-encoding",
                "content-length",
                "transfer-encoding",
                "date",
                "connection",
                "keep-alive",
              ].includes(key)
            ) {
              continue;
            }
            headers[key] = value;
          }
          res.writeHead(upstreamRes.statusCode ?? 200, headers);
          res.write(body.subarray(0, split));
          const timer = setTimeout(() => {
            if (!res.destroyed) {
              res.write(body.subarray(split));
              res.end();
            }
          }, delayMs);
          timer.unref();
        });
        upstreamRes.on("error", () => res.destroy());
      },
    );
    upstream.on("error", () => res.destroy());
    req.resume();
    upstream.end();
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const port = (server.address() as AddressInfo).port;

  return {
    port,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      }),
  };
}
