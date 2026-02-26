import { Component, Input } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-error-state',
  templateUrl: './error-state.component.html',
  styleUrls: ['./error-state.component.scss']
})
export class ErrorStateComponent {
  @Input() statusCode: number = 404;
  @Input() title: string = '';
  @Input() message: string = '';
  @Input() showBackButton: boolean = true;

  constructor(
    private location: Location,
    private router: Router
  ) {}

  get defaultTitle(): string {
    return this.statusCode === 404 ? 'Page Not Found' : 'Something Went Wrong';
  }

  get defaultMessage(): string {
    return this.statusCode === 404
      ? "The page you're looking for doesn't exist or has been moved."
      : "An unexpected error occurred. Please try again later.";
  }

  goBack(): void {
    this.location.back();
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
