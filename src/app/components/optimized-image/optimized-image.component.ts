import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-optimized-image',
  standalone: true,
  imports: [CommonModule],
  template: `
    <picture>
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
        [width]="computedWidth"
        [height]="computedHeight"
        [class]="cssClass"
        [style]="computedStyle"
        decoding="async">
    </picture>
  `,
  styles: [`
    picture {
      display: contents;
    }
    
    img {
      max-width: 100%;
      height: auto;
      /* Prevent layout shift during load */
      aspect-ratio: attr(width) / attr(height);
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
  @Input() aspectRatio?: string; // e.g., "16/9", "4/3", "1/1"

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

  get computedWidth(): string {
    if (this.width) return this.width;
    // Default dimensions for different image types to prevent CLS
    if (this.cssClass?.includes('app-icon')) return '38';
    if (this.cssClass?.includes('cover-image')) return '300';
    return 'auto';
  }

  get computedHeight(): string {
    if (this.height) return this.height;
    // Default dimensions for different image types to prevent CLS
    if (this.cssClass?.includes('app-icon')) return '38';
    if (this.cssClass?.includes('cover-image')) return '220';
    return 'auto';
  }

  get computedStyle(): string {
    const styles: string[] = [];
    
    // Add existing custom styles if provided
    if (this.cssStyle && this.cssStyle.trim()) {
      let customStyle = this.cssStyle.trim();
      // Ensure the custom style ends with semicolon
      if (!customStyle.endsWith(';')) {
        customStyle += ';';
      }
      styles.push(customStyle);
    }
    
    // Add aspect-ratio if provided
    if (this.aspectRatio && this.aspectRatio.trim()) {
      styles.push(`aspect-ratio: ${this.aspectRatio.trim()};`);
    }
    
    return styles.join(' ');
  }
}
