import { Injectable, signal, effect, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark' | 'auto';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_STORAGE_KEY = 'quran-apps-theme';
  private readonly platformId: Object;

  // Signal for reactive theme management
  public theme = signal<Theme>('auto');
  public isDark = signal<boolean>(false);

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.platformId = platformId;
    // Only run browser-specific code in browser context
    if (isPlatformBrowser(this.platformId)) {
      // Load saved theme preference
      this.loadThemeFromStorage();

      // Apply initial theme immediately
      this.applyTheme(this.theme());

      // React to theme changes
      effect(() => {
        this.applyTheme(this.theme());
      });

      // Listen for system theme changes
      this.setupSystemThemeListener();
    } else {
      // Default to light theme during SSR/prerender
      this.theme.set('light');
      this.isDark.set(false);
    }
  }

  /**
   * Set theme preference
   */
  setTheme(theme: Theme): void {
    this.theme.set(theme);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.THEME_STORAGE_KEY, theme);
    }
  }

  /**
   * Toggle between light and dark themes only
   */
  toggleTheme(): void {
    const currentTheme = this.theme();
    if (currentTheme === 'light') {
      this.setTheme('dark');
    } else {
      this.setTheme('light');
    }
  }

  /**
   * Get current effective theme (resolves 'auto' to actual theme)
   */
  getEffectiveTheme(): 'light' | 'dark' {
    const theme = this.theme();
    if (theme === 'auto') {
      if (isPlatformBrowser(this.platformId)) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'light'; // Default during SSR/prerender
    }
    return theme;
  }

  private loadThemeFromStorage(): void {
    const savedTheme = localStorage.getItem(this.THEME_STORAGE_KEY) as Theme;
    if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
      this.theme.set(savedTheme);
    } else {
      // Default to light theme if no preference saved
      this.theme.set('light');
    }
  }

  private applyTheme(theme: Theme): void {
    const effectiveTheme = theme === 'auto' 
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    
    // Update isDark signal
    this.isDark.set(effectiveTheme === 'dark');
    
    // Apply theme to document
    const root = document.documentElement;
    root.classList.remove('light-theme', 'dark-theme');
    root.classList.add(`${effectiveTheme}-theme`);
    
    // Update meta theme-color for mobile browsers
    this.updateMetaThemeColor(effectiveTheme);
  }

  private setupSystemThemeListener(): void {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      if (this.theme() === 'auto') {
        this.applyTheme('auto');
      }
    });
  }

  private updateMetaThemeColor(theme: 'light' | 'dark'): void {
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      const color = theme === 'dark' ? '#1a1a1a' : '#ffffff';
      themeColorMeta.setAttribute('content', color);
    }
  }
}
