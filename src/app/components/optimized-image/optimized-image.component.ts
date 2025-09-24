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
        [srcset]="avifSrc" 
        type="image/avif">
      
      <!-- WebP source (fallback, ~25% smaller than JPEG) -->
      <source 
        [srcset]="webpSrc" 
        type="image/webp">
      
      <!-- Original format fallback (for older browsers) -->
      <img 
        [src]="originalSrc"
        [alt]="alt"
        [loading]="loading"
        [fetchpriority]="fetchpriority"
        [width]="width"
        [height]="height"
        [class]="cssClass"
        [style]="cssStyle"
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
    }
  `]
})
export class OptimizedImageComponent {
  @Input() src!: string;
  @Input() alt: string = '';
  @Input() loading: 'lazy' | 'eager' = 'lazy';
  @Input() fetchpriority: 'high' | 'low' | 'auto' = 'auto';
  @Input() width?: string;
  @Input() height?: string;
  @Input() cssClass?: string;
  @Input() cssStyle?: string;

  get originalSrc(): string {
    return this.src;
  }

  get webpSrc(): string {
    const baseName = this.src.substring(0, this.src.lastIndexOf('.')) || this.src;
    return `${baseName}.webp`;
  }

  get avifSrc(): string {
    const baseName = this.src.substring(0, this.src.lastIndexOf('.')) || this.src;
    return `${baseName}.avif`;
  }
}
