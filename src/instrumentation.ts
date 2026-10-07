export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server");
  }
}

export const onRequestError = (await import("@sentry/nextjs")).captureRequestError;
