import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="app-card">
      <!-- Badges -->
      <div class="badges-container" *ngIf="isFeatured || isNew">
        <span class="badge badge-featured" *ngIf="isFeatured">
          ⭐ Featured
        </span>
        <span class="badge badge-new" *ngIf="isNew">
          🆕 New
        </span>
      </div>

      <!-- App Content -->
      <div class="app-content">
        <img [src]="app.icon" [alt]="app.name" class="app-icon" />
        <div class="app-info">
          <h3 class="app-name">{{ app.name }}</h3>
          <p class="app-description">{{ app.description }}</p>
          <div class="app-meta">
            <span class="category">{{ app.category }}</span>
            <span class="platform">{{ app.platform }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .app-card {
      position: relative;
      background: var(--surface-card);
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .app-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }

    .badges-container {
      position: absolute;
      top: 12px;
      right: 12px;
      display: flex;
      gap: 8px;
      z-index: 10;
    }

    .badge {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge-featured {
      background: linear-gradient(135deg, #FFD700, #FFA500);
      color: #000;
    }

    .badge-new {
      background: linear-gradient(135deg, #00C851, #007E33);
      color: #fff;
    }

    .app-content {
      display: flex;
      gap: 16px;
      margin-top: 8px;
    }

    .app-icon {
      width: 64px;
      height: 64px;
      border-radius: 12px;
      object-fit: cover;
    }

    .app-info {
      flex: 1;
    }

    .app-name {
      margin: 0 0 8px 0;
      font-size: 18px;
      font-weight: 600;
    }

    .app-description {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: var(--text-color-secondary);
      line-height: 1.5;
    }

    .app-meta {
      display: flex;
      gap: 12px;
      font-size: 12px;
    }

    .category, .platform {
      padding: 4px 8px;
      background: var(--surface-100);
      border-radius: 4px;
      color: var(--text-color-secondary);
    }

    @media (max-width: 768px) {
      .app-content {
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      .badges-container {
        position: static;
        justify-content: center;
        margin-bottom: 12px;
      }
    }
  `]
})
export class AppCardComponent {
  @Input() app: any;
  @Input() isFeatured: boolean = false;
  @Input() isNew: boolean = false;
}
