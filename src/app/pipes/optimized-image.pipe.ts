import { Pipe, PipeTransform } from '@angular/core';
import { ImageOptimizationService } from '../services/image-optimization.service';

@Pipe({
  name: 'optimizedImage',
  standalone: true
})
export class OptimizedImagePipe implements PipeTransform {
  
  constructor(private imageOptimization: ImageOptimizationService) {}

  transform(
    imageUrl: string, 
    format: 'avif' | 'webp' | 'original' = 'webp'
  ): string {
    if (!imageUrl) {
      return '';
    }

    const sources = this.imageOptimization.getOptimizedImageSources(imageUrl);
    
    switch (format) {
      case 'avif':
        return sources.avif;
      case 'webp':
        return sources.webp;
      case 'original':
      default:
        return sources.original;
    }
  }
}
