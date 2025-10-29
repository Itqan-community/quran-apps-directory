import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, fromEvent, merge } from 'rxjs';
import { map, tap, filter, startWith } from 'rxjs/operators';
import { CacheStorageService } from './cache-storage.service';
import { BrowserStorageService } from './browser-storage.service';

export interface CacheMetrics {
  timestamp: number;
  memoryCacheSize: number;
  localStorageSize: number;
  httpCacheSize: number;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  averageResponseTime: number;
  totalCacheSize: number;
  lcp: number; // Largest Contentful Paint
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
  cls: number; // Cumulative Layout Shift
  fid: number; // First Input Delay
}

export interface NetworkPerformance {
  type: string;
  transferSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
  duration: number;
  startTime: number;
  responseStart: number;
  responseEnd: number;
  cached: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CacheMonitorService {
  private metrics$ = new BehaviorSubject<CacheMetrics>({
    timestamp: Date.now(),
    memoryCacheSize: 0,
    localStorageSize: 0,
    httpCacheSize: 0,
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cacheHitRate: 0,
    averageResponseTime: 0,
    totalCacheSize: 0,
    lcp: 0,
    fcp: 0,
    ttfb: 0,
    cls: 0,
    fid: 0
  });

  private networkEntries$ = new BehaviorSubject<NetworkPerformance[]>([]);
  private requestCount = 0;
  private cacheHitCount = 0;
  private cacheMissCount = 0;
  private responseTimes: number[] = [];

  constructor(
    private cacheStorage: CacheStorageService,
    private browserStorage: BrowserStorageService
  ) {
    this.initializeMonitoring();
  }

  /**
   * Initialize performance monitoring
   */
  private initializeMonitoring(): void {
    // Monitor Network Performance API
    this.monitorNetworkPerformance();

    // Monitor Web Vitals
    this.monitorWebVitals();

    // Update metrics periodically
    setInterval(() => this.updateMetrics(), 5000); // Every 5 seconds

    // Listen for cache storage events
    this.monitorCacheChanges();
  }

  /**
   * Monitor network performance using Navigation Timing API
   */
  private monitorNetworkPerformance(): void {
    if ('performance' in window && 'getEntriesByType' in performance) {
      // Monitor existing entries
      this.processPerformanceEntries();

      // Monitor new entries
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformanceResourceTiming[];
        this.processEntries(entries);
      });

      try {
        observer.observe({ entryTypes: ['navigation', 'resource'] });
      } catch (error) {
        console.warn('[CacheMonitor] Performance Observer not supported:', error);
      }

      // Fallback for browsers without PerformanceObserver
      setInterval(() => this.processPerformanceEntries(), 2000);
    }
  }

  /**
   * Process performance entries
   */
  private processPerformanceEntries(): void {
    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    this.processEntries(entries);
  }

  /**
   * Process performance entries for caching metrics
   */
  private processEntries(entries: PerformanceResourceTiming[]): void {
    const networkEntries: NetworkPerformance[] = [];

    entries.forEach(entry => {
      const isCached = this.isRequestCached(entry);
      const duration = entry.responseEnd - entry.startTime;

      this.requestCount++;
      if (isCached) {
        this.cacheHitCount++;
      } else {
        this.cacheMissCount++;
      }

      this.responseTimes.push(duration);

      const networkEntry: NetworkPerformance = {
        type: this.getResourceType(entry.name),
        transferSize: entry.transferSize,
        encodedBodySize: entry.encodedBodySize,
        decodedBodySize: entry.decodedBodySize,
        duration,
        startTime: entry.startTime,
        responseStart: entry.responseStart,
        responseEnd: entry.responseEnd,
        cached: isCached
      };

      networkEntries.push(networkEntry);
    });

    if (networkEntries.length > 0) {
      this.networkEntries$.next(networkEntries);
    }
  }

  /**
   * Check if request was served from cache
   */
  private isRequestCached(entry: PerformanceResourceTiming): boolean {
    // Check transfer size - cached resources often have 0 transfer size
    if (entry.transferSize === 0 && entry.decodedBodySize > 0) {
      return true;
    }

    // Check if response was very fast (< 10ms), likely from cache
    const duration = entry.responseEnd - entry.responseStart;
    if (duration < 10) {
      return true;
    }

    // Check specific resource types
    if (entry.name.includes('/assets/') && entry.transferSize < 1000) {
      return true;
    }

    return false;
  }

  /**
   * Get resource type from URL
   */
  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.jpeg') ||
        url.includes('.webp') || url.includes('.avif')) return 'image';
    if (url.includes('.woff') || url.includes('.ttf') || url.includes('.otf')) return 'font';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  /**
   * Monitor Web Vitals
   */
  private monitorWebVitals(): void {
    // Largest Contentful Paint (LCP)
    this.observeWebVital('largest-contentful-paint', (entries) => {
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        this.metrics$.next({
          ...this.metrics$.value,
          lcp: lastEntry.startTime
        });
      }
    });

    // First Contentful Paint (FCP)
    if (performance.getEntriesByType) {
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        this.metrics$.next({
          ...this.metrics$.value,
          fcp: fcpEntry.startTime
        });
      }
    }

    // Cumulative Layout Shift (CLS)
    this.observeWebVital('layout-shift', (entries) => {
      let clsValue = 0;
      entries.forEach(entry => {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      });
      this.metrics$.next({
        ...this.metrics$.value,
        cls: clsValue
      });
    });

    // First Input Delay (FID)
    this.observeWebVital('first-input', (entries) => {
      const firstEntry = entries[0];
      if (firstEntry) {
        this.metrics$.next({
          ...this.metrics$.value,
          fid: (firstEntry as any).processingStart - firstEntry.startTime
        });
      }
    });

    // Time to First Byte (TTFB)
    if (performance.timing) {
      const ttfb = performance.timing.responseStart - performance.timing.navigationStart;
      this.metrics$.next({
        ...this.metrics$.value,
        ttfb
      });
    }
  }

  /**
   * Observe Web Vitals using PerformanceObserver
   */
  private observeWebVital(type: string, callback: (entries: any[]) => void): void {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      observer.observe({ type, buffered: true });
    } catch (error) {
      console.warn(`[CacheMonitor] Web Vital ${type} not supported:`, error);
    }
  }

  /**
   * Monitor cache changes
   */
  private monitorCacheChanges(): void {
    // Listen for storage events
    if (typeof window !== 'undefined') {
      fromEvent<StorageEvent>(window, 'storage').pipe(
        filter(event => Boolean(event.key && event.key.startsWith('quran_apps_')))
      ).subscribe(() => {
        this.updateMetrics();
      });
    }
  }

  /**
   * Update cache metrics
   */
  private updateMetrics(): void {
    const cacheStats = this.cacheStorage.getStats();
    const storageStats = this.browserStorage.getStorageStats();
    const currentMetrics = this.metrics$.value;

    const avgResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;

    const cacheHitRate = this.requestCount > 0
      ? (this.cacheHitCount / this.requestCount) * 100
      : 0;

    this.metrics$.next({
      timestamp: Date.now(),
      memoryCacheSize: cacheStats.totalEntries,
      localStorageSize: storageStats.memoryCacheSize,
      httpCacheSize: storageStats.localStorageSize,
      totalRequests: this.requestCount,
      cacheHits: this.cacheHitCount,
      cacheMisses: this.cacheMissCount,
      cacheHitRate,
      averageResponseTime: avgResponseTime,
      totalCacheSize: storageStats.totalSize,
      lcp: currentMetrics.lcp,
      fcp: currentMetrics.fcp,
      ttfb: currentMetrics.ttfb,
      cls: currentMetrics.cls,
      fid: currentMetrics.fid
    });
  }

  /**
   * Get current cache metrics
   */
  getMetrics(): Observable<CacheMetrics> {
    return this.metrics$.asObservable();
  }

  /**
   * Get network performance data
   */
  getNetworkPerformance(): Observable<NetworkPerformance[]> {
    return this.networkEntries$.asObservable();
  }

  /**
   * Get cache performance summary
   */
  getCachePerformanceSummary(): {
    cacheHitRate: number;
    totalRequests: number;
    cachedRequests: number;
    uncachedRequests: number;
    averageResponseTime: number;
    totalCacheSize: string;
    lcpRating: 'good' | 'needs-improvement' | 'poor';
    fcpRating: 'good' | 'needs-improvement' | 'poor';
    clsRating: 'good' | 'needs-improvement' | 'poor';
    fidRating: 'good' | 'needs-improvement' | 'poor';
  } {
    const metrics = this.metrics$.value;

    return {
      cacheHitRate: metrics.cacheHitRate,
      totalRequests: metrics.totalRequests,
      cachedRequests: metrics.cacheHits,
      uncachedRequests: metrics.cacheMisses,
      averageResponseTime: metrics.averageResponseTime,
      totalCacheSize: this.formatBytes(metrics.totalCacheSize),
      lcpRating: this.getLCPRating(metrics.lcp),
      fcpRating: this.getFCPRating(metrics.fcp),
      clsRating: this.getCLSRating(metrics.cls),
      fidRating: this.getFIDRating(metrics.fid)
    };
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get LCP rating
   */
  private getLCPRating(lcp: number): 'good' | 'needs-improvement' | 'poor' {
    if (lcp <= 2500) return 'good';
    if (lcp <= 4000) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Get FCP rating
   */
  private getFCPRating(fcp: number): 'good' | 'needs-improvement' | 'poor' {
    if (fcp <= 1800) return 'good';
    if (fcp <= 3000) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Get CLS rating
   */
  private getCLSRating(cls: number): 'good' | 'needs-improvement' | 'poor' {
    if (cls <= 0.1) return 'good';
    if (cls <= 0.25) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Get FID rating
   */
  private getFIDRating(fid: number): 'good' | 'needs-improvement' | 'poor' {
    if (fid <= 100) return 'good';
    if (fid <= 300) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.requestCount = 0;
    this.cacheHitCount = 0;
    this.cacheMissCount = 0;
    this.responseTimes = [];
    this.networkEntries$.next([]);

    this.metrics$.next({
      timestamp: Date.now(),
      memoryCacheSize: 0,
      localStorageSize: 0,
      httpCacheSize: 0,
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      cacheHitRate: 0,
      averageResponseTime: 0,
      totalCacheSize: 0,
      lcp: 0,
      fcp: 0,
      ttfb: 0,
      cls: 0,
      fid: 0
    });
  }
}