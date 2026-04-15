import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  private performanceObserver?: PerformanceObserver;

  constructor(@Inject(PLATFORM_ID) private readonly platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.setupPerformanceMonitoring();
    }
  }

  /**
   * Setup performance monitoring for Core Web Vitals
   */
  private setupPerformanceMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Monitor Core Web Vitals
    this.observeCoreWebVitals();
    
    // Preload critical resources
    this.preloadCriticalResources();
  }

  /**
   * Observe Core Web Vitals metrics
   */
  private observeCoreWebVitals(): void {
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint (LCP)
      this.observeMetric('largest-contentful-paint', (entries) => {
        const lcp = entries[entries.length - 1];
        console.log('LCP:', lcp.startTime);
      });

      // First Input Delay (FID)
      this.observeMetric('first-input', (entries) => {
        const fid = entries[0] as any;
        console.log('FID:', fid.processingStart - fid.startTime);
      });

      // Cumulative Layout Shift (CLS)
      this.observeMetric('layout-shift', (entries) => {
        const cls = entries.reduce((sum, entry) => {
          const layoutShiftEntry = entry as any;
          if (!layoutShiftEntry.hadRecentInput) {
            return sum + layoutShiftEntry.value;
          }
          return sum;
        }, 0);
        console.log('CLS:', cls);
      });
    }
  }

  /**
   * Observe specific performance metrics
   */
  private observeMetric(entryType: string, callback: (entries: PerformanceEntry[]) => void): void {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      observer.observe({ entryTypes: [entryType] });
    } catch (error) {
      console.warn(`Performance observer for ${entryType} not supported`, error);
    }
  }

  /**
   * Preload critical resources
   */
  private preloadCriticalResources(): void {
    const criticalResources = [
      '/assets/images/logo-with-text.svg',
      '/assets/i18n/en.json',
      '/assets/i18n/ar.json'
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      link.as = resource.endsWith('.json') ? 'fetch' : 'image';
      if (resource.endsWith('.json')) {
        link.crossOrigin = 'anonymous';
      }
      document.head.appendChild(link);
    });
  }

  /**
   * Optimize images with lazy loading and WebP support
   */
  optimizeImages(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const images = document.querySelectorAll('img[data-src]');

    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const dataSrc = img.getAttribute('data-src');
            if (dataSrc) {
              img.src = dataSrc;
              img.removeAttribute('data-src');
              imageObserver.unobserve(img);
            }
          }
        });
      });

      images.forEach(img => imageObserver.observe(img));
    }
  }

  /**
   * Measure and log performance metrics
   */
  measurePerformance(): void {
    if (typeof window === 'undefined') return;

    // Navigation timing
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      const metrics = {
        dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcpConnect: navigation.connectEnd - navigation.connectStart,
        request: navigation.responseStart - navigation.requestStart,
        response: navigation.responseEnd - navigation.responseStart,
        domParsing: navigation.domContentLoadedEventStart - navigation.responseEnd,
        domReady: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: 0,
        firstContentfulPaint: 0
      };

      // Paint timing
      const paintEntries = performance.getEntriesByType('paint');
      paintEntries.forEach(entry => {
        if (entry.name === 'first-paint') {
          metrics.firstPaint = entry.startTime;
        } else if (entry.name === 'first-contentful-paint') {
          metrics.firstContentfulPaint = entry.startTime;
        }
      });

      console.log('Performance Metrics:', metrics);
    }
  }

  /**
   * Prefetch next pages for faster navigation
   */
  prefetchPage(url: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  }

  /**
   * Critical CSS injection for above-the-fold content
   */
  injectCriticalCSS(css: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }
}
