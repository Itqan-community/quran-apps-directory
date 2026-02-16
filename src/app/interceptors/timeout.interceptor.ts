import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import * as Sentry from '@sentry/angular';
import { environment } from '../../environments/environment';

const DEFAULT_TIMEOUT_MS = 15000;

@Injectable()
export class TimeoutInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const timeoutValue = req.headers.get('X-Request-Timeout')
      ? Number(req.headers.get('X-Request-Timeout'))
      : DEFAULT_TIMEOUT_MS;

    return next.handle(req).pipe(
      timeout(timeoutValue),
      catchError((error) => {
        if (error instanceof TimeoutError) {
          const timeoutError = new Error(`Request timeout after ${timeoutValue}ms: ${req.url}`);

          if (environment.sentry.enabled && environment.sentry.dsn) {
            Sentry.captureException(timeoutError, {
              extra: {
                url: req.url,
                method: req.method,
                timeout: timeoutValue
              },
              tags: {
                type: 'http_timeout'
              }
            });
          }

          console.warn(`⏱️ Request timeout: ${req.url} (${timeoutValue}ms)`);
          return throwError(() => timeoutError);
        }
        return throwError(() => error);
      })
    );
  }
}
