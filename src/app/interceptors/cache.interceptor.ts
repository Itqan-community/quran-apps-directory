import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError, shareReplay } from 'rxjs/operators';

import { CacheStorageService } from '../services/cache-storage.service';

type CachedResponse = HttpResponse<any> & { fromCache?: boolean };

@Injectable()
export class CacheInterceptor implements HttpInterceptor {
  private readonly cacheableMethods = ['GET'];
  private readonly cacheableContentTypes = ['application/json', 'text/plain'];
  private readonly maxCacheSize = 50; // Maximum number of cached responses
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL

  constructor(private cacheStorage: CacheStorageService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only cache GET requests
    if (!this.isCacheable(req)) {
      return next.handle(req);
    }

    // Check if response is already cached
    const cachedResponse = this.cacheStorage.get(req.urlWithParams);
    if (cachedResponse && !this.isExpired(cachedResponse)) {
      console.log(`[Cache] Serving from cache: ${req.urlWithParams}`);
      const response = cachedResponse.response as HttpResponse<any>;
      return of(response.clone({ headers: response.headers }));
    }

    // Make the request and cache the response
    return next.handle(req).pipe(
      tap(event => {
        if (event instanceof HttpResponse && this.isCacheableResponse(event)) {
          const cacheEntry = {
            response: event.clone(),
            timestamp: Date.now(),
            ttl: this.getTTLForUrl(req.urlWithParams)
          };

          this.cacheStorage.set(req.urlWithParams, cacheEntry);
          console.log(`[Cache] Cached response: ${req.urlWithParams}`);
        }
      }),
      catchError(error => {
        // If there's an error and we have a stale cache, serve it
        const staleResponse = this.cacheStorage.get(req.urlWithParams);
        if (staleResponse && this.isStale(staleResponse)) {
          console.log(`[Cache] Serving stale cache due to error: ${req.urlWithParams}`);
          const response = staleResponse.response as HttpResponse<any>;
          return of(response.clone({ headers: response.headers }));
        }
        return throwError(() => error);
      }),
      shareReplay(1) // Share the response among multiple subscribers
    );
  }

  private isCacheable(req: HttpRequest<any>): boolean {
    return this.cacheableMethods.includes(req.method) &&
           !req.headers.has('X-No-Cache') &&
           !req.url.includes('/upload') &&
           !req.url.includes('/stream');
  }

  private isCacheableResponse(response: HttpResponse<any>): boolean {
    const contentType = response.headers.get('content-type') || '';
    return this.cacheableContentTypes.some(type => contentType.includes(type)) &&
           response.status === 200;
  }

  private isExpired(cacheEntry: any): boolean {
    return Date.now() - cacheEntry.timestamp > cacheEntry.ttl;
  }

  private isStale(cacheEntry: any): boolean {
    // Consider stale if older than 1 hour
    return Date.now() - cacheEntry.timestamp > 60 * 60 * 1000;
  }

  private getTTLForUrl(url: string): number {
    // Different TTL for different types of content
    if (url.includes('/assets/i18n/')) {
      return 7 * 24 * 60 * 60 * 1000; // 7 days for translations
    }
    if (url.includes('/api/apps/')) {
      return 30 * 60 * 1000; // 30 minutes for app data
    }
    if (url.includes('/api/categories/')) {
      return 2 * 60 * 60 * 1000; // 2 hours for categories
    }
    return this.defaultTTL;
  }
}