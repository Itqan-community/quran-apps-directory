import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface CacheValidationResult {
  url: string;
  transferSize: number;
  cacheControl: string | null;
  maxAge: number | null;
  isImmutable: boolean;
  potentialSavings: number;
  recommendation: string;
}

@Injectable({
  providedIn: 'root'
})
export class CacheValidatorService {

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  /**
   * Validate cache policies for all loaded resources
   */
  async validateAllResources(): Promise<CacheValidationResult[]> {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const results: CacheValidationResult[] = [];

    for (const resource of resources) {
      if (resource.transferSize > 1000) { // Only check resources > 1KB
        try {
          const validation = await this.validateResource(resource);
          if (validation.potentialSavings > 0) {
            results.push(validation);
          }
        } catch (error) {
          console.warn(`Failed to validate cache for ${resource.name}:`, error);
        }
      }
    }

    return results.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }

  /**
   * Validate cache policy for a specific resource
   */
  private async validateResource(resource: PerformanceResourceTiming): Promise<CacheValidationResult> {
    const response = await fetch(resource.name, { method: 'HEAD' }).catch(() => null);
    const cacheControl = response?.headers.get('cache-control') || null;
    
    const result: CacheValidationResult = {
      url: resource.name,
      transferSize: resource.transferSize,
      cacheControl,
      maxAge: this.extractMaxAge(cacheControl),
      isImmutable: cacheControl?.includes('immutable') || false,
      potentialSavings: 0,
      recommendation: ''
    };

    // Calculate potential savings and recommendations
    this.calculatePotentialSavings(result, resource);
    
    return result;
  }

  /**
   * Extract max-age value from cache-control header
   */
  private extractMaxAge(cacheControl: string | null): number | null {
    if (!cacheControl) return null;
    
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
    return maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : null;
  }

  /**
   * Calculate potential savings based on resource type and current cache policy
   */
  private calculatePotentialSavings(result: CacheValidationResult, resource: PerformanceResourceTiming): void {
    const url = result.url;
    const transferSize = result.transferSize;
    const maxAge = result.maxAge;
    const isStatic = this.isStaticAsset(url);
    const isThirdParty = !url.startsWith(window.location.origin);

    // No cache control header
    if (!result.cacheControl) {
      result.potentialSavings = transferSize;
      result.recommendation = isStatic 
        ? 'Add Cache-Control: public, max-age=31536000, immutable for static assets'
        : 'Add appropriate cache headers';
      return;
    }

    // Cache control present but inadequate
    if (isStatic && maxAge !== null) {
      const oneYear = 31536000; // 1 year in seconds
      
      if (maxAge < oneYear) {
        // Calculate savings based on how much shorter the cache duration is
        const savingsRatio = Math.min(1, (oneYear - maxAge) / oneYear);
        result.potentialSavings = Math.round(transferSize * savingsRatio);
        
        if (maxAge < 86400) { // Less than 1 day
          result.recommendation = 'Increase cache duration to 1 year for static assets';
        } else if (maxAge < 2592000) { // Less than 1 month
          result.recommendation = 'Consider longer cache duration (1 year) for static assets';
        } else {
          result.recommendation = 'Consider max cache duration (1 year) for static assets';
        }
      }

      // Not marked as immutable
      if (!result.isImmutable && maxAge >= oneYear) {
        result.potentialSavings = Math.round(transferSize * 0.1); // 10% savings from avoiding conditional requests
        result.recommendation = 'Add "immutable" directive for static assets with content hashing';
      }
    }

    // Third-party resources
    if (isThirdParty && transferSize > 10000) { // > 10KB
      result.potentialSavings = Math.round(transferSize * 0.3); // Potential 30% savings
      result.recommendation = 'Consider self-hosting or optimizing third-party resources';
    }

    // Large uncached resources
    if (!maxAge && transferSize > 50000) { // > 50KB
      result.potentialSavings = transferSize;
      result.recommendation = 'Critical: Large uncached resource - implement immediate caching';
    }
  }

  /**
   * Check if URL represents a static asset
   */
  private isStaticAsset(url: string): boolean {
    const staticExtensions = [
      '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif',
      '.woff', '.woff2', '.ttf', '.eot', '.ico', '.pdf', '.mp4', '.mp3', '.wav'
    ];
    
    return staticExtensions.some(ext => url.toLowerCase().includes(ext));
  }

  /**
   * Generate a comprehensive cache validation report
   */
  async generateCacheReport(): Promise<{
    totalPotentialSavings: number;
    issues: CacheValidationResult[];
    summary: string[];
  }> {
    const issues = await this.validateAllResources();
    const totalPotentialSavings = issues.reduce((sum, issue) => sum + issue.potentialSavings, 0);
    
    const summary = [
      `Total potential cache savings: ${Math.round(totalPotentialSavings / 1024)} KB`,
      `Resources with cache issues: ${issues.length}`,
      `Largest issue: ${issues[0]?.url} (${Math.round((issues[0]?.potentialSavings || 0) / 1024)} KB)`
    ];

    return {
      totalPotentialSavings,
      issues,
      summary
    };
  }

  /**
   * Generate a script for browser console testing
   */
  generateValidationScript(): string {
    return `
// Cache Validation Script - Run in browser console
(async function validateCachePolicy() {
  console.log('🔍 Analyzing cache policies for all resources...');
  
  const resources = performance.getEntriesByType('resource');
  const issues = [];
  let totalSavings = 0;
  
  for (const resource of resources) {
    if (resource.transferSize > 1000) {
      try {
        const response = await fetch(resource.name, { method: 'HEAD' });
        const cacheControl = response.headers.get('cache-control');
        const transferSize = resource.transferSize;
        
        // Check for missing or inadequate cache headers
        if (!cacheControl) {
          issues.push({
            url: resource.name,
            issue: 'No cache-control header',
            size: Math.round(transferSize / 1024) + ' KB',
            recommendation: 'Add appropriate cache headers'
          });
          totalSavings += transferSize;
        } else {
          const maxAgeMatch = cacheControl.match(/max-age=(\\d+)/);
          const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1]) : null;
          
          // Check for static assets with short cache duration
          const isStatic = /\\.(js|css|png|jpg|svg|woff|woff2)$/i.test(resource.name);
          if (isStatic && maxAge && maxAge < 31536000) { // Less than 1 year
            const savingsRatio = (31536000 - maxAge) / 31536000;
            const savings = transferSize * savingsRatio;
            
            issues.push({
              url: resource.name,
              issue: \`Short cache duration: \${maxAge}s (should be 1 year)\`,
              size: Math.round(transferSize / 1024) + ' KB',
              potentialSavings: Math.round(savings / 1024) + ' KB',
              recommendation: 'Increase cache duration to 1 year for static assets'
            });
            totalSavings += savings;
          }
        }
      } catch (error) {
        console.warn(\`Failed to check \${resource.name}\`, error);
      }
    }
  }
  
  console.log(\`\\n📊 Cache Validation Results:\`);
  console.log(\`Total potential savings: \${Math.round(totalSavings / 1024)} KB\`);
  console.log(\`Issues found: \${issues.length}\`);
  
  if (issues.length > 0) {
    console.log('\\n🚨 Issues detected:');
    issues.slice(0, 10).forEach((issue, index) => {
      console.log(\`\${index + 1}. \${issue.url}\`);
      console.log(\`   Issue: \${issue.issue}\`);
      console.log(\`   Size: \${issue.size}\`);
      if (issue.potentialSavings) {
        console.log(\`   Potential savings: \${issue.potentialSavings}\`);
      }
      console.log(\`   Recommendation: \${issue.recommendation}\\n\`);
    });
  } else {
    console.log('✅ All resources have appropriate cache policies!');
  }
})();
    `;
  }
}
