import { createHash, randomUUID } from "node:crypto";
import { UAParser } from "ua-parser-js";
import { db } from "@/db";
import { appViewEvents } from "@/db/schema";

export function parseUserAgent(ua: string | null): {
  deviceType: string;
  browser: string | null;
  os: string | null;
} {
  if (!ua) return { deviceType: "unknown", browser: null, os: null };
  const parsed = new UAParser(ua).getResult();
  const deviceType = parsed.device.type ?? "desktop";
  const normalized = ["mobile", "tablet", "desktop", "bot"].includes(deviceType)
    ? deviceType
    : "unknown";
  return {
    deviceType: normalized,
    browser: parsed.browser.name
      ? `${parsed.browser.name}${parsed.browser.version ? ` ${parsed.browser.version.split(".")[0]}` : ""}`
      : null,
    os: parsed.os.name ? `${parsed.os.name}${parsed.os.version ? ` ${parsed.os.version}` : ""}` : null,
  };
}

export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const day = new Date().toISOString().slice(0, 10); // daily-rotating salt
  const salt = `${process.env.VIEW_IP_SALT ?? "dev-salt"}-${day}`;
  return createHash("sha256").update(`${ip}${salt}`).digest("hex");
}

export function countryFromHeaders(h: Headers): string | null {
  const cf = h.get("cf-ipcountry") ?? h.get("CF-IPCountry");
  if (cf && /^[A-Z]{2}$/.test(cf) && cf !== "T1") return cf.toLowerCase();
  return null;
}

export type ViewEventInput = {
  appId: number;
  userAgent: string | null;
  ip: string | null;
  country: string | null;
  sessionId: string | null;
  referrer: string | null;
};

export async function recordViewEvent(input: ViewEventInput): Promise<void> {
  const { deviceType, browser, os } = parseUserAgent(input.userAgent);
  await db.insert(appViewEvents).values({
    appId: input.appId,
    referrer: input.referrer?.slice(0, 2000) ?? null,
    userAgent: input.userAgent?.slice(0, 1000) ?? null,
    sessionId: input.sessionId?.slice(0, 64) ?? null,
    countryCode: input.country,
    ipHash: hashIp(input.ip),
    deviceType,
    browser,
    os,
  });
}

export { randomUUID as newViewSessionId };
