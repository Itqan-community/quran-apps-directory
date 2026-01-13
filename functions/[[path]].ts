/**
 * Cloudflare Pages Function - Asset 404 Handler
 *
 * Problem: Cloudflare's _redirects catch-all returns HTML for missing JS/CSS files.
 * This causes "expected expression, got '<'" errors when browsers try to parse HTML as JS.
 *
 * Solution: Intercept static asset requests and return proper 404 if the file doesn't exist.
 */

interface CFContext {
  request: Request;
  next: () => Promise<Response>;
}

export const onRequest = async (context: CFContext): Promise<Response> => {
  const { request, next } = context;
  const path = new URL(request.url).pathname;

  // Check if this is a static asset request (JS, CSS, fonts, source maps)
  const isStaticAsset = /\.(js|css|map|woff2?|ttf|eot)$/i.test(path);

  if (isStaticAsset) {
    const response = await next();

    // If Cloudflare returned HTML for a missing asset (catch-all redirect), return 404 instead
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      return new Response('Not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    return response;
  }

  // For non-static assets, let the normal routing handle it
  return next();
};
