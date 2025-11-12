import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * HTTP Interceptor for ETag-based caching
 *
 * This interceptor is a pass-through that allows the browser's native HTTP cache
 * to handle caching via ETag headers and Cache-Control directives.
 * Backend API returns proper cache headers for browser-based HTTP caching.
 */
@Injectable()
export class CacheInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Pass through all requests to allow browser HTTP caching to work
    // ETag validation is handled by the browser automatically
    return next.handle(req);
  }
}
