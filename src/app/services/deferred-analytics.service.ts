import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class DeferredAnalyticsService {
  private isLoaded = false;
  private hasUserInteracted = false;
  private pendingEvents: any[] = [];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.initializeInteractionListeners();
  }

  /**
   * Initialize user interaction listeners to defer analytics loading
   */
  private initializeInteractionListeners(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const interactions = ['click', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    
    const loadAnalytics = () => {
      if (!this.hasUserInteracted) {
        this.hasUserInteracted = true;
        this.loadGoogleAnalytics();
        
        // Remove listeners after first interaction
        interactions.forEach(event => {
          document.removeEventListener(event, loadAnalytics);
        });
      }
    };

    // Also load after 5 seconds if no interaction
    setTimeout(() => {
      if (!this.hasUserInteracted) {
        loadAnalytics();
      }
    }, 5000);

    // Add interaction listeners
    interactions.forEach(event => {
      document.addEventListener(event, loadAnalytics, true);
    });
  }

  /**
   * Dynamically load Google Analytics script
   */
  private loadGoogleAnalytics(): void {
    if (!isPlatformBrowser(this.platformId) || this.isLoaded) return;

    // Create and inject the Google Analytics script
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-PM1CMKHFQ9';
    script.onload = () => {
      this.initializeGtag();
      this.processPendingEvents();
    };
    
    document.head.appendChild(script);
    this.isLoaded = true;
  }

  /**
   * Initialize gtag function and configuration
   */
  private initializeGtag(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Initialize dataLayer and gtag function
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).gtag = function() {
      (window as any).dataLayer.push(arguments);
    };

    // Configure Google Analytics
    (window as any).gtag('js', new Date());
    (window as any).gtag('config', 'G-PM1CMKHFQ9', {
      // Optimize for performance
      send_page_view: false, // We'll send manually
      transport_type: 'beacon', // Use sendBeacon for better performance
      anonymize_ip: true // Privacy compliance
    });

    // Send initial page view
    this.trackPageView();
  }

  /**
   * Process any events that were queued before analytics loaded
   */
  private processPendingEvents(): void {
    this.pendingEvents.forEach(event => {
      this.sendEvent(event.action, event.data);
    });
    this.pendingEvents = [];
  }

  /**
   * Track page view (called automatically on initialization)
   */
  trackPageView(page?: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const data = {
      page_title: document.title,
      page_location: window.location.href,
      ...(page && { page_path: page })
    };

    this.sendEvent('page_view', data);
  }

  /**
   * Track custom events
   */
  trackEvent(action: string, data?: any): void {
    this.sendEvent(action, data);
  }

  /**
   * Send event to Google Analytics (queue if not loaded yet)
   */
  private sendEvent(action: string, data?: any): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.isLoaded && (window as any).gtag) {
      (window as any).gtag('event', action, data);
    } else {
      // Queue the event for later processing
      this.pendingEvents.push({ action, data });
    }
  }

  /**
   * Check if analytics is loaded and ready
   */
  isReady(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return this.isLoaded && !!(window as any).gtag;
  }
}
