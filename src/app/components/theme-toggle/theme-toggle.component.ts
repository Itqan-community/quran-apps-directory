import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { ThemeService, Theme } from '../../services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzIconModule, NzToolTipModule],
  template: `
    <button 
      nz-button 
      nzType="link"
      [nz-tooltip]="tooltipText()"
      nzTooltipPlacement="bottom"
      (click)="toggleTheme()"
      class="theme-toggle-btn"
      [attr.aria-label]="'Toggle theme. Current theme: ' + currentTheme()">
      <span nz-icon [nzType]="iconType()" [nzTheme]="iconTheme()"></span>
    </button>
  `,
  styles: [`
    .theme-toggle-btn {
      /* Match the style of other navigation buttons */
      border: none !important;
      background: transparent !important;
      color: #666666 !important;
      transition: all 0.2s ease;
      display: flex !important;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      padding: 8px !important;
      height: 36px !important;
      width: 36px !important;
      min-height: 36px;
      opacity: 1 !important;
      visibility: visible !important;
      
      &:hover {
        background: rgba(24, 144, 255, 0.06) !important;
        color: #1890ff !important;
      }
      
      &:focus {
        background: rgba(24, 144, 255, 0.06) !important;
        color: #1890ff !important;
      }
      
      .anticon {
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 1 !important;
        color: currentColor !important;
      }
    }
    
    /* Light theme tooltip styling - force white text */
    :host ::ng-deep .ant-tooltip-inner {
      background-color: rgba(0, 0, 0, 0.85) !important;
      color: white !important;
    }
    
    :host ::ng-deep .ant-tooltip-arrow-content {
      background-color: rgba(0, 0, 0, 0.85) !important;
    }
    
    /* Light theme specific styling */
    :host:not([class*="dark-theme"]) .theme-toggle-btn {
      color: #495057 !important;
      
      &:hover {
        background: rgba(24, 144, 255, 0.06) !important;
        color: #1890ff !important;
      }
      
      &:focus {
        background: rgba(24, 144, 255, 0.06) !important;
        color: #1890ff !important;
      }
    }
    
    /* Dark theme hover effects to match other buttons */
    :host-context(.dark-theme) .theme-toggle-btn {
      color: #b3b3b3 !important;
      
      &:hover {
        background: rgba(255, 140, 66, 0.1) !important;
        color: #ff8c42 !important;
      }
      
      &:focus {
        background: rgba(255, 140, 66, 0.1) !important;
        color: #ff8c42 !important;
      }
    }
  `]
})
export class ThemeToggleComponent {
  constructor(private themeService: ThemeService) {}

  currentTheme = this.themeService.theme;
  isDark = this.themeService.isDark;

  iconType = computed(() => {
    const theme = this.currentTheme();
    
    // Show icon for next state (what clicking will switch to)
    return theme === 'light' ? 'moon' : 'sun';
  });

  iconTheme = computed<'outline' | 'fill' | 'twotone'>(() => {
    // Always use outline for better visibility
    return 'outline';
  });

  tooltipText = computed(() => {
    const theme = this.currentTheme();
    
    return theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
  });

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}

