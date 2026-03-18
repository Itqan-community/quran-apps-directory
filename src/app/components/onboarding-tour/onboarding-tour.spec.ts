import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateService } from '@ngx-translate/core'; // استيراد الخدمة
interface TourStep {
  title: string;
  description: string;
  target?: string;
  id?: string;
}

@Component({
  selector: 'app-onboarding-tour',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './onboarding-tour.html',
  styleUrls: ['./onboarding-tour.css']
})
export class OnboardingTourComponent implements OnInit {


  constructor(private translate: TranslateService) {}

  currentStep = 0;
  showTour = false;
  currentLang: 'ar' | 'en' = 'ar'; // اللغة الافتراضية
  steps: TourStep[] = [];

  // الخطوات باللغة العربية
  private stepsAr: TourStep[] = [
    {
      title: 'مرحباً بك في دليل تطبيقات القرآن',
      description: 'يسعدنا مساعدتك في اكتشاف أفضل التطبيقات لخدمة كتاب الله بطريقة عصرية وسهلة.'
    },
    {
      id: 'search-step',
      title: 'محرك البحث المتطور',
      description: 'يمكنك التبديل بين البحث التقليدي والبحث الذكي الذي يستخدم الذكاء الاصطناعي لفهم طلبك.',
      target: '#search-input'
    },
    {
      title: 'التصنيفات الشاملة',
      description: 'تصفح التطبيقات حسب نوعها (مصحف، تجويد، تفسير...) عبر شريط التصنيفات التفاعلي.',
      target: '#categories'
    },
    {
      title: 'بطاقات التطبيقات',
      description: 'كل تطبيق يحتوي على تفاصيل كاملة، تقييمات الدقة، وروابط تحميل مباشرة.',
      target: '.app-card'
    },
    {
      title: 'استمتع بالرحلة!',
      description: 'أنت الآن جاهز لاستخدام كافة مميزات المنصة. نتمنى لك رحلة إيمانية نافعة.'
    }
  ];

  // الخطوات باللغة الإنجليزية
  private stepsEn: TourStep[] = [
    {
      title: 'Welcome to Quran Apps Directory',
      description: 'We are happy to help you discover the best apps to serve the Holy Quran in a modern way.'
    },
    {
      id: 'search-step',
      title: 'Advanced Search Engine',
      description: 'Switch between Traditional search and Smart search powered by AI to understand your needs.',
      target: '#search-input'
    },
    {
      title: 'Comprehensive Categories',
      description: 'Browse apps by type (Mushaf, Tajweed, Tafsir...) via the interactive categories bar.',
      target: '#categories'
    },
    {
      title: 'App Cards',
      description: 'Each app includes full details, accuracy ratings, and direct download links.',
      target: '.app-card'
    },
    {
      title: 'Enjoy the Journey!',
      description: 'You are now ready to explore all features. We wish you a beneficial experience.',
      target: undefined
    }
  ];

  ngOnInit(): void {
this.updateLanguage(this.translate.currentLang || this.translate.defaultLang);

  // تحديث اللغة فوراً إذا قام المستخدم بتغييرها والجولة مفتوحة
  this.translate.onLangChange.subscribe(event => {
    this.updateLanguage(event.lang);
  });

  this.showTour = true;
  }

private updateLanguage(lang: string): void {
  this.currentLang = lang.startsWith('ar') ? 'ar' : 'en';
  this.steps = this.currentLang === 'ar' ? this.stepsAr : this.stepsEn;
}


  // نصوص الأزرار تتغير حسب اللغة أيضاً
getButtonText(type: 'next' | 'back' | 'skip' | 'finish' | 'start'): string {
  const texts = {
    ar: { 
      next: 'التالي', 
      back: 'السابق', 
      skip: 'تخطي', 
      finish: 'إنهاء', 
      start: 'ابدأ الجولة' // النص الجديد
    },
    en: { 
      next: 'Next', 
      back: 'Back', 
      skip: 'Skip', 
      finish: 'Finish', 
      start: 'Start Tour' // New text
    }
  };
  return (texts[this.currentLang] as any)[type];
}

  next() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.scrollToTarget();
    } else {
      this.finish();
    }
  }

  back() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.scrollToTarget();
    }
  }

  private scrollToTarget() {
    const target = this.steps[this.currentStep].target;
    if (target) {
      const element = document.querySelector(target);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  skip() {
    this.finish();
  }

  finish() {
    localStorage.setItem('onboardingCompleted', 'true');
    this.showTour = false;
  }
}