import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { SupportQuestion } from './support.model';

@Injectable({
  providedIn: 'root'
})
export class SupportService {
  private mockQuestions: SupportQuestion[] = [
    {
      id: 1,
      questionEn: 'What are the best apps in the directory?',
      questionAr: 'ما هي افضل التطبيقات الموجودة في الدليل؟',
      answerEn: 'Ayah app is categorized as one of the best, providing word-by-word recitation and tafsir, making it ideal for reading the Quran.',
      answerAr: 'تطبيق آية هو الأفضل، يوفر تلاوة وتفسير القرآن كلمة بكلمة، وهو الأمثل لقراءة القرآن.'
    },
    {
      id: 2,
      questionEn: 'How can I download apps from the directory?',
      questionAr: 'كيف يمكنني تحميل التطبيقات من الدليل؟',
      answerEn: 'You can download apps by clicking on the download links provided on each app\'s detail page, which will redirect you to the official app stores.',
      answerAr: 'يمكنك تحميل التطبيقات من خلال النقر على روابط التحميل المتوفرة في صفحة تفاصيل كل تطبيق، والتي ستوجهك إلى المتاجر الرسمية.'
    },
    {
      id: 3,
      questionEn: 'Can apps be used without internet?',
      questionAr: 'هل يمكن استخدام التطبيقات بدون إنترنت؟',
      answerEn: 'Many apps offer offline features such as downloading recitations and tafsir for use without an active internet connection.',
      answerAr: 'توفر العديد من التطبيقات ميزات غير متصلة بالإنترنت مثل تحميل التلاوات والتفاسير لاستخدامها بدون اتصال نشط بالإنترنت.'
    },
    {
      id: 4,
      questionEn: 'What are the criteria for selecting listed apps?',
      questionAr: 'ما هي المعايير لاختيار التطبيقات المدرجة؟',
      answerEn: 'Apps are selected based on content accuracy, user experience quality, technical reliability, and adherence to Islamic values.',
      answerAr: 'يتم اختيار التطبيقات بناءً على دقة المحتوى، وجودة تجربة المستخدم، والموثوقية التقنية، والالتزام بالقيم الإسلامية.'
    }
  ];

  getQuestions(): Observable<SupportQuestion[]> {
    return of(this.mockQuestions);
  }
}
