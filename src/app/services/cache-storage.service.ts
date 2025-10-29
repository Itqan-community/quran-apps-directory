import { Injectable } from '@angular/core';
import { HttpEvent } from '@angular/common/http';

export interface CacheEntry {
  response: HttpEvent<any>;
  timestamp: number;
  ttl: number;
  hits?: number;
  lastAccessed?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CacheStorageService {
  private cache = new Map<string, CacheEntry>();
  private maxCacheSize = 100;
  private storageKey = 'quran_apps_cache';

  constructor() {
    this.loadFromStorage();
    // Clean up expired entries periodically
    setInterval(() => this.cleanupExpired(), 5 * 60 * 1000); // Every 5 minutes
  }

  set(key: string, value: CacheEntry): void {
    // Update access information
    value.hits = (value.hits || 0) + 1;
    value.lastAccessed = Date.now();

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(key, value);
    this.saveToStorage();
  }

  get(key: string): CacheEntry | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      // Update access information
      entry.hits = (entry.hits || 0) + 1;
      entry.lastAccessed = Date.now();
      this.saveToStorage();
    }
    return entry;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.saveToStorage();
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): {
    totalEntries: number;
    totalHits: number;
    cacheHitRate: number;
    averageTTL: number;
    expiredEntries: number;
  } {
    let totalHits = 0;
    let totalTTL = 0;
    let expiredEntries = 0;
    const now = Date.now();

    this.cache.forEach(entry => {
      totalHits += entry.hits || 0;
      totalTTL += entry.ttl;
      if (now - entry.timestamp > entry.ttl) {
        expiredEntries++;
      }
    });

    return {
      totalEntries: this.cache.size,
      totalHits,
      cacheHitRate: totalHits > 0 ? totalHits / this.cache.size : 0,
      averageTTL: this.cache.size > 0 ? totalTTL / this.cache.size : 0,
      expiredEntries
    };
  }

  invalidatePattern(pattern: RegExp): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
    if (keysToDelete.length > 0) {
      this.saveToStorage();
    }
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    this.cache.forEach((entry, key) => {
      const lastAccessed = entry.lastAccessed || entry.timestamp;
      if (lastAccessed < oldestTime) {
        oldestTime = lastAccessed;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
    if (keysToDelete.length > 0) {
      this.saveToStorage();
    }
  }

  private saveToStorage(): void {
    try {
      // Only store metadata for now, not the actual response
      const cacheData = Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        timestamp: value.timestamp,
        ttl: value.ttl,
        hits: value.hits,
        lastAccessed: value.lastAccessed
      }));

      localStorage.setItem(this.storageKey, JSON.stringify(cacheData));
    } catch (error: any) {
      console.warn('[Cache] Failed to save cache to localStorage:', error);
      // If localStorage is full, clear old entries
      if (error.name === 'QuotaExceededError') {
        this.evictLeastRecentlyUsed();
        this.saveToStorage();
      }
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const cacheData = JSON.parse(stored);
        const now = Date.now();

        cacheData.forEach((item: any) => {
          // Only restore metadata, not actual responses
          if (now - item.timestamp <= item.ttl) {
            // Don't restore actual responses to avoid type issues
            // Just keep the statistics
          }
        });
      }
    } catch (error) {
      console.warn('[Cache] Failed to load cache from localStorage:', error);
      // Clear corrupted cache
      localStorage.removeItem(this.storageKey);
    }
  }
}