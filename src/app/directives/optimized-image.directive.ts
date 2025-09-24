import { Directive, ElementRef, Input, OnInit, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appOptimizedImage]',
  standalone: true
})
export class OptimizedImageDirective implements OnInit {
  @Input() appOptimizedImage!: string; // Base image path without extension
  @Input() alt: string = '';
  @Input() loading: 'lazy' | 'eager' = 'lazy';
  @Input() fetchpriority: 'high' | 'low' | 'auto' = 'auto';
  @Input() sizes: string = '100vw';
  @Input() width?: string;
  @Input() height?: string;

  constructor(
    private el: ElementRef<HTMLElement>,
    private renderer: Renderer2
  ) {}

  ngOnInit() {
    const baseUrl = this.appOptimizedImage;
    const baseName = baseUrl.substring(0, baseUrl.lastIndexOf('.')) || baseUrl;
    const extension = baseUrl.substring(baseUrl.lastIndexOf('.')) || '.png';

    // Create picture element
    const picture = this.renderer.createElement('picture');
    
    // AVIF source (best compression)
    const avifSource = this.renderer.createElement('source');
    this.renderer.setAttribute(avifSource, 'srcset', `${baseName}.avif`);
    this.renderer.setAttribute(avifSource, 'type', 'image/avif');
    this.renderer.appendChild(picture, avifSource);

    // WebP source (fallback)
    const webpSource = this.renderer.createElement('source');
    this.renderer.setAttribute(webpSource, 'srcset', `${baseName}.webp`);
    this.renderer.setAttribute(webpSource, 'type', 'image/webp');
    this.renderer.appendChild(picture, webpSource);

    // Original format fallback
    const img = this.renderer.createElement('img');
    this.renderer.setAttribute(img, 'src', baseUrl);
    this.renderer.setAttribute(img, 'alt', this.alt);
    this.renderer.setAttribute(img, 'loading', this.loading);
    this.renderer.setAttribute(img, 'decoding', 'async');
    
    if (this.fetchpriority !== 'auto') {
      this.renderer.setAttribute(img, 'fetchpriority', this.fetchpriority);
    }
    
    if (this.width) {
      this.renderer.setAttribute(img, 'width', this.width);
    }
    
    if (this.height) {
      this.renderer.setAttribute(img, 'height', this.height);
    }

    // Copy any existing classes from the original element
    const originalElement = this.el.nativeElement;
    const classes = originalElement.className;
    if (classes) {
      this.renderer.setAttribute(img, 'class', classes);
    }

    // Copy any existing styles
    const styles = originalElement.getAttribute('style');
    if (styles) {
      this.renderer.setAttribute(img, 'style', styles);
    }

    this.renderer.appendChild(picture, img);

    // Replace the original element with the picture element
    const parent = this.renderer.parentNode(originalElement);
    this.renderer.insertBefore(parent, picture, originalElement);
    this.renderer.removeChild(parent, originalElement);
  }
}
