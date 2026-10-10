import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs/config";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

function r2PublicPattern(): RemotePattern | null {
  const raw = process.env.R2_PUBLIC_URL;
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if ((parsed.protocol === "https:" || parsed.protocol === "http:") && parsed.hostname) {
      return {
        protocol: parsed.protocol === "https:" ? "https" : "http",
        hostname: parsed.hostname,
        port: parsed.port || undefined,
      };
    }
  } catch {
    return null;
  }
  return null;
}

const r2Public = r2PublicPattern();

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: r2Public
      ? [
          { protocol: "https", hostname: "pub-e11717db663c469fb51c65995892b449.r2.dev" },
          r2Public,
        ]
      : [{ protocol: "https", hostname: "pub-e11717db663c469fb51c65995892b449.r2.dev" }],
  },
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    globalNotFound: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  telemetry: false,
  silent: true,
  sourcemaps: { disable: true },
});
