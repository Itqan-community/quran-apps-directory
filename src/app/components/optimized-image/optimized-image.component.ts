import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-optimized-image',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="image-container" [style.aspect-ratio]="aspectRatio">
      <!-- Loading placeholder for LCP optimization -->
      <div 
        *ngIf="showPlaceholder" 
        class="image-placeholder"
        [style.background-color]="placeholderColor">
      </div>
      
      <picture 
        class="image-picture"
        [class.image-loaded]="!showPlaceholder">
        <!-- AVIF source (best compression, ~50% smaller than JPEG) -->
        <source 
          *ngIf="shouldUseAvif"
          [srcset]="avifSrc" 
          type="image/avif">
        
        <!-- WebP source (fallback, ~25% smaller than JPEG) -->
        <source 
          *ngIf="shouldUseWebp"
          [srcset]="webpSrc" 
          type="image/webp">
        
        <!-- Original format fallback (for older browsers) -->
        <img 
          [src]="originalSrc"
          [alt]="alt"
          [loading]="loading"
          [attr.fetchpriority]="fetchpriority"
          [width]="width"
          [height]="height"
          [class]="cssClass"
          [style]="cssStyle"
          (load)="onImageLoad()"
          (error)="onImageError()"
          decoding="async">
      </picture>
    </div>
  `,
  styles: [`
    .image-container {
      position: relative;
      display: block;
      width: 100%;
      overflow: hidden;
    }
    
    .image-placeholder {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1;
      transition: opacity 0.3s ease;
    }
    
    .image-picture {
      position: relative;
      display: block;
      width: 100%;
      height: 100%;
      z-index: 2;
    }
    
    .image-picture img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: opacity 0.3s ease;
    }
    
    .image-loaded .image-placeholder {
      opacity: 0;
      pointer-events: none;
    }
  `]
})
export class OptimizedImageComponent {
  @Input() src!: string | null;
  @Input() alt: string = '';
  @Input() loading: 'lazy' | 'eager' = 'lazy';
  @Input() fetchpriority: 'high' | 'low' | 'auto' = 'auto';
  @Input() width?: string;
  @Input() height?: string;
  @Input() cssClass?: string;
  @Input() cssStyle?: string;
  @Input() aspectRatio: string = '16/9'; // Default aspect ratio for cover images
  @Input() placeholderColor: string = '#f5f5f5';
  
  showPlaceholder = true;

  get originalSrc(): string {
    return this.src || '';
  }

  get webpSrc(): string {
    if (!this.src) return '';
    const baseName = this.src.substring(0, this.src.lastIndexOf('.')) || this.src;
    return `${baseName}.webp`;
  }

  get avifSrc(): string {
    if (!this.src) return '';
    const baseName = this.src.substring(0, this.src.lastIndexOf('.')) || this.src;
    return `${baseName}.avif`;
  }

  get shouldUseAvif(): boolean {
    if (!this.src) return false;
    // Only use AVIF for local assets, not CDN images (until CDN transformation is set up)
    return this.src.startsWith('/assets/') || this.src.startsWith('assets/');
  }

  get shouldUseWebp(): boolean {
    if (!this.src) return false;
    // Only use WebP for local assets, not CDN images (until CDN transformation is set up)
    return this.src.startsWith('/assets/') || this.src.startsWith('assets/');
  }

  onImageLoad(): void {
    this.showPlaceholder = false;
  }

  onImageError(): void {
    this.showPlaceholder = false;
    console.warn(`Failed to load image: ${this.src}`);
  }
}
