import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ApiService, App } from './api.service';

/**
 * Service to preload all application images from Cloudflare R2
 * This ensures faster page loads for app details and category list pages
 */
@Injectable({
  providedIn: 'root'
})
export class AppImagePreloaderService {
  private readonly R2_CDN_URL = 'pub-e11717db663c469fb51c65995892b449.r2.dev';
  private preloadingStarted = false;

  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: Object,
    private apiService: ApiService
  ) {}

  /**
   * Start preloading images in background without blocking app initialization
   */
  startPreloadingInBackground(): void {
    // Only run in browser
    if (!isPlatformBrowser(this.platformId)) return;

    // Only start preloading once
    if (this.preloadingStarted) {
      return;
    }
    this.preloadingStarted = true;

    // Defer preloading to after user interaction
    if (typeof window !== 'undefined' && window.requestIdleCallback) {
      // Use requestIdleCallback if available (Chrome, Edge, Opera)
      window.requestIdleCallback(() => this.preloadAllAppImages(), { timeout: 5000 });
    } else {
      // Fallback: defer with setTimeout
      setTimeout(() => this.preloadAllAppImages(), 3000);
    }
  }

  /**
   * Preload all application images
   */
  private preloadAllAppImages(): void {
    // Get all apps from cache first (faster)
    const cachedApps = this.apiService.getCachedApps();

    if (cachedApps && cachedApps.length > 0) {
      this.preloadImagesFromApps(cachedApps);
    } else {
      // Fetch if not cached
      this.apiService.getApps().subscribe(
        response => {
          if (response.results && response.results.length > 0) {
            this.preloadImagesFromApps(response.results);
          }
        },
        error => {
          console.warn('[ImagePreloader] Failed to fetch apps for preloading:', error);
        }
      );
    }

    // Also preload categories
    const cachedCategories = this.apiService.getCachedCategories();
    if (cachedCategories && cachedCategories.length > 0) {
      this.preloadCategoryImages(cachedCategories);
    }
  }

  /**
   * Preload images from app array
   */
  private preloadImagesFromApps(apps: App[]): void {
    const imageUrls = this.extractImageUrlsFromApps(apps);
    this.preloadImages(imageUrls);
  }

  /**
   * Extract all image URLs from apps
   */
  private extractImageUrlsFromApps(apps: App[]): string[] {
    const urls = new Set<string>();

    apps.forEach(app => {
      // App icon
      if (app.application_icon) {
        urls.add(app.application_icon);
      }

      // Main images
      if (app.main_image_en) {
        urls.add(app.main_image_en);
      }
      if (app.main_image_ar) {
        urls.add(app.main_image_ar);
      }

      // Screenshots
      if (app.screenshots_en && Array.isArray(app.screenshots_en)) {
        app.screenshots_en.forEach(url => urls.add(url));
      }
      if (app.screenshots_ar && Array.isArray(app.screenshots_ar)) {
        app.screenshots_ar.forEach(url => urls.add(url));
      }

      // Developer logo
      if (app.developer?.logo) {
        urls.add(app.developer.logo);
      }
    });

    return Array.from(urls).filter(url => url && url.includes(this.R2_CDN_URL));
  }

  /**
   * Preload category images
   */
  private preloadCategoryImages(categories: any[]): void {
    const urls = new Set<string>();

    categories.forEach(category => {
      // Category icons are SVG, skip preloading
      // They are already embedded in the category object
    });

    // No R2 URLs in categories typically, but keep for future use
  }

  /**
   * Preload images from URLs
   */
  private preloadImages(imageUrls: string[]): void {
    if (!imageUrls || imageUrls.length === 0) {
      return;
    }

    // Batch preload images
    const batchSize = 10; // Preload 10 images concurrently
    let loadedCount = 0;

    for (let i = 0; i < imageUrls.length; i += batchSize) {
      const batch = imageUrls.slice(i, i + batchSize);

      batch.forEach(url => {
        this.preloadImage(url).then(() => {
          loadedCount++;
          if (loadedCount === imageUrls.length) {
            this.markPreloadingComplete();
          }
        }).catch(error => {
          console.warn(`[ImagePreloader] Failed to preload: ${url}`, error);
          loadedCount++;
          if (loadedCount === imageUrls.length) {
            this.markPreloadingComplete();
          }
        });
      });
    }
  }

  /**
   * Preload a single image
   */
  private preloadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        resolve();
      };

      img.onerror = () => {
        reject(new Error(`Failed to load image: ${url}`));
      };

      // Set timeout to prevent hanging
      const timeout = setTimeout(() => {
        reject(new Error(`Image load timeout: ${url}`));
      }, 30000); // 30 second timeout per image

      img.onload = () => {
        clearTimeout(timeout);
        resolve();
      };

      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`Failed to load image: ${url}`));
      };

      // Trigger load
      img.src = url;
    });
  }

  /**
   * Mark preloading as complete
   */
  private markPreloadingComplete(): void {
    console.log('[ImagePreloader] Image preloading completed');
  }

  /**
   * Get preload progress (for debugging)
   */
  getPreloadStatus(): Promise<any> {
    return Promise.resolve({ status: 'running' });
  }

  /**
   * Clear preload cache (for testing/debugging)
   */
  clearPreloadCache(): Promise<void> {
    return Promise.resolve();
  }
}
