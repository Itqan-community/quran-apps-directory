import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ImageOptimizationService {
  
  /**
   * Generates optimized image URLs for next-gen formats
   */
  getOptimizedImageSources(originalUrl: string): {
    avif: string;
    webp: string;
    original: string;
  } {
    // For local assets, replace extension
    if (originalUrl.startsWith('/assets/') || originalUrl.startsWith('assets/')) {
      const baseName = originalUrl.substring(0, originalUrl.lastIndexOf('.')) || originalUrl;
      return {
        avif: `${baseName}.avif`,
        webp: `${baseName}.webp`,
        original: originalUrl
      };
    }

    // For R2 CDN images, check if Image Resizing is available
    if (originalUrl.includes('pub-e11717db663c469fb51c65995892b449.r2.dev')) {
      // R2 doesn't have automatic image transformation
      // Return original URL for all formats until CDN transformation is set up
      return {
        avif: originalUrl,
        webp: originalUrl,
        original: originalUrl
      };
    }

    // For other external images, return as-is (no optimization available)
    return {
      avif: originalUrl,
      webp: originalUrl,
      original: originalUrl
    };
  }

  /**
   * Generates responsive sizes attribute for different screen sizes
   */
  getResponsiveSizes(type: 'banner' | 'logo' | 'thumbnail' | 'screenshot' | 'icon'): string {
    switch (type) {
      case 'banner':
        return '(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 1200px';
      case 'logo':
        return '(max-width: 768px) 120px, 200px';
      case 'thumbnail':
        return '(max-width: 768px) 150px, 300px';
      case 'screenshot':
        return '(max-width: 768px) 280px, 400px';
      case 'icon':
        return '(max-width: 768px) 40px, 60px';
      default:
        return '100vw';
    }
  }

  /**
   * Determines if an image should be loaded with high priority
   */
  shouldUseHighPriority(imageUrl: string, context: 'hero' | 'above-fold' | 'below-fold'): boolean {
    if (context === 'hero' || context === 'above-fold') {
      return true;
    }
    
    // High priority for critical images
    if (imageUrl.includes('banner') || imageUrl.includes('logo-with-text')) {
      return true;
    }
    
    return false;
  }

  /**
   * Generates preload link elements for critical images
   */
  generatePreloadLinks(imageUrl: string, type: 'banner' | 'logo' | 'thumbnail'): string[] {
    const sources = this.getOptimizedImageSources(imageUrl);
    const links = [];

    // Only preload critical above-the-fold images
    if (this.shouldUseHighPriority(imageUrl, 'hero')) {
      links.push(`<link rel="preload" href="${sources.avif}" as="image" type="image/avif" fetchpriority="high">`);
      links.push(`<link rel="preload" href="${sources.webp}" as="image" type="image/webp" fetchpriority="high">`);
      links.push(`<link rel="preload" href="${sources.original}" as="image" fetchpriority="high">`);
    }

    return links;
  }
}
