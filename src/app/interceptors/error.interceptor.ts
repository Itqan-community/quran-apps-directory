import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as Sentry from '@sentry/angular';
import { environment } from '../../environments/environment';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (environment.sentry.enabled && environment.sentry.dsn) {
          Sentry.captureException(error, {
            extra: {
              url: req.url,
              method: req.method,
              status: error.status,
              statusText: error.statusText,
              message: error.message
            },
            tags: {
              type: 'http_error',
              status_code: String(error.status)
            }
          });
        }
        return throwError(() => error);
      })
    );
  }
}
