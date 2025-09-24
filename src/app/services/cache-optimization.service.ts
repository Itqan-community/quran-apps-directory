import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface CacheReport {
  resourceUrl: string;
  cacheStatus: 'hit' | 'miss' | 'unknown';
  cacheControl?: string;
  age?: number;
  transferSize?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CacheOptimizationService {

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  /**
   * Analyze current cache performance using Navigation Timing API
   */
  analyzeCachePerformance(): Promise<CacheReport[]> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve([]);
    }

    return new Promise((resolve) => {
      try {
        // Use Navigation Timing API and Resource Timing API
        const navigationEntries = performance.getEntriesByType('navigation');
        const resourceEntries = performance.getEntriesByType('resource');
        
        const reports: CacheReport[] = [];
        
        // Analyze resource entries for cache performance
        resourceEntries.forEach((entry: any) => {
          const report: CacheReport = {
            resourceUrl: entry.name,
            cacheStatus: this.determineCacheStatus(entry),
            transferSize: entry.transferSize
          };
          
          reports.push(report);
        });

        resolve(reports);
      } catch (error) {
        console.warn('Cache analysis failed:', error);
        resolve([]);
      }
    });
  }

  /**
   * Determine cache status based on resource timing
   */
  private determineCacheStatus(entry: any): 'hit' | 'miss' | 'unknown' {
    // If transferSize is 0 and the resource is not a redirect, it's likely cached
    if (entry.transferSize === 0 && entry.decodedBodySize > 0) {
      return 'hit';
    }
    
    // If transferSize is much smaller than decodedBodySize, it might be cached
    if (entry.transferSize > 0 && entry.decodedBodySize > 0) {
      const compressionRatio = entry.transferSize / entry.decodedBodySize;
      if (compressionRatio < 0.1) {
        return 'hit'; // Likely a 304 Not Modified response
      }
    }
    
    // If duration is very small, it might be from cache
    if (entry.duration < 50 && entry.transferSize === 0) {
      return 'hit';
    }
    
    return entry.transferSize > 0 ? 'miss' : 'unknown';
  }

  /**
   * Generate cache optimization recommendations
   */
  async generateCacheRecommendations(): Promise<string[]> {
    const reports = await this.analyzeCachePerformance();
    const recommendations: string[] = [];
    
    // Analyze uncached static assets
    const uncachedAssets = reports.filter(report => 
      report.cacheStatus === 'miss' && 
      this.isStaticAsset(report.resourceUrl)
    );
    
    if (uncachedAssets.length > 0) {
      recommendations.push(
        `Found ${uncachedAssets.length} uncached static assets. Consider implementing proper cache headers.`
      );
    }
    
    // Check for assets that could benefit from longer cache times
    const shortCachedAssets = reports.filter(report =>
      this.isStaticAsset(report.resourceUrl) && 
      report.transferSize && report.transferSize > 10000 // > 10KB
    );
    
    if (shortCachedAssets.length > 0) {
      recommendations.push(
        'Large static assets detected. Ensure they have long cache durations (1 year for immutable assets).'
      );
    }
    
    return recommendations;
  }

  /**
   * Check if URL represents a static asset that should be cached
   */
  private isStaticAsset(url: string): boolean {
    const staticExtensions = [
      '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif',
      '.woff', '.woff2', '.ttf', '.eot', '.ico', '.pdf'
    ];
    
    return staticExtensions.some(ext => url.toLowerCase().includes(ext));
  }

  /**
   * Implement preemptive cache warming for critical resources
   */
  preloadCriticalResources(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const criticalResources = [
      '/assets/images/logo-with-text.svg',
      '/assets/images/banner.avif',
      '/assets/images/banner.webp',
      '/assets/images/banner.png'
    ];

    criticalResources.forEach(resource => {
      // Use link preload for critical resources
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = this.getResourceType(resource);
      link.href = resource;
      
      // Add crossorigin for cross-origin resources
      if (resource.includes('http')) {
        link.crossOrigin = 'anonymous';
      }
      
      document.head.appendChild(link);
    });
  }

  /**
   * Get appropriate 'as' attribute for preload links
   */
  private getResourceType(url: string): string {
    if (url.includes('.css')) return 'style';
    if (url.includes('.js')) return 'script';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp|avif)$/i)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|eot)$/i)) return 'font';
    return 'fetch';
  }

  /**
   * Monitor cache hit ratio and report performance
   */
  monitorCachePerformance(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Monitor resource loading and cache performance
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry: any) => {
        if (this.isStaticAsset(entry.name)) {
          const cacheStatus = this.determineCacheStatus(entry);
          
          // Log cache misses for static assets (for debugging)
          if (cacheStatus === 'miss' && entry.transferSize > 0) {
            console.log(`🔄 Cache miss for static asset: ${entry.name} (${entry.transferSize} bytes)`);
          }
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.warn('Performance monitoring not available:', error);
    }
  }

  /**
   * Generate cache policy validation script for testing
   */
  generateCacheValidationScript(): string {
    return `
// Cache Policy Validation Script
// Based on web.dev recommendations: https://web.dev/uses-long-cache-ttl/

async function validateCachePolicy() {
  const resources = performance.getEntriesByType('resource');
  const issues = [];
  
  resources.forEach(resource => {
    const url = resource.name;
    const isStatic = /\\.(js|css|png|jpg|jpeg|gif|svg|webp|avif|woff|woff2|ttf|eot|ico)$/i.test(url);
    
    if (isStatic && resource.transferSize > 0) {
      // Check if resource should be cached but wasn't
      fetch(url, { method: 'HEAD' })
        .then(response => {
          const cacheControl = response.headers.get('cache-control');
          
          if (!cacheControl || !cacheControl.includes('max-age')) {
            issues.push({
              url: url,
              issue: 'Missing or inadequate cache-control header',
              recommendation: 'Add Cache-Control: public, max-age=31536000, immutable for static assets'
            });
          }
        })
        .catch(err => console.warn('Failed to check cache headers:', err));
    }
  });
  
  setTimeout(() => {
    if (issues.length > 0) {
      console.warn('🚨 Cache Policy Issues Found:', issues);
    } else {
      console.log('✅ Cache policy validation passed');
    }
  }, 2000);
}

validateCachePolicy();
    `;
  }
}
