import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CacheHeadersService {

  /**
   * Add cache control headers to requests
   */
  addCacheHeaders(request: HttpRequest<any>, cachePolicy: 'default' | 'no-cache' | 'force-cache' = 'default'): HttpRequest<any> {
    let headers = request.headers;

    switch (cachePolicy) {
      case 'no-cache':
        headers = headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
                          .set('Pragma', 'no-cache')
                          .set('Expires', '0');
        break;
      case 'force-cache':
        headers = headers.set('Cache-Control', 'public, max-age=3600'); // 1 hour
        break;
      default:
        headers = headers.set('Cache-Control', this.getDefaultCacheControl(request.url));
    }

    return request.clone({ headers });
  }

  /**
   * Get default cache control based on URL pattern
   */
  private getDefaultCacheControl(url: string): string {
    if (url.includes('/assets/i18n/')) {
      return 'public, max-age=604800'; // 7 days for translations
    }
    if (url.includes('/assets/images/')) {
      return 'public, max-age=2592000'; // 30 days for images
    }
    if (url.includes('/api/')) {
      return 'public, max-age=300'; // 5 minutes for API responses
    }
    return 'public, max-age=3600'; // 1 hour default
  }

  /**
   * Add ETag support headers
   */
  addETagHeaders(request: HttpRequest<any>): HttpRequest<any> {
    let headers = request.headers;

    // Add If-None-Match for conditional requests
    if (request.method === 'GET') {
      const etag = localStorage.getItem(`etag_${request.url}`);
      if (etag) {
        headers = headers.set('If-None-Match', etag);
      }
    }

    return request.clone({ headers });
  }

  /**
   * Store ETag from response
   */
  storeETag(url: string, etag: string): void {
    if (etag && etag !== '""') {
      localStorage.setItem(`etag_${url}`, etag);
    }
  }

  /**
   * Add Last-Modified support headers
   */
  addLastModifiedHeaders(request: HttpRequest<any>): HttpRequest<any> {
    let headers = request.headers;

    // Add If-Modified-Since for conditional requests
    if (request.method === 'GET') {
      const lastModified = localStorage.getItem(`last_modified_${request.url}`);
      if (lastModified) {
        headers = headers.set('If-Modified-Since', lastModified);
      }
    }

    return request.clone({ headers });
  }

  /**
   * Store Last-Modified from response
   */
  storeLastModified(url: string, lastModified: string): void {
    if (lastModified) {
      localStorage.setItem(`last_modified_${url}`, lastModified);
    }
  }

  /**
   * Create optimized headers for static assets
   */
  getStaticAssetHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Cache-Control': 'public, max-age=31536000, immutable', // 1 year, immutable
      'Expires': new Date(Date.now() + 31536000 * 1000).toUTCString()
    });
  }

  /**
   * Create headers for dynamic content
   */
  getDynamicContentHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Cache-Control': 'public, max-age=300, must-revalidate', // 5 minutes
      'Vary': 'Accept-Encoding, Accept-Language'
    });
  }

  /**
   * Create headers for user-specific content
   */
  getUserSpecificHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Cache-Control': 'private, max-age=0, must-revalidate',
      'Vary': 'Cookie, Authorization'
    });
  }

  /**
   * Clear cache-related headers for a URL
   */
  clearCacheHeaders(url: string): void {
    localStorage.removeItem(`etag_${url}`);
    localStorage.removeItem(`last_modified_${url}`);
  }

  /**
   * Clear all cache-related headers
   */
  clearAllCacheHeaders(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('etag_') || key.startsWith('last_modified_')) {
        localStorage.removeItem(key);
      }
    });
  }
}

@Injectable()
export class CacheHeadersInterceptor implements HttpInterceptor {
  constructor(private cacheHeadersService: CacheHeadersService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip for non-GET requests
    if (request.method !== 'GET') {
      return next.handle(request);
    }

    // Add appropriate cache headers
    let modifiedRequest = this.cacheHeadersService.addCacheHeaders(request);
    modifiedRequest = this.cacheHeadersService.addETagHeaders(modifiedRequest);
    modifiedRequest = this.cacheHeadersService.addLastModifiedHeaders(modifiedRequest);

    return next.handle(modifiedRequest);
  }
}