import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class LcpMonitorService {
  
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.initializeLcpMonitoring();
  }

  /**
   * Initialize LCP monitoring to detect lazy-loaded LCP elements
   * Based on guidance from https://web.dev/lcp-lazy-loading/
   */
  private initializeLcpMonitoring(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      // Check if PerformanceObserver is available
      if (typeof PerformanceObserver !== 'undefined') {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const latestEntry = entries[entries.length - 1] as any;

          if (latestEntry?.element) {
            this.checkLcpElement(latestEntry);
          }
        });

        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      }
    } catch (error) {
      console.warn('LCP monitoring not available:', error);
    }
  }

  /**
   * Check if LCP element was lazy loaded and warn if so
   */
  private checkLcpElement(entry: any): void {
    const element = entry.element;
    
    if (element && element.getAttribute) {
      const loadingAttr = element.getAttribute('loading');
      
      if (loadingAttr === 'lazy') {
        console.warn(
          '⚠️ LCP Performance Warning: LCP element was lazy loaded',
          {
            element,
            lcpTime: entry.value,
            recommendation: 'Consider loading this image eagerly for better LCP performance',
            moreInfo: 'https://web.dev/lcp-lazy-loading/'
          }
        );

        // Dispatch custom event for analytics tracking
        this.dispatchLcpWarningEvent(entry);
      } else {
        console.log(
          '✅ LCP element is optimally loaded',
          {
            element,
            lcpTime: entry.value,
            loadingStrategy: loadingAttr || 'eager (default)'
          }
        );
      }
    }
  }

  /**
   * Dispatch custom event for LCP warning analytics
   */
  private dispatchLcpWarningEvent(entry: any): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const event = new CustomEvent('lcp-lazy-warning', {
      detail: {
        lcpTime: entry.value,
        element: entry.element,
        timestamp: Date.now()
      }
    });

    window.dispatchEvent(event);
  }

  /**
   * Get current LCP performance data
   */
  getCurrentLcpData(): Promise<any> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      if (typeof PerformanceObserver !== 'undefined') {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const latestEntry = entries[entries.length - 1];
          observer.disconnect();
          resolve(latestEntry);
        });

        observer.observe({ type: 'largest-contentful-paint', buffered: true });

        // Timeout after 3 seconds
        setTimeout(() => {
          observer.disconnect();
          resolve(null);
        }, 3000);
      } else {
        resolve(null);
      }
    });
  }

  /**
   * Generate performance report for LCP optimization
   */
  async generateLcpReport(): Promise<any> {
    const lcpData = await this.getCurrentLcpData();
    
    if (!lcpData) {
      return { error: 'LCP data not available' };
    }

    return {
      lcpTime: lcpData.value,
      element: lcpData.element,
      isLazyLoaded: lcpData.element?.getAttribute('loading') === 'lazy',
      recommendations: this.getLcpRecommendations(lcpData)
    };
  }

  /**
   * Get LCP optimization recommendations
   */
  private getLcpRecommendations(lcpData: any): string[] {
    const recommendations = [];
    
    if (lcpData.element?.getAttribute('loading') === 'lazy') {
      recommendations.push('Remove lazy loading from LCP element');
      recommendations.push('Add fetchpriority="high" to LCP element');
    }
    
    if (lcpData.value > 2500) {
      recommendations.push('LCP time is above 2.5s - consider image optimization');
      recommendations.push('Consider using next-gen image formats (WebP/AVIF)');
    }
    
    if (lcpData.value > 4000) {
      recommendations.push('LCP time is critically high - review overall page performance');
    }

    return recommendations;
  }
}
