# من الوضع الليلي إلى النشر: بناء دليل تطبيقات إسلامي جاهز للإنتاج وثنائي اللغة

بناء تطبيق ويب جاهز للإنتاج هو أكثر من مجرد كتابة الميزات—فهو يتعلق بالعمارة والإمكانية والأداء والموثوقية. خلال الـ 15 يوماً الماضية، حولنا دليل تطبيقات القرآن إلى نظام شامل يتعامل مع المستخدمين الحقيقيين والتحميلات الحقيقية والتحديات الحقيقية.

هذا المنشور هو شرح تقني عميق للقرارات التي اتخذناها والتحديات التي واجهناها والدروس التي تعلمناها. سواء كنت تبني دليل تطبيقات إسلامياً أو أي تطبيق ويب متعدد اللغات وعالي الجودة، ستجد رؤى عملية مفيدة هنا.

---

## رحلة الدعم متعدد اللغات (i18n)

### التحدي: دعم حقيقي متعدد اللغات

بخلاف العديد من المشاريع التي تضيف دعم اللغة كملحق لاحقاً، جعلنا الوظيفة الثنائية اللغة أساسياً منذ البداية. لكن "دعم الإنجليزية والعربية" أصعب مما يبدو:

```
❌ النهج البسيط: فقط ترجم السلاسل النصية
✅ النهج الصحيح:
   - الكشف عن اللغة من خلال URL
   - معالجة صحيحة للتخطيط RTL/LTR
   - التحقق من صحة النموذج الثنائي اللغة
   - استراتيجية تخزين مؤقت لخادم الخدمة للترجمات
   - تحسين الأداء للترجمات
```

### ما بنيناه

#### 1. ملاحة اللغة المستندة على URL

يقوم المستخدمون بالتنقل إلى تفضيل اللغة من خلال URL:

```
الإنجليزية: /en/apps
العربية:  /ar/apps
```

**لماذا هذا النهج؟**

- تفضيل اللغة قابل للحفظ
- صديق لمحرك البحث (محتوى منفصل لكل لغة)
- لا يعتمد على ملفات تعريف الارتباط
- يعمل دون اتصال (مع خادم الخدمة)
- واضح وشفاف للمستخدمين

**التنفيذ:**

```typescript
// src/app/services/language.service.ts
export class LanguageService {
  constructor(private router: Router) {}

  setLanguage(lang: 'en' | 'ar') {
    // تحديث URL بدون إعادة تحميل الصفحة بالكامل
    const currentPath = this.router.url.split('/').slice(2).join('/');
    this.router.navigate([`/${lang}`, currentPath || 'apps']);
  }

  getCurrentLanguage(): 'en' | 'ar' {
    // الكشف من URL، الرجوع إلى لغة المتصفح
    const url = this.router.url;
    if (url.startsWith('/ar')) return 'ar';
    if (url.startsWith('/en')) return 'en';

    // الخيار البديل: الكشف من المتصفح
    const browserLang = navigator.language;
    return browserLang.startsWith('ar') ? 'ar' : 'en';
  }
}
```

#### 2. استراتيجية تخزين مؤقت لترجمات خادم الخدمة

المشكلة الشائعة: المستخدمون يحملون الصفحة بالإنجليزية، ثم يتبدلون إلى اللغة، لكن خادم الخدمة يقدم محتوى مخزناً بالإنجليزية.

**حلنا: استراتيجية network-first للترجمات**

```typescript
// في service-worker
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // ملفات الترجمة: دائماً network-first
  if (url.includes('/assets/i18n/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // تخزين مؤقت مع 0 maxAge (بدون تخزين مؤقت)
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
  // الموارد الأخرى: cache-first
  else {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
        })
    );
  }
});
```

**التأثير:** المستخدمون يحصلون دائماً على ترجمات حديثة، حتى دون الاتصال بالإنترنت.

#### 3. الكشف الأولي عن اللغة

يحتاج الزوار لأول مرة إلى كشف ذكي عن اللغة:

```typescript
// الكشف عن اللغة عند التحميل الأول
initializeLanguage() {
  const saved = localStorage.getItem('language');
  if (saved) {
    return saved; // استخدم التفضيل المحفوظ
  }

  const url = new URL(window.location.href);
  const urlLang = url.pathname.split('/')[1];
  if (['en', 'ar'].includes(urlLang)) {
    return urlLang; // استخدم لغة URL
  }

  const browser = navigator.language;
  return browser.startsWith('ar') ? 'ar' : 'en';
}
```

### الدروس المستفادة

✅ **اللغة المستندة على URL تستحق التعقيد** - إنها صديقة لمحرك البحث وقابلة للحفظ
✅ **ملفات ترجمة منفصلة لكل لغة** - تسمح بالتحديثات المستقلة
⚠️ **تخزين الخادم المؤقت معقد** - Network-first للترجمات، cache-first للموارد
⚠️ **يجب أن يدعم التحقق من صحة النموذج كلا اللغتين** - رسائل الخطأ يجب أن تطابق لغة المستخدم

---

## الوضع الليلي - أكثر من مجرد تبديل

### ما وراء التبديل البسيط

تتعامل العديد من المشاريع مع الوضع الليلي كمبادلة ملف CSS. نحن بنينا نظاماً كاملاً:

```
تفضيل المستخدم (localStorage)
      ↓
خيار تفضيل النظام (prefers-color-scheme)
      ↓
خصائص CSS المخصصة (المظهر)
      ↓
الوعي بالمظهر على مستوى المكون
      ↓
تكيف الأيقونة والصورة
```

### استراتيجية التنفيذ

#### 1. خدمة المظهر

```typescript
// src/app/services/theme.service.ts
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private darkMode = new BehaviorSubject<boolean>(this.detectDarkMode());

  darkMode$ = this.darkMode.asObservable();

  constructor() {
    this.applyTheme();
  }

  toggle() {
    this.darkMode.next(!this.darkMode.value);
    this.applyTheme();
  }

  private detectDarkMode(): boolean {
    // تحقق من localStorage أولاً
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';

    // الرجوع إلى تفضيل النظام
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private applyTheme() {
    const isDark = this.darkMode.value;
    document.documentElement.setAttribute(
      'data-theme',
      isDark ? 'dark' : 'light'
    );
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }
}
```

#### 2. خصائص CSS المخصصة

بدلاً من أوراق أنماط منفصلة، استخدم متغيرات CSS:

```scss
// src/themes.scss
:root[data-theme='light'] {
  --color-background: #ffffff;
  --color-text: #000000;
  --color-border: #e0e0e0;
  --color-hover: #f5f5f5;
}

:root[data-theme='dark'] {
  --color-background: #1a1a1a;
  --color-text: #ffffff;
  --color-border: #333333;
  --color-hover: #2a2a2a;
}
```

ثم استخدمها في كل مكان:

```scss
.app-card {
  background: var(--color-background);
  color: var(--color-text);
  border: 1px solid var(--color-border);

  &:hover {
    background: var(--color-hover);
  }
}
```

#### 3. تكيف الأيقونة

بعض الأيقونات تحتاج إلى ألوان مختلفة في الأوضاع الفاتحة والغامقة:

```typescript
// في المكونات
getIconColor(): string {
  return this.darkMode ? '#ffffff' : '#000000';
}
```

### ما تعلمناه

✅ **متغيرات CSS ضرورية** - لا تحاول إدارة أوراق أنماط متعددة
✅ **احترم تفضيل النظام** - prefers-color-scheme صديق للمستخدم
✅ **احفظ اختيار المستخدم** - localStorage للتفضيل المحفوظ
⚠️ **الصور قد تحتاج إلى تكيف** - ليس فقط النصوص والخلفيات
⚠️ **اختبر الأوضاع** - من السهل تفويت مشاكل الوضع الليلي

---

## البنية الأساسية والنشر

### استراتيجية متعددة البيئات

نحن ننشر إلى ثلاث بيئات:

```
التطوير → التدريج → الإنتاج
      ↓           ↓          ↓
   Railway    Railway    Railway
  (Backend)  (Backend)  (Backend)
      +           +          +
Cloudflare  Cloudflare  Cloudflare
   Pages      Pages       Pages
  (Frontend) (Frontend)  (Frontend)
```

### تكوين البيئة

لكل بيئة إعداد مختلف:

```python
# config/settings/base.py
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')

# config/settings/development.py
DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1']
EMAIL_BACKEND = 'core.services.email.console.ConsoleEmailBackend'

# config/settings/staging.py
DEBUG = False
ALLOWED_HOSTS = ['staging.quran-apps.itqan.dev', 'api.staging.quran-apps.itqan.dev']
EMAIL_BACKEND = 'core.services.email.mailjet.MailjetEmailBackend'

# config/settings/production.py
DEBUG = False
ALLOWED_HOSTS = ['quran-apps.itqan.dev', 'api.quran-apps.itqan.dev']
EMAIL_BACKEND = 'core.services.email.mailjet.MailjetEmailBackend'
```

### GitHub Actions CI/CD

نشر آلي عند دفع الفرع:

```yaml
# .github/workflows/deploy-staging-backend.yml
name: Deploy Staging Backend

on:
  push:
    branches: [staging]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          npm install -g @railway/cli
          railway up --service backend
```

### عمارة خدمة البريد الإلكتروني

بدلاً من ترميز مزود واحد، بنينا نظاماً قابلاً للإضافة:

```python
# core/services/email/__init__.py
def get_email_service():
    """دالة المصنع للحصول على خدمة البريد المكونة."""
    backend = os.getenv('EMAIL_BACKEND', 'console')

    if backend == 'mailjet':
        from .mailjet import MailjetEmailBackend
        return MailjetEmailBackend()
    elif backend == 'sendgrid':
        from .sendgrid import SendGridEmailBackend
        return SendGridEmailBackend()
    else:
        from .console import ConsoleEmailBackend
        return ConsoleEmailBackend()
```

**الفوائد:**
- تبديل المزودين بدون تغييرات في الكود
- backend وحدة التحكم للتطوير
- اختبار سهل مع backend وهمي
- مزود الإنتاج (Mailjet) في التدريج والإنتاج

### التدهور الرشيق

ليس كل ميزة تحتاج إلى العمل بشكل مثالي في جميع الأوقات:

```python
# في الإنتاج، قد يكون Redis غير متاح
# لذا نحن نرجع إلى التخزين المؤقت في الذاكرة

from django.core.cache import caches

try:
    cache = caches['redis']
    cache.get('test_key')  # اختبار الاتصال
except Exception:
    cache = caches['locmem']  # الرجوع إلى الذاكرة
```

### ما تعلمناه

✅ **التكوين المستند على البيئة يوفر الصداع** - إعدادات مختلفة لكل بيئة
✅ **الخدمات القابلة للإضافة مرنة** - سهل تبديل التطبيقات
✅ **GitHub Actions automation يقلل العمل اليدوي** - انشر مع دفعة git
⚠️ **البيئات المتعددة تضيف تعقيداً** - يحتاج إلى اختبار دقيق في كل مستوى
⚠️ **إدارة الأسرار حرجة** - استخدم متغيرات البيئة، لا تلتزم بالأسرار

---

## الأداء والـ SEO

### تحسينات الأداء

#### 1. تخزين الخادم المؤقت

نحن ننفذ استراتيجية تخزين ذكية:

```
الموارد الثابتة (JS, CSS)     → Cache-first (طويلة الأجل)
استجابات API               → Network-first (بيانات جديدة)
الصور                      → Cache-first (غير قابلة للتغيير)
الترجمات                → Network-first (دائماً جديدة)
```

#### 2. تحسين الصور

جميع الصور المرفوعة تمر عبر التحسين:

```python
# submission_service.py
def upload_submission_images_to_r2(self, submission):
    """تحميل الصور مع التحسين."""

    # تحسين قبل التحميل
    optimized = optimize_image(
        original_image,
        max_size=(2000, 2000),
        quality=85,
        format='webp'  # صيغة حديثة
    )

    # تحميل إلى R2 (CDN عام)
    r2_url = storage.upload_from_url(optimized)

    return r2_url
```

#### 3. عناوين URL صديقة لـ SEO

عناوين URL الخاصة بالمطور معايرة من أجل SEO:

```
سيء:  /developer/Fantastic%20Apps%20Inc
جيد: /developer/fantastic-apps-inc
```

التنفيذ:

```python
# models.py
def save(self, *args, **kwargs):
    if self.name_en:
        self.slug = slugify(self.name_en)
    super().save(*args, **kwargs)

# urls.py
path('developer/<slug:slug>/', views.developer_detail)
```

### مقاييس Lighthouse

نحن نراقب الأداء باستخدام Lighthouse:

```
الجوال:
  الأداء: 68 → 75 (بعد التحسينات)
  إمكانية الوصول: 92 → 95
  أفضل الممارسات: 88 → 92
  SEO: 90 → 98

سطح المكتب:
  الأداء: 85 → 88
  إمكانية الوصول: 95 → 98
  أفضل الممارسات: 92 → 96
  SEO: 96 → 99
```

---

## إمكانية الوصول والشمول

### سمات ARIA

جميع العناصر التفاعلية تتضمن تسميات ARIA:

```html
<!-- الأيقونات مع الأوصاف -->
<svg aria-label="إغلاق" role="button">
  <path d="..."/>
</svg>

<!-- أخطاء النموذج -->
<input aria-invalid="true" aria-describedby="error-1" />
<span id="error-1" role="alert">البريد الإلكتروني مطلوب</span>

<!-- وظيفة البحث -->
<input type="search" aria-label="البحث عن التطبيقات" />
```

### تباين اللون

نحن نضمن الامتثال لـ WCAG AA:

```
نسب التباين الأدنى:
  النص العادي: 4.5:1
  النص الكبير:  3:1
  مكونات الواجهة: 3:1
```

### التنقل باستخدام لوحة المفاتيح

جميع الميزات تعمل بدون ماوس:

```typescript
@HostListener('keydown.enter')
@HostListener('keydown.space')
onActivate() {
  this.toggle();
}
```

---

## التحديات الحقيقية

### التحدي 1: حالات السباق في الواجهة

**المشكلة:** المستخدمون ينقرون بسرعة على أيقونات الفئات تسبب وميض

**الحل:** Debounce مع التنظيف الصحيح

```typescript
private clickSubject = new Subject<string>();

constructor() {
  this.clickSubject.pipe(
    debounceTime(300),
    distinctUntilChanged()
  ).subscribe(id => this.loadCategory(id));
}

onCategoryClick(id: string) {
  this.clickSubject.next(id);
}
```

### التحدي 2: موثوقية تسليم البريد الإلكتروني

**المشكلة:** بعض تغييرات حالة الإرسال لم تكن تؤدي إلى رسائل بريد إلكتروني

**الحل:** إرسال بريد إلكتروني غير محجوب مع تسجيل شامل

```python
def send_status_email(submission, status):
    """إرسال بريد، لكن لا تفشل إذا كانت خدمة البريد معطلة."""
    try:
        email_service.send_email(submission, status)
        logger.info(f"تم الإرسال {status} بريد لـ {submission.id}")
    except Exception as e:
        logger.error(f"فشل إرسال البريد: {e}")
        # مهم: لا ترفع - حفظ الإرسال يكتمل
```

### التحدي 3: فشل تحميل الصور

**المشكلة:** تحميلات الصور الكبيرة تنتهي أحياناً بانقطاع المهلة الزمنية

**الحل:** الرجوع التلقائي إلى URL الأصلي

```python
try:
    r2_url = storage.upload_from_url(url)
except StorageError:
    logger.warning(f"فشل التحميل إلى R2، باستخدام URL الأصلي")
    r2_url = url  # الرجوع
```

---

## قائمة التحقق من الميزات الكاملة

✅ **الدعم متعدد اللغات**
- الكشف عن اللغة المستند على URL
- تخزين مؤقت لخادم الخدمة للترجمات
- الرجوع إلى تفضيل المتصفح
- النماذج والمحتوى الثنائي اللغة

✅ **الوضع الليلي**
- خدمة المظهر مع الاستمرار
- خصائص CSS المخصصة
- كشف تفضيل النظام
- تكيف على مستوى المكون

✅ **البنية الأساسية**
- نشر متعدد البيئات
- GitHub Actions CI/CD
- التكوين المستند على البيئة
- خدمة البريد الإلكتروني القابلة للإضافة

✅ **الأداء**
- استراتيجية تخزين الخادم المؤقت
- تحسين الصور
- تحميل كسول
- تحسين الحزمة

✅ **SEO**
- عناوين دلالية
- علامات Schema.org
- توليد خريطة الموقع
- علامات Meta

✅ **إمكانية الوصول**
- سمات ARIA
- الامتثال لتباين اللون
- التنقل باستخدام لوحة المفاتيح
- دعم قارئ الشاشة

✅ **الموثوقية**
- معالجة الأخطاء والعودة إلى الخيارات البديلة
- العمليات غير المحجوبة
- تسجيل شامل
- التدهور الرشيق

---

## قائمة التحقق من النشر

قبل الدفع إلى الإنتاج:

- [ ] اختبر في جميع البيئات الثلاث
- [ ] قم بتشغيل Lighthouse audit (الهدف: >90 في جميع الفئات)
- [ ] اختبر على أجهزة الجوال
- [ ] تحقق من اكتمال الترجمات
- [ ] تحقق من الوضع الليلي عبر جميع الصفحات
- [ ] اختبر تسليم البريد الإلكتروني
- [ ] تحقق من تحميلات R2
- [ ] راقب سجلات الأخطاء
- [ ] اختبر التحميل على نقاط النهاية الحرجة
- [ ] استعد خطة التراجع

---

## النقاط الرئيسية

1. **خطط للحجم من البداية** - إعداد متعدد البيئات يوفر الألم لاحقاً
2. **عامل إمكانية الوصول أساسياً، ليس إضافة** - الامتثال WCAG يفيد الجميع
3. **احتضن العودة إلى الخيارات البديلة والتدهور الرشيق** - الأنظمة تفشل، خطط لها
4. **راقب كل شيء** - السجلات والمقاييس وتعليقات المستخدمين ذهب
5. **أتمتة ما يمكنك** - خطوط أنابيب CI/CD تلتقط المشاكل مبكراً
6. **وثق لمستقبلك** - غداً لن تتذكر لماذا فعلت هذا
7. **استمع إلى مستخدميك** - سيخبرونك بما هو معطل قبل سجلاتك

---

## ما القادم؟

نحن نستمر في التحسين:

- **Real User Monitoring** - تتبع تجربة المستخدم الفعلية
- **Advanced Analytics** - فهم سلوك المستخدم
- **Performance Budget** - فرض أهداف الأداء
- **A/B Testing** - اختبر التحسينات بأمان
- **Progressive Enhancement** - دعم أفضل بدون اتصال

---

## الموارد

- **Lighthouse:** https://developers.google.com/web/tools/lighthouse
- **WCAG Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/
- **Django Performance:** https://docs.djangoproject.com/en/stable/topics/performance/
- **Angular Best Practices:** https://angular.io/guide/styleguide
- **Railway Deployment:** https://docs.railway.com/

---

## أسئلة؟

وجدت مشاكل أو لديك اقتراحات؟

- **GitHub Issues:** https://github.com/Itqan-community/quran-apps-directory/issues
- **Community Forum:** https://community.itqan.dev
- **Email:** connect@itqan.dev

---

**الإصدار:** 1.0
**آخر تحديث:** 30 نوفمبر 2025
**التقنيات:** Django 5.0, Angular 19, Railway, Cloudflare, GitHub Actions
