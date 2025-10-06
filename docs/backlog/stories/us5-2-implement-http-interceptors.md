# US5.2: Implement HTTP Interceptors

**Epic:** Epic 5 - Frontend Integration  
**Sprint:** Week 4, Day 1-2  
**Story Points:** 5  
**Priority:** P1  
**Assigned To:** Frontend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** Frontend Developer  
**I want** HTTP interceptors for authentication, caching, and error handling  
**So that** cross-cutting concerns are handled consistently across all API requests

---

## 🎯 Acceptance Criteria

### AC1: Authentication Interceptor
- [ ] Automatically adds JWT token to all requests
- [ ] Reads token from localStorage/sessionStorage
- [ ] Adds `Authorization: Bearer {token}` header
- [ ] Skips token for public endpoints (login, register)
- [ ] Handles token expiry (401 response)

### AC2: Error Interceptor
- [ ] Intercepts all HTTP error responses
- [ ] Shows user-friendly error messages via notification service
- [ ] Handles specific error codes:
  - 401: Redirect to login
  - 403: Show "Access Denied" message
  - 404: Show "Not Found" message
  - 500: Show "Server Error" message
- [ ] Network errors show "Connection Error"

### AC3: Loading Interceptor
- [ ] Shows loading indicator on request start
- [ ] Hides loading indicator on request complete/error
- [ ] Tracks multiple concurrent requests
- [ ] Minimum display time (200ms to avoid flicker)

### AC4: Cache Interceptor
- [ ] Caches GET requests for categories (1 hour TTL)
- [ ] Cache key based on URL + query params
- [ ] Cache stored in memory (service)
- [ ] Cache bypass option (`headers.set('X-Skip-Cache', 'true')`)
- [ ] Cache clear method available

### AC5: Logging Interceptor (Dev Only)
- [ ] Logs all requests to console (dev mode)
- [ ] Logs request details: method, URL, headers (sanitized)
- [ ] Logs response status and duration
- [ ] Disabled in production

### AC6: Interceptor Order
- [ ] Correct chaining order:
  1. Logging (dev)
  2. Authentication
  3. Cache (GET requests)
  4. Loading
  5. Error handling

---

## 📝 Technical Notes

### Auth Interceptor
```typescript
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly publicEndpoints = ['/api/auth/login', '/api/auth/register'];
  
  constructor(private authService: AuthService) {}
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip auth for public endpoints
    if (this.isPublicEndpoint(req.url)) {
      return next.handle(req);
    }
    
    const token = this.authService.getToken();
    
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    
    return next.handle(req);
  }
  
  private isPublicEndpoint(url: string): boolean {
    return this.publicEndpoints.some(endpoint => url.includes(endpoint));
  }
}
```

### Error Interceptor
```typescript
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { NotificationService } from '../services/notification.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private router: Router,
    private notificationService: NotificationService
  ) {}
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'An error occurred';
        
        if (error.error instanceof ErrorEvent) {
          // Client-side error
          errorMessage = `Connection Error: ${error.error.message}`;
        } else {
          // Server-side error
          switch (error.status) {
            case 401:
              errorMessage = 'Unauthorized. Please log in.';
              this.router.navigate(['/login']);
              break;
            case 403:
              errorMessage = 'Access Denied';
              break;
            case 404:
              errorMessage = 'Resource not found';
              break;
            case 500:
              errorMessage = 'Server error. Please try again later.';
              break;
            default:
              errorMessage = error.error?.message || `Error Code: ${error.status}`;
          }
        }
        
        this.notificationService.showError(errorMessage);
        
        return throwError(() => error);
      })
    );
  }
}
```

### Loading Interceptor
```typescript
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize, delay } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  private requestCount = 0;
  
  constructor(private loadingService: LoadingService) {}
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    this.requestCount++;
    this.loadingService.show();
    
    return next.handle(req).pipe(
      delay(200), // Minimum display time to avoid flicker
      finalize(() => {
        this.requestCount--;
        if (this.requestCount === 0) {
          this.loadingService.hide();
        }
      })
    );
  }
}
```

### Cache Interceptor
```typescript
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class CacheInterceptor implements HttpInterceptor {
  private cache = new Map<string, { response: HttpResponse<any>, timestamp: number }>();
  private readonly cacheTime = 60 * 60 * 1000; // 1 hour
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next.handle(req);
    }
    
    // Check for cache bypass header
    if (req.headers.get('X-Skip-Cache')) {
      return next.handle(req);
    }
    
    const cacheKey = req.urlWithParams;
    const cached = this.cache.get(cacheKey);
    
    // Return cached response if valid
    if (cached && (Date.now() - cached.timestamp) < this.cacheTime) {
      return of(cached.response.clone());
    }
    
    // Fetch and cache
    return next.handle(req).pipe(
      tap(event => {
        if (event instanceof HttpResponse) {
          this.cache.set(cacheKey, {
            response: event.clone(),
            timestamp: Date.now()
          });
        }
      })
    );
  }
  
  clearCache(): void {
    this.cache.clear();
  }
}
```

### Interceptor Registration (app.config.ts or providers)
```typescript
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([/* ... */])
    ),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: CacheInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: LoadingInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
    // Add logging interceptor only in dev
    ...(environment.production ? [] : [
      { provide: HTTP_INTERCEPTORS, useClass: LoggingInterceptor, multi: true }
    ])
  ]
};
```

---

## 🔗 Dependencies
- US5.1: API Service Layer
- NotificationService created (for error messages)
- LoadingService created (for loading indicator)
- AuthService created (for token management)

---

## 📊 Definition of Done
- [ ] All 5 interceptors implemented
- [ ] Interceptors registered in correct order
- [ ] Auth interceptor adds JWT tokens
- [ ] Error interceptor shows user-friendly messages
- [ ] Cache interceptor working (1-hour TTL)
- [ ] Loading indicator appears during requests
- [ ] Logging works in dev (disabled in prod)
- [ ] Unit tests written
- [ ] Integration tests pass

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 5: Frontend Integration](../epics/epic-5-frontend-integration.md)
