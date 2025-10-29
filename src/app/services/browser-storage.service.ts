import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, tap, switchMap } from 'rxjs/operators';

export interface StorageItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
}

@Injectable({
  providedIn: 'root'
})
export class BrowserStorageService {
  private readonly APP_VERSION = '1.0.0';
  private readonly STORAGE_PREFIX = 'quran_apps_';
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB

  private memoryCache = new Map<string, StorageItem<any>>();
  private storageAvailable = false;

  constructor() {
    this.checkStorageAvailability();
    this.cleanupExpired();
    this.cleanupByVersion();
  }

  /**
   * Check if localStorage is available
   */
  private checkStorageAvailability(): void {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      this.storageAvailable = true;
    } catch (error) {
      console.warn('[BrowserStorage] localStorage not available:', error);
      this.storageAvailable = false;
    }
  }

  /**
   * Store data with TTL and versioning
   */
  set<T>(key: string, data: T, ttl?: number): Observable<boolean> {
    try {
      const storageKey = this.getStorageKey(key);
      const storageItem: StorageItem<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttl || this.DEFAULT_TTL,
        version: this.APP_VERSION
      };

      // Store in memory cache first
      this.memoryCache.set(key, storageItem);

      // Then persist to localStorage if available
      if (this.storageAvailable) {
        const serialized = JSON.stringify(storageItem);

        // Check storage size
        if (this.getStorageSize() + serialized.length > this.MAX_STORAGE_SIZE) {
          this.cleanupOldest();
        }

        localStorage.setItem(storageKey, serialized);
      }

      return of(true);
    } catch (error) {
      console.error('[BrowserStorage] Error storing data:', error);
      return of(false);
    }
  }

  /**
   * Get data with TTL check
   */
  get<T>(key: string): Observable<T | null> {
    try {
      // Check memory cache first
      const memoryItem = this.memoryCache.get(key);
      if (memoryItem && !this.isExpired(memoryItem)) {
        return of(memoryItem.data);
      }

      if (!this.storageAvailable) {
        return of(null);
      }

      const storageKey = this.getStorageKey(key);
      const serialized = localStorage.getItem(storageKey);

      if (!serialized) {
        return of(null);
      }

      const storageItem: StorageItem<T> = JSON.parse(serialized);

      // Check TTL
      if (this.isExpired(storageItem)) {
        this.delete(key);
        return of(null);
      }

      // Check version compatibility
      if (storageItem.version !== this.APP_VERSION) {
        this.delete(key);
        return of(null);
      }

      // Update memory cache
      this.memoryCache.set(key, storageItem);

      return of(storageItem.data);
    } catch (error) {
      console.error('[BrowserStorage] Error retrieving data:', error);
      return of(null);
    }
  }

  /**
   * Get or set data (useful for caching expensive operations)
   */
  getOrSet<T>(
    key: string,
    dataFactory: () => Observable<T>,
    ttl?: number
  ): Observable<T> {
    return this.get<T>(key).pipe(
      map(cachedData => {
        if (cachedData !== null) {
          return { data: cachedData, fromCache: true };
        }
        return { data: null as T, fromCache: false };
      }),
      tap(result => {
        if (result.fromCache) {
          console.log(`[BrowserStorage] Cache hit: ${key}`);
        } else {
          console.log(`[BrowserStorage] Cache miss: ${key}`);
        }
      }),
      map(result => result.data),
      switchMap((data: T | null) => {
        if (data !== null) {
          return of(data);
        }

        // Cache miss, fetch and cache the data
        return dataFactory().pipe(
          tap(newData => {
            this.set(key, newData, ttl).subscribe();
          })
        );
      })
    );
  }

  /**
   * Delete data
   */
  delete(key: string): Observable<boolean> {
    try {
      this.memoryCache.delete(key);

      if (this.storageAvailable) {
        const storageKey = this.getStorageKey(key);
        localStorage.removeItem(storageKey);
      }

      return of(true);
    } catch (error) {
      console.error('[BrowserStorage] Error deleting data:', error);
      return of(false);
    }
  }

  /**
   * Clear all app data
   */
  clear(): Observable<boolean> {
    try {
      this.memoryCache.clear();

      if (this.storageAvailable) {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith(this.STORAGE_PREFIX)) {
            localStorage.removeItem(key);
          }
        });
      }

      return of(true);
    } catch (error) {
      console.error('[BrowserStorage] Error clearing data:', error);
      return of(false);
    }
  }

  /**
   * Check if key exists
   */
  has(key: string): Observable<boolean> {
    return this.get(key).pipe(
      map(data => data !== null)
    );
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): {
    memoryCacheSize: number;
    localStorageSize: number;
    localStorageKeys: string[];
    totalSize: number;
    maxSize: number;
    usagePercentage: number;
  } {
    let localStorageSize = 0;
    let localStorageKeys: string[] = [];

    if (this.storageAvailable) {
      const keys = Object.keys(localStorage);
      localStorageKeys = keys.filter(key => key.startsWith(this.STORAGE_PREFIX));

      localStorageKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          localStorageSize += key.length + value.length;
        }
      });
    }

    const totalSize = localStorageSize + this.getMemoryCacheSize();
    const maxSize = this.MAX_STORAGE_SIZE;
    const usagePercentage = (totalSize / maxSize) * 100;

    return {
      memoryCacheSize: this.memoryCache.size,
      localStorageSize,
      localStorageKeys,
      totalSize,
      maxSize,
      usagePercentage
    };
  }

  /**
   * Clean up expired items
   */
  cleanupExpired(): void {
    const now = Date.now();

    // Clean memory cache
    for (const [key, item] of this.memoryCache.entries()) {
      if (this.isExpired(item)) {
        this.memoryCache.delete(key);
      }
    }

    // Clean localStorage
    if (this.storageAvailable) {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.STORAGE_PREFIX)) {
          try {
            const serialized = localStorage.getItem(key);
            if (serialized) {
              const item: StorageItem<any> = JSON.parse(serialized);
              if (this.isExpired(item)) {
                localStorage.removeItem(key);
              }
            }
          } catch (error) {
            // Remove corrupted items
            localStorage.removeItem(key);
          }
        }
      });
    }
  }

  /**
   * Clean up items with different version
   */
  private cleanupByVersion(): void {
    if (!this.storageAvailable) return;

    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.STORAGE_PREFIX)) {
        try {
          const serialized = localStorage.getItem(key);
          if (serialized) {
            const item: StorageItem<any> = JSON.parse(serialized);
            if (item.version !== this.APP_VERSION) {
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          // Remove corrupted items
          localStorage.removeItem(key);
        }
      }
    });
  }

  /**
   * Remove oldest items when storage is full
   */
  private cleanupOldest(): void {
    if (!this.storageAvailable) return;

    const items: { key: string; timestamp: number }[] = [];

    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(this.STORAGE_PREFIX)) {
        try {
          const serialized = localStorage.getItem(key);
          if (serialized) {
            const item: StorageItem<any> = JSON.parse(serialized);
            items.push({ key, timestamp: item.timestamp });
          }
        } catch (error) {
          // Remove corrupted items
          localStorage.removeItem(key);
        }
      }
    });

    // Sort by timestamp (oldest first)
    items.sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest 25% of items
    const itemsToRemove = Math.ceil(items.length * 0.25);
    for (let i = 0; i < itemsToRemove; i++) {
      localStorage.removeItem(items[i].key);
    }
  }

  private isExpired(item: StorageItem<any>): boolean {
    return Date.now() - item.timestamp > item.ttl;
  }

  private getStorageKey(key: string): string {
    return `${this.STORAGE_PREFIX}${key}`;
  }

  private getStorageSize(): number {
    let size = 0;
    if (this.storageAvailable) {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(this.STORAGE_PREFIX)) {
          const value = localStorage.getItem(key);
          if (value) {
            size += key.length + value.length;
          }
        }
      });
    }
    return size;
  }

  private getMemoryCacheSize(): number {
    let size = 0;
    this.memoryCache.forEach((item, key) => {
      size += key.length + JSON.stringify(item).length;
    });
    return size;
  }
}