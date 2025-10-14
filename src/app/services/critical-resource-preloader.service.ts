import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class CriticalResourcePreloaderService {

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  /**
   * Preload critical above-the-fold images for LCP optimization
   */
  preloadCriticalImages(language: 'ar' | 'en'): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Critical first 3 app cover images for LCP optimization
    const criticalImages = [
      // Wahy app (first in list)
      `https://pub-e11717db663c469fb51c65995892b449.r2.dev/1_Wahy/cover_photo_${language}.png`,
      // Ayah app (second in list)  
      `https://pub-e11717db663c469fb51c65995892b449.r2.dev/15_Ayah/cover_photo_${language}.png`,
      // Quran Mobasher app (third in list)
      `https://pub-e11717db663c469fb51c65995892b449.r2.dev/14_Quran Mobasher/cover_photo_${language}.png`
    ];

    criticalImages.forEach((imageUrl, index) => {
      this.preloadImage(imageUrl, index === 0 ? 'high' : 'low');
    });

    console.log(`🚀 Preloaded ${criticalImages.length} critical images for LCP optimization`);
  }

  /**
   * Preload individual image with specified priority
   */
  private preloadImage(url: string, fetchPriority: 'high' | 'low' = 'low'): void {
    // Check if already preloaded
    const existingLink = document.querySelector(`link[href="${url}"]`);
    if (existingLink) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    link.setAttribute('fetchpriority', fetchPriority);
    
    // Add crossorigin for CDN images
    if (url.includes('pub-e11717db663c469fb51c65995892b449.r2.dev')) {
      link.crossOrigin = 'anonymous';
    }

    document.head.appendChild(link);
  }

  /**
   * Preload critical fonts for web font optimization
   */
  preloadCriticalFonts(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Preload critical Rubik font weights
    const criticalFonts = [
      'https://fonts.gstatic.com/s/rubik/v31/iJWEBXyIfDnIV7nEnXu61F3f.woff2', // Regular 400
      'https://fonts.gstatic.com/s/rubik/v31/iJWEBXyIfDnIV7nEnXu61F3f.woff2', // Medium 500
    ];

    criticalFonts.forEach(fontUrl => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.type = 'font/woff2';
      link.href = fontUrl;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });

    console.log('🔤 Preloaded critical fonts');
  }

  /**
   * Optimize resource loading based on connection speed
   */
  adaptivePreloading(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Check for Network Information API support
    const navigator = window.navigator as any;
    if ('connection' in navigator) {
      const connection = navigator.connection;
      
      // Reduce preloading on slow connections
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        console.log('📱 Slow connection detected - reducing preloading');
        return;
      }
      
      // Save data mode - minimal preloading
      if (connection.saveData) {
        console.log('💾 Data saver mode detected - minimal preloading');
        return;
      }
    }

    // Proceed with normal preloading for fast connections
    return;
  }

  /**
   * Monitor and report preload effectiveness
   */
  monitorPreloadEffectiveness(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    setTimeout(() => {
      // Check which preloaded resources were actually used
      const preloadLinks = document.querySelectorAll('link[rel="preload"]');
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      let preloadedResourcesUsed = 0;
      
      preloadLinks.forEach(link => {
        const href = (link as HTMLLinkElement).href;
        const wasUsed = resources.some(resource => resource.name === href);
        
        if (wasUsed) {
          preloadedResourcesUsed++;
        } else {
          console.warn(`Preloaded resource not used: ${href}`);
        }
      });

      const effectiveness = preloadLinks.length > 0 ? 
        (preloadedResourcesUsed / preloadLinks.length) * 100 : 0;
      
      console.log(`📊 Preload effectiveness: ${effectiveness.toFixed(1)}% (${preloadedResourcesUsed}/${preloadLinks.length} resources used)`);
    }, 5000);
  }

  /**
   * Comprehensive LCP optimization strategy
   */
  optimizeForLCP(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // 1. Check adaptive loading first
    this.adaptivePreloading();

    // 2. Preload critical fonts immediately
    this.preloadCriticalFonts();

    // 3. Preload critical images after DOM content is loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        // Detect language from HTML or default to Arabic
        const htmlLang = document.documentElement.lang || 'ar';
        const language = htmlLang.startsWith('ar') ? 'ar' : 'en';
        
        setTimeout(() => this.preloadCriticalImages(language), 100);
      });
    } else {
      // DOM already loaded
      const htmlLang = document.documentElement.lang || 'ar';
      const language = htmlLang.startsWith('ar') ? 'ar' : 'en';
      this.preloadCriticalImages(language);
    }

    // 4. Monitor effectiveness
    this.monitorPreloadEffectiveness();

    console.log('🎯 LCP optimization strategy activated');
  }
}
