import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';

/**
 * Service to handle RTL/LTR direction changes reliably
 * Fixes issue #235: Direction not updating on client-side navigation
 */
@Injectable({
  providedIn: 'root'
})
export class DirectionService {
  private destroy$ = new Subject<void>();
  private currentDir: 'rtl' | 'ltr' = 'ltr';

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private translate: TranslateService
  ) {
    this.initDirectionHandling();
  }

  private initDirectionHandling(): void {
    // Subscribe to language changes
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        const newDir = event.lang === 'ar' ? 'rtl' : 'ltr';
        this.updateDirection(newDir);
      });

    // Set initial direction
    const initialLang = this.translate.currentLang || this.translate.getDefaultLang() || 'en';
    this.currentDir = initialLang === 'ar' ? 'rtl' : 'ltr';
    this.applyDirection(this.currentDir);
  }

  /**
   * Update direction and force re-render if needed
   */
  private updateDirection(newDir: 'rtl' | 'ltr'): void {
    if (newDir === this.currentDir) return;
    
    this.currentDir = newDir;
    this.applyDirection(newDir);
    
    // Force a small delay to ensure DOM updates
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        this.applyDirection(newDir);
        this.triggerReflow();
      }, 0);
    }
  }

  /**
   * Apply direction to document
   */
  private applyDirection(dir: 'rtl' | 'ltr'): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const html = document.documentElement;
    const body = document.body;
    
    // Set dir attribute
    html.setAttribute('dir', dir);
    html.setAttribute('lang', dir === 'rtl' ? 'ar' : 'en');
    
    // Update CSS classes
    if (dir === 'rtl') {
      html.classList.add('rtl');
      html.classList.remove('ltr');
      body.classList.add('rtl');
      body.classList.remove('ltr');
    } else {
      html.classList.add('ltr');
      html.classList.remove('rtl');
      body.classList.add('ltr');
      body.classList.remove('rtl');
    }
  }

  /**
   * Force browser reflow to ensure direction changes apply
   */
  private triggerReflow(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    // Reading offsetHeight forces reflow
    void document.documentElement.offsetHeight;
    void document.body.offsetHeight;
    
    // Dispatch custom event for components to react
    window.dispatchEvent(new CustomEvent('directionchange', {
      detail: { direction: this.currentDir }
    }));
  }

  /**
   * Get current direction
   */
  getCurrentDirection(): 'rtl' | 'ltr' {
    return this.currentDir;
  }

  /**
   * Check if current direction is RTL
   */
  isRtl(): boolean {
    return this.currentDir === 'rtl';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
