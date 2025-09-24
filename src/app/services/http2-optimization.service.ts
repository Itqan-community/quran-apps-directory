import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface HTTP2AnalysisResult {
  protocol: string;
  isHTTP2: boolean;
  multiplexingBenefit: number;
  resourceCount: number;
  totalSize: number;
  recommendations: string[];
}

@Injectable({
  providedIn: 'root'
})
export class Http2OptimizationService {

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  /**
   * Analyze HTTP/2 usage and benefits
   */
  analyzeHTTP2Usage(): HTTP2AnalysisResult {
    if (!isPlatformBrowser(this.platformId)) {
      return this.getDefaultResult();
    }

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const http2Resources = resources.filter(resource => 
      resource.nextHopProtocol === 'h2' || resource.nextHopProtocol === 'http/2'
    );
    
    const totalResources = resources.length;
    const http2Count = http2Resources.length;
    const http2Percentage = totalResources > 0 ? (http2Count / totalResources) * 100 : 0;
    
    const totalSize = resources.reduce((sum, resource) => sum + (resource.transferSize || 0), 0);
    const multiplexingBenefit = this.calculateMultiplexingBenefit(resources);
    
    const recommendations = this.generateHTTP2Recommendations(
      http2Percentage,
      resources,
      multiplexingBenefit
    );

    return {
      protocol: http2Count > 0 ? 'HTTP/2' : 'HTTP/1.1',
      isHTTP2: http2Count > 0,
      multiplexingBenefit,
      resourceCount: totalResources,
      totalSize,
      recommendations
    };
  }

  /**
   * Calculate potential multiplexing benefits
   */
  private calculateMultiplexingBenefit(resources: PerformanceResourceTiming[]): number {
    // Group resources by domain
    const domainGroups = new Map<string, PerformanceResourceTiming[]>();
    
    resources.forEach(resource => {
      try {
        const url = new URL(resource.name);
        const domain = url.hostname;
        
        if (!domainGroups.has(domain)) {
          domainGroups.set(domain, []);
        }
        domainGroups.get(domain)!.push(resource);
      } catch (error) {
        // Skip invalid URLs
      }
    });

    let multiplexingBenefit = 0;
    
    // Calculate potential time savings from multiplexing
    domainGroups.forEach((domainResources, domain) => {
      if (domainResources.length > 1) {
        // HTTP/1.1 would require sequential requests or limited connections
        // HTTP/2 allows unlimited multiplexing
        const http1EstimatedTime = domainResources.reduce((sum, resource) => 
          sum + (resource.duration || 0), 0
        );
        
        const http2EstimatedTime = Math.max(
          ...domainResources.map(resource => resource.duration || 0)
        );
        
        const timeSaving = http1EstimatedTime - http2EstimatedTime;
        multiplexingBenefit += Math.max(0, timeSaving);
      }
    });

    return multiplexingBenefit;
  }

  /**
   * Generate HTTP/2 optimization recommendations
   */
  private generateHTTP2Recommendations(
    http2Percentage: number,
    resources: PerformanceResourceTiming[],
    multiplexingBenefit: number
  ): string[] {
    const recommendations: string[] = [];

    // Check HTTP/2 adoption
    if (http2Percentage < 80) {
      recommendations.push(
        `Only ${http2Percentage.toFixed(1)}% of resources use HTTP/2. Consider migrating to HTTP/2-compatible hosting.`
      );
    }

    // Check for domain sharding (anti-pattern in HTTP/2)
    const domains = new Set(resources.map(resource => {
      try {
        return new URL(resource.name).hostname;
      } catch {
        return '';
      }
    }).filter(Boolean));

    if (domains.size > 3) {
      recommendations.push(
        `Found ${domains.size} different domains. Consider consolidating resources to fewer domains for better HTTP/2 multiplexing.`
      );
    }

    // Check for small resources that could benefit from bundling
    const smallResources = resources.filter(resource => 
      (resource.transferSize || 0) < 1024 && // < 1KB
      (resource.name.endsWith('.js') || resource.name.endsWith('.css'))
    );

    if (smallResources.length > 5) {
      recommendations.push(
        `Found ${smallResources.length} small resources. With HTTP/2, consider whether bundling is still beneficial.`
      );
    }

    // Check for potential server push candidates
    const criticalResources = resources.filter(resource =>
      resource.name.includes('main.') || 
      resource.name.includes('polyfills.') ||
      resource.name.includes('styles.')
    );

    if (criticalResources.length > 0) {
      recommendations.push(
        `Consider HTTP/2 Server Push for ${criticalResources.length} critical resources to improve initial page load.`
      );
    }

    // Multiplexing benefits
    if (multiplexingBenefit > 100) {
      recommendations.push(
        `HTTP/2 multiplexing is saving ~${multiplexingBenefit.toFixed(0)}ms of loading time compared to HTTP/1.1.`
      );
    }

    return recommendations;
  }

  /**
   * Check if current connection supports HTTP/2
   */
  async checkHTTP2Support(): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    try {
      // Try to detect HTTP/2 support through navigation API
      const navigation = (performance as any).getEntriesByType('navigation')[0];
      if (navigation && navigation.nextHopProtocol) {
        return navigation.nextHopProtocol === 'h2' || navigation.nextHopProtocol === 'http/2';
      }

      // Fallback: Check if any resource used HTTP/2
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      return resources.some(resource => 
        resource.nextHopProtocol === 'h2' || resource.nextHopProtocol === 'http/2'
      );
    } catch (error) {
      console.warn('Failed to check HTTP/2 support:', error);
      return false;
    }
  }

  /**
   * Generate HTTP/2 optimization report
   */
  generateHTTP2Report(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    setTimeout(() => {
      const analysis = this.analyzeHTTP2Usage();
      
      console.log('🌐 HTTP/2 Optimization Report:');
      console.log(`Protocol: ${analysis.protocol}`);
      console.log(`HTTP/2 Status: ${analysis.isHTTP2 ? '✅ Enabled' : '❌ Not detected'}`);
      console.log(`Resources analyzed: ${analysis.resourceCount}`);
      console.log(`Total transfer size: ${Math.round(analysis.totalSize / 1024)}KB`);
      console.log(`Multiplexing benefit: ~${analysis.multiplexingBenefit.toFixed(0)}ms saved`);
      
      if (analysis.recommendations.length > 0) {
        console.log('\n📋 Recommendations:');
        analysis.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. ${rec}`);
        });
      } else {
        console.log('\n✅ HTTP/2 is optimally configured!');
      }
    }, 2000);
  }

  /**
   * Monitor HTTP/2 usage in real-time
   */
  monitorHTTP2Usage(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Monitor new resource loads
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries() as PerformanceResourceTiming[];
      entries.forEach(entry => {
        const isHTTP2 = entry.nextHopProtocol === 'h2' || entry.nextHopProtocol === 'http/2';
        if (!isHTTP2 && entry.transferSize > 1024) { // Only log significant non-HTTP/2 resources
          console.warn(
            `Non-HTTP/2 resource detected: ${entry.name} (${entry.nextHopProtocol || 'unknown'})`
          );
        }
      });
    });

    observer.observe({ entryTypes: ['resource'] });
  }

  /**
   * Default result for server-side rendering
   */
  private getDefaultResult(): HTTP2AnalysisResult {
    return {
      protocol: 'Unknown',
      isHTTP2: false,
      multiplexingBenefit: 0,
      resourceCount: 0,
      totalSize: 0,
      recommendations: []
    };
  }

  /**
   * Generate browser console script for HTTP/2 analysis
   */
  generateHTTP2AnalysisScript(): string {
    return `
// HTTP/2 Analysis Script - Run in browser console
(function analyzeHTTP2() {
  console.log('🌐 Analyzing HTTP/2 usage...');
  
  const resources = performance.getEntriesByType('resource');
  const navigation = performance.getEntriesByType('navigation')[0];
  
  // Check main document protocol
  const mainProtocol = navigation?.nextHopProtocol || 'Unknown';
  console.log(\`Main document protocol: \${mainProtocol}\`);
  
  // Analyze resources
  const protocolStats = {};
  let totalSize = 0;
  
  resources.forEach(resource => {
    const protocol = resource.nextHopProtocol || 'unknown';
    protocolStats[protocol] = (protocolStats[protocol] || 0) + 1;
    totalSize += resource.transferSize || 0;
  });
  
  console.log('\\n📊 Protocol breakdown:');
  Object.entries(protocolStats).forEach(([protocol, count]) => {
    const percentage = ((count / resources.length) * 100).toFixed(1);
    console.log(\`  \${protocol}: \${count} resources (\${percentage}%)\`);
  });
  
  // HTTP/2 benefits analysis
  const http2Resources = resources.filter(r => 
    r.nextHopProtocol === 'h2' || r.nextHopProtocol === 'http/2'
  );
  
  console.log(\`\\n🚀 HTTP/2 Summary:\`);
  console.log(\`  Total resources: \${resources.length}\`);
  console.log(\`  HTTP/2 resources: \${http2Resources.length}\`);
  console.log(\`  HTTP/2 adoption: \${((http2Resources.length / resources.length) * 100).toFixed(1)}%\`);
  console.log(\`  Total transfer size: \${Math.round(totalSize / 1024)}KB\`);
  
  // Domain analysis
  const domains = new Set(resources.map(r => {
    try { return new URL(r.name).hostname; } catch { return ''; }
  }).filter(Boolean));
  
  console.log(\`  Unique domains: \${domains.size}\`);
  
  if (domains.size > 3) {
    console.log('⚠️  Consider consolidating domains for better HTTP/2 multiplexing');
  }
  
  if (http2Resources.length === resources.length) {
    console.log('✅ All resources are using HTTP/2!');
  } else {
    console.log('💡 Some resources could benefit from HTTP/2 migration');
  }
})();
    `;
  }
}
