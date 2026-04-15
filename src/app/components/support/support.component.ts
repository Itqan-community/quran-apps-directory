import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupportService } from '../../services/support.service';
import { SupportQuestion } from '../../services/support.model';
import { LanguageService } from '../../services/language.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, takeUntil } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-support',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    LucideAngularModule,
    NzButtonModule,
    NzCardModule,
    NzIconModule
  ],
  templateUrl: './support.component.html',
  styleUrls: ['./support.component.scss']
})
export class SupportComponent implements OnInit, OnDestroy {
  public isOpen = false;
  public currentView: 'list' | 'detail' = 'list';
  public questions: SupportQuestion[] = [];
  public selectedQuestion: SupportQuestion | null = null;
  public isRtl = false;
  public currentLang: 'en' | 'ar' = 'ar';
  
  private destroy$ = new Subject<void>();

  constructor(
    private supportService: SupportService,
    private languageService: LanguageService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.languageService.currentLang$
      .pipe(takeUntil(this.destroy$))
      .subscribe(lang => {
        this.currentLang = lang as 'en' | 'ar';
        this.isRtl = lang === 'ar';
      });

    this.supportService.getQuestions()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.questions = data;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSupport(): void {
    this.isOpen = !this.isOpen;
    if (!this.isOpen) {
      // Reset view when closing
      setTimeout(() => {
        this.currentView = 'list';
        this.selectedQuestion = null;
      }, 300);
    }
  }

  selectQuestion(question: SupportQuestion): void {
    this.selectedQuestion = question;
    this.currentView = 'detail';
  }

  goBack(): void {
    this.currentView = 'list';
    this.selectedQuestion = null;
  }
}
