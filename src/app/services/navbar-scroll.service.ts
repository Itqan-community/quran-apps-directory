import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { Category } from './api.service';

export interface NavbarSearchState {
  isCompact: boolean;
  searchQuery: string;
  searchType: 'traditional' | 'smart';
  categories: Category[];
  selectedCategory: string;
  currentLang: 'en' | 'ar';
  isSearching: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NavbarScrollService {
  private compactModeSubject = new BehaviorSubject<boolean>(false);
  private searchStateSubject = new BehaviorSubject<NavbarSearchState>({
    isCompact: false,
    searchQuery: '',
    searchType: 'traditional',
    categories: [],
    selectedCategory: 'all',
    currentLang: 'ar',
    isSearching: false
  });

  compactMode$: Observable<boolean> = this.compactModeSubject.asObservable();
  searchState$: Observable<NavbarSearchState> = this.searchStateSubject.asObservable();

  private isDesktop = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.checkIfDesktop();
      window.addEventListener('resize', () => this.checkIfDesktop());
    }
  }

  private checkIfDesktop(): void {
    // Only enable on desktop (width > 992px)
    this.isDesktop = window.innerWidth > 992;
  }

  setCompactMode(isCompact: boolean): void {
    // Only set compact mode on desktop
    if (this.isDesktop || !isCompact) {
      this.compactModeSubject.next(isCompact);
    }
  }

  updateSearchState(state: Partial<NavbarSearchState>): void {
    const currentState = this.searchStateSubject.value;
    this.searchStateSubject.next({ ...currentState, ...state });
  }

  getSearchState(): NavbarSearchState {
    return this.searchStateSubject.value;
  }

  isDesktopMode(): boolean {
    return this.isDesktop;
  }
}
