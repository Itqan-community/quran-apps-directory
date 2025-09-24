import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface ScriptConfig {
  src: string;
  id: string;
  defer?: boolean;
  async?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ScriptLoaderService {
  private loadedScripts: Set<string> = new Set();
  private pendingScripts: Map<string, Promise<void>> = new Map();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  /**
   * Load a script dynamically with intelligent deferring
   */
  loadScript(config: ScriptConfig): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve();
    }

    // Return existing promise if script is already being loaded
    if (this.pendingScripts.has(config.id)) {
      return this.pendingScripts.get(config.id)!;
    }

    // Return resolved promise if script is already loaded
    if (this.loadedScripts.has(config.id)) {
      return Promise.resolve();
    }

    const promise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.id = config.id;
      script.src = config.src;
      script.async = config.async !== false; // Default to async
      script.defer = config.defer || false;

      script.onload = () => {
        this.loadedScripts.add(config.id);
        this.pendingScripts.delete(config.id);
        config.onLoad?.();
        resolve();
      };

      script.onerror = () => {
        this.pendingScripts.delete(config.id);
        config.onError?.();
        reject(new Error(`Failed to load script: ${config.src}`));
      };

      document.head.appendChild(script);
    });

    this.pendingScripts.set(config.id, promise);
    return promise;
  }

  /**
   * Load multiple scripts with priority and dependency management
   */
  loadScripts(configs: ScriptConfig[], sequential = false): Promise<void[]> {
    if (sequential) {
      return configs.reduce(async (promise, config) => {
        await promise;
        return this.loadScript(config);
      }, Promise.resolve()).then(() => []);
    }

    return Promise.all(configs.map(config => this.loadScript(config)));
  }

  /**
   * Load scripts after user interaction (for non-critical scripts)
   */
  loadAfterInteraction(configs: ScriptConfig[]): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const interactions = ['click', 'keydown', 'scroll', 'touchstart'];
    let hasLoaded = false;

    const loadScripts = () => {
      if (!hasLoaded) {
        hasLoaded = true;
        this.loadScripts(configs);
        
        // Remove listeners after loading
        interactions.forEach(event => {
          document.removeEventListener(event, loadScripts);
        });
      }
    };

    // Also load after 3 seconds if no interaction
    setTimeout(loadScripts, 3000);

    // Add interaction listeners
    interactions.forEach(event => {
      document.addEventListener(event, loadScripts, true);
    });
  }

  /**
   * Load scripts when the page is idle
   */
  loadWhenIdle(configs: ScriptConfig[]): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        this.loadScripts(configs);
      }, { timeout: 5000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        this.loadScripts(configs);
      }, 2000);
    }
  }

  /**
   * Preload script (download but don't execute)
   */
  preloadScript(src: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = src;
    document.head.appendChild(link);
  }

  /**
   * Check if a script is loaded
   */
  isLoaded(id: string): boolean {
    return this.loadedScripts.has(id);
  }

  /**
   * Remove a loaded script
   */
  removeScript(id: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const script = document.getElementById(id);
    if (script) {
      script.remove();
      this.loadedScripts.delete(id);
    }
  }
}
