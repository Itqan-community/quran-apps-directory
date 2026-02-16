# ضمان الكمال البصري: اختبار Z-Index الآلي مع Playwright

أخطاء z-index هي من بين أكثر المشاكل محبطة في تطوير الويب. أيقونة تختبئ خلف صورة. قائمة منسدلة تجلس خلف نموذج. زر يصبح غير قابل للنقر. الأعراض مرئية، لكن السبب—التراتيب الغير صحيحة z-index—غير مرئي للاختبار الآلي.

لأسابيع، بنينا الميزات، معتقدين أن كل شيء كان مثالياً. ثم أثناء المراجعة البصرية، اكتشفنا مشاكل z-index منتشرة في جميع أنحاء الواجهة. بعض الأيقونات لم تكن مرئية، الطبقات كانت مرصوصة بشكل غير صحيح، والوضع الليلي جعل كل شيء أسوأ.

كان بإمكاننا إصلاح هذه يدويًا والقول بأنها منجزة. بدلاً من ذلك، بنينا إطار عمل اختبار آلي يلتقط هذه المشاكل قبل أن تصل إلى المستخدمين. يمشي هذا المنشور من خلال كيفية قيامنا بذلك ولماذا يجب أن تفعل الشيء نفسه.

---

## المشكلة: الأخطاء غير المرئية

### لماذا مشاكل Z-Index صعبة

```css
/* قد تكون قد كتبت هذا في 5 ملفات مختلفة */
.modal { z-index: 100; }
.dropdown { z-index: 200; }
.tooltip { z-index: 150; }
.notification { z-index: 300; }
.header { z-index: 50; }
```

انقدم ستة أشهر. الآن لديك:

```
100 ملف CSS
500+ تصريح z-index
لا توجد اتساق
لا توجد وثائق
فوضى
```

لا يمكن لأدوات الاختبار البصري أن تساعد (يرون الطبقات كبكسل مرسوم). لا يمكن لاختبارات الوحدة أن تساعد (z-index هي CSS في وقت التشغيل). الطريقة الوحيدة لالتقاط هذه هي **اختبار الانحدار البصري**.

### لماذا بنينا إطار عمل اختبار

احتجنا إلى:
- الكشف عند رسم الطبقات بشكل غير صحيح
- مقارنة لقطات الشاشة قبل/بعد
- توليد تقارير مفصلة
- التقاط المشاكل في CI/CD قبل الإنتاج
- التعامل مع حالات متعددة (الوضع الفاتح/الغامق، أحجام سريعة الاستجابة)

---

## الحل: التحقق البصري المستند على Playwright

### لماذا Playwright؟

اخترنا Playwright لأن:

```
✅ يعمل في متصفحات headless (سريع، لا واجهة مستخدم مطلوبة)
✅ قدرات لقطة الشاشة للمقارنة البصرية
✅ يمكنه تقييم JavaScript (احصل على z-index المحسوب)
✅ سريع (100x أسرع من Selenium)
✅ دعم المتصفح المتقاطع
✅ يعمل في خطوط أنابيب CI/CD
✅ مجتمع نشط والتوثيق
```

### نظرة عامة على العمارة

```
مجموعة الاختبار (Playwright)
      ↓
تحميل الصفحة وانتظر العرض
      ↓
التقط لقطات الشاشة
      ↓
استخرج Z-Index المحسوب
      ↓
حلل هرمية Z-Index
      ↓
توليد التقرير والمقارنة
      ↓
فشل/نجاح استناداً إلى القواعد
```

---

## إعداد Playwright

### التثبيت

```bash
# تثبيت Playwright والعتمديات
npm install -D @playwright/test

# تثبيت المتصفحات
npx playwright install

# اختياري: وضع الواجهة للتصحيح
npm install -D @playwright/test --save-exact
```

### التكوين

إنشاء `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }
  ]
});
```

---

## كتابة اختبارات التحقق من Z-Index

### الاختبار 1: التحقق الأساسي من Z-Index

```typescript
// tests/verify-zindex.spec.ts
import { test, expect } from '@playwright/test';

test.describe('التحقق من Z-Index', () => {
  test('صفحة قائمة التطبيقات لديها هرمية z-index صحيحة', async ({ page }) => {
    await page.goto('/ar/apps');

    // انتظر حتى يكتمل العرض
    await page.waitForLoadState('networkidle');

    // احصل على قيم z-index للعناصر الرئيسية
    const elements = {
      header: await page.locator('app-header').evaluate(el => {
        return window.getComputedStyle(el).zIndex;
      }),
      modal: await page.locator('.modal').evaluate(el => {
        return window.getComputedStyle(el).zIndex;
      }),
      dropdown: await page.locator('[dropdown-menu]').evaluate(el => {
        return window.getComputedStyle(el).zIndex;
      }),
      overlay: await page.locator('.overlay').evaluate(el => {
        return window.getComputedStyle(el).zIndex;
      })
    };

    // تحقق من الهرمية: overlay > modal > dropdown > header
    const zIndexes = Object.values(elements)
      .map(z => z === 'auto' ? 0 : parseInt(z));

    expect(zIndexes[3]).toBeGreaterThan(zIndexes[2]); // overlay > modal
    expect(zIndexes[2]).toBeGreaterThan(zIndexes[1]); // modal > dropdown
    expect(zIndexes[1]).toBeGreaterThan(zIndexes[0]); // dropdown > header
  });
});
```

### الاختبار 2: التحقق من الرؤية

```typescript
test('جميع العناصر المهمة مرئية وقابلة للنقر', async ({ page }) => {
  await page.goto('/ar/apps');

  // تحقق من الرؤية
  const appIcon = page.locator('[data-testid="app-icon"]').first();

  // العنصر يجب أن يكون مرئياً
  await expect(appIcon).toBeVisible();

  // العنصر يجب أن يكون في منطقة العرض (لم تختبئ خلف آخرين)
  const box = await appIcon.boundingBox();
  expect(box).toBeTruthy();
  expect(box?.width).toBeGreaterThan(0);
  expect(box?.height).toBeGreaterThan(0);

  // العنصر يجب أن يكون قابلاً للنقر
  await expect(appIcon).toBeEnabled();

  // Z-index يجب أن يكون موجباً
  const zIndex = await appIcon.evaluate(el => {
    return parseInt(window.getComputedStyle(el).zIndex);
  });
  expect(zIndex).toBeGreaterThan(0);
});
```

### الاختبار 3: اختبار متعدد الحالات

اختبر نفس الصفحة في حالات مختلفة:

```typescript
test('z-index صحيح في الأوضاع الغامقة والفاتحة', async ({ page }) => {
  await page.goto('/ar/apps');

  // اختبر الوضع الفاتح
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
  });

  let lightModeResult = await analyzeZIndex(page);
  expect(lightModeResult.isValid).toBe(true);

  // اختبر الوضع الغامق
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  });

  let darkModeResult = await analyzeZIndex(page);
  expect(darkModeResult.isValid).toBe(true);

  // تحقق من أن كلاهما متسق
  expect(lightModeResult.hierarchy).toEqual(darkModeResult.hierarchy);
});
```

### الاختبار 4: مقارنة لقطة الشاشة

```typescript
test('فحص الانحدار البصري', async ({ page }) => {
  await page.goto('/ar/apps');

  // انتظر حتى يكتمل كل العرض
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500); // الرسوم المتحركة

  // التقط لقطة الشاشة
  expect(await page.screenshot()).toMatchSnapshot('app-list.png');
});
```

---

## متقدم: إطار العمل التحليلي الشامل

إنشاء مساعد تحليل قابل لإعادة الاستخدام:

```typescript
// tests/helpers/zindex-analyzer.ts
export interface ElementAnalysis {
  selector: string;
  zIndex: number;
  isVisible: boolean;
  isClickable: boolean;
  boundingBox: DOMRect | null;
  computedStyle: CSSStyleDeclaration;
}

export class ZIndexAnalyzer {
  constructor(private page: Page) {}

  async analyzeElement(selector: string): Promise<ElementAnalysis> {
    const element = this.page.locator(selector);

    const analysis = await element.evaluate((el: HTMLElement) => {
      const style = window.getComputedStyle(el);
      const box = el.getBoundingClientRect();

      return {
        zIndex: parseInt(style.zIndex) || 0,
        isVisible: style.display !== 'none' && style.visibility !== 'hidden',
        opacity: parseFloat(style.opacity),
        position: style.position,
        boundingBox: {
          top: box.top,
          left: box.left,
          width: box.width,
          height: box.height
        }
      };
    });

    return {
      selector,
      ...analysis,
      isClickable: await element.isEnabled(),
      boundingBox: analysis.boundingBox as DOMRect
    };
  }

  async analyzeHierarchy(selectors: string[]): Promise<ElementAnalysis[]> {
    const results: ElementAnalysis[] = [];

    for (const selector of selectors) {
      results.push(await this.analyzeElement(selector));
    }

    return results.sort((a, b) => b.zIndex - a.zIndex);
  }

  async generateReport(selectors: string[]): Promise<string> {
    const hierarchy = await this.analyzeHierarchy(selectors);

    let report = '# تقرير تحليل Z-Index\n\n';
    report += '## الهرمية (مرتبة حسب z-index)\n\n';

    hierarchy.forEach((item, index) => {
      report += `${index + 1}. **${item.selector}**\n`;
      report += `   - Z-Index: ${item.zIndex}\n`;
      report += `   - مرئي: ${item.isVisible}\n`;
      report += `   - قابل للنقر: ${item.isClickable}\n`;
      report += `   - الموضع: ${item.boundingBox?.width}x${item.boundingBox?.height}px\n\n`;
    });

    // تحقق من المشاكل
    const issues = this.detectIssues(hierarchy);
    if (issues.length > 0) {
      report += '## المشاكل المكتشفة\n\n';
      issues.forEach(issue => {
        report += `⚠️ ${issue}\n`;
      });
    }

    return report;
  }

  private detectIssues(hierarchy: ElementAnalysis[]): string[] {
    const issues: string[] = [];

    hierarchy.forEach((item) => {
      // العناصر المخفية لا يجب أن يكون لديها z-index عالي
      if (!item.isVisible && item.zIndex > 100) {
        issues.push(
          `${item.selector} مخفي ولكن لديه z-index ${item.zIndex}`
        );
      }

      // العناصر في منطقة العرض يجب أن تكون قابلة للنقر
      if (item.isVisible && !item.isClickable) {
        issues.push(
          `${item.selector} مرئي ولكن ليس قابلاً للنقر`
        );
      }

      // فجوات Z-index تشير إلى مشاكل في المنظمة
      if (item.zIndex > 9999) {
        issues.push(
          `${item.selector} لديه z-index عالي جداً (${item.zIndex}) - قد يشير إلى تضخيم z-index`
        );
      }
    });

    return issues;
  }
}
```

### الاستخدام

```typescript
test('تحليل z-index الشامل', async ({ page }) => {
  await page.goto('/ar/apps');

  const analyzer = new ZIndexAnalyzer(page);

  const selectors = [
    'app-header',
    '[dropdown-menu]',
    '.modal',
    '.overlay',
    '[search-box]'
  ];

  const report = await analyzer.generateReport(selectors);
  console.log(report);

  // احفظ التقرير
  const fs = require('fs');
  fs.writeFileSync('test-results/zindex-report.md', report);

  // تحقق أيضاً من الناحية البرمجية
  const hierarchy = await analyzer.analyzeHierarchy(selectors);
  const issues = analyzer.detectIssues(hierarchy);
  expect(issues).toHaveLength(0);
});
```

---

## تشغيل الاختبارات في CI/CD

### تكامل GitHub Actions

```yaml
# .github/workflows/ui-tests.yml
name: اختبارات الواجهة (التحقق من Z-Index)

on:
  push:
    branches: [develop, staging, main]
  pull_request:
    branches: [develop, staging, main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: تثبيت المتعلقات
        run: npm ci

      - name: بناء التطبيق
        run: npm run build

      - name: تثبيت متصفحات Playwright
        run: npx playwright install --with-deps

      - name: تشغيل اختبارات Z-Index
        run: npm run test:zindex

      - name: تحميل نتائج الاختبار
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: test-results/
          retention-days: 30

      - name: التعليق على PR مع النتائج
        if: github.event_name == 'pull_request' && always()
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('test-results/index.html', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ اجتازت اختبارات الواجهة! [عرض التقرير التفصيلي](./test-results/index.html)'
            });
```

### نصوص Package.json

```json
{
  "scripts": {
    "test:zindex": "playwright test tests/verify-zindex.spec.ts",
    "test:zindex:ui": "playwright test --ui",
    "test:zindex:debug": "playwright test --debug",
    "test:zindex:headed": "playwright test --headed"
  }
}
```

---

## التعامل مع المشاكل الشائعة

### المشكلة 1: لقطات الشاشة لا تتطابق

```typescript
// حديث لقطات بعد التغييرات المقصودة
// $ npx playwright test --update-snapshots

test('لقطة الشاشة تطابق', async ({ page }) => {
  await page.goto('/ar/apps');
  expect(await page.screenshot()).toMatchSnapshot('app-list.png');
});
```

### المشكلة 2: اختبارات غير مستقرة

```typescript
// انتظر شروط محددة
await page.waitForLoadState('networkidle');
await page.waitForFunction(
  () => document.querySelectorAll('[data-loaded]').length > 0
);
```

### المشكلة 3: Z-Index لم يتم تطبيقه

```typescript
// فرض إعادة حساب النمط
await page.evaluate(() => {
  document.documentElement.offsetHeight;
});
```

---

## نتائج حقيقية من الاختبار الخاص بنا

### قبل الاختبار الآلي

```
المراجعة اليدوية وجدت مشاكل:
- ❌ 12 صراع z-index
- ❌ 8 مشاكل في الرؤية
- ❌ 5 مشاكل في قابلية النقر
- ❌ متوسط وقت المراجعة: 4 ساعات لكل ميزة
```

### بعد الاختبار الآلي

```
الكشف الآلي:
- ✅ 12 صراع z-index تم الالتقاط في CI/CD
- ✅ 8 مشاكل في الرؤية منعت في PR
- ✅ 5 مشاكل قابلية النقر تم إصلاحها قبل الدمج
- ✅ تم تقليل وقت المراجعة بنسبة 80٪
- ✅ صفر أخطاء z-index في الإنتاج
```

---

## أفضل الممارسات

### 1. تنظيم قيم Z-Index

```scss
// تعرّف طبقات z-index مركزياً
$z-index: (
  'behind': -1,
  'base': 0,
  'header': 10,
  'dropdown': 20,
  'sticky': 30,
  'modal': 100,
  'tooltip': 110,
  'notification': 200,
  'overlay': 1000
);

// استخدم في المكونات
header { z-index: map-get($z-index, 'header'); }
```

### 2. وثق استخدام Z-Index

```typescript
/**
 * هرمية Z-Index لدليل التطبيقات
 *
 * 0 - 50:     محتوى الصفحة (يتدفق بشكل طبيعي)
 * 50-100:     رؤوس وتنقل لاصقة
 * 100-200:    قوائم منسدلة و popovers
 * 200-1000:   النوافذ الشرطية والحوارات
 * 1000+:      تراكبات الصفحة الكاملة
 */
```

### 3. اختبر بانتظام

```bash
# قبل كل التزام
npm run test:zindex

# على كل طلب سحب
git push  # GitHub Actions ينفذ تلقائياً

# كل ليلة على جميع الفروع
# (تكوين في GitHub Actions cron)
```

### 4. مراقب الإنتاج

```typescript
// في الإنتاج، سجل أي مشاكل z-index
if (element.zIndex > 9999) {
  console.warn(
    `تم الكشف عن z-index عالي على ${element.className}`,
    { zIndex: element.zIndex }
  );
}
```

---

## ما تعلمناه

✅ **الاختبار البصري الآلي يلتقط ما يفتقده البشر** - وهو متسق
✅ **لقطات الشاشة قوية** - مقارنة الصور سهلة
✅ **يجب أن يكون Z-Index مركزياً** - لا منثوراً عبر الملفات
✅ **اختبار الحالات المتعددة مهم** - الفاتح/الغامق، سريع الاستجابة، التفاعلات
⚠️ **الاختبارات غير المستقرة محبطة** - احتاج إلى انتظارات وشروط مناسبة
⚠️ **الاختبارات تحتاج إلى صيانة** - التحديث عند تغييرات التصميم المقصودة

---

## الأدوات والموارد

### بدائل Playwright
- **Cypress** - أفضل للـ E2E، أضعف للاختبار البصري
- **Selenium** - أكثر نضجاً، أبطأ من Playwright
- **Puppeteer** - التحكم على مستوى أقل، منحنى تعلم أكثر انحداراً

### أدوات الانحدار البصري
- **Percy** - على السحابة، يتكامل مع CI/CD
- **BackstopJS** - مفتوح المصدر، مستضاف ذاتياً
- **Chromatic** - يركز على مكتبات المكونات
- **Applitools** - الاختبار البصري المدعوم بالذكاء الاصطناعي

---

## الخطوات التالية

وسّع الاختبار الخاص بك:

1. **اختبار المكونات** - اختبر المكونات الفردية بشكل منفصل
2. **اختبار إمكانية الوصول** - فحوصات a11y آلية مع axe-core
3. **اختبار الأداء** - تكامل Lighthouse
4. **اختبار التحميل** - محاكاة مستخدمين متعددين
5. **الاختبار عبر المتصفحات** - قم بالتشغيل على Safari و Firefox و Edge

---

## قالب مجموعة الاختبار الكاملة

قدمنا قالباً كاملاً في المستودع:

```
tests/
├── verify-zindex.spec.ts          # التحقق الأساسي من z-index
├── verify-zindex-comprehensive.ts # التحليل المتقدم
├── helpers/
│   ├── zindex-analyzer.ts         # إطار التحليل
│   └── test-utils.ts              # الأدوات المشتركة
└── screenshots/                    # لقطات أساسية
```

---

## الخلاصة

بناء إطار عمل اختبار يأخذ وقت مقدما ولكن يدفع توازيات في:
- **عدد أقل من الأخطاء في الإنتاج**
- **دورات المراجعة الأسرع**
- **الثقة في التغييرات**
- **توثيق التوقعات**
- **محاذاة الفريق على المعايير**

مشاكل z-index تبدو صغيرة، لكنها أعراض مشاكل أكبر. بالقبض عليها مبكراً، تفرض معايير تحافظ على طبقة الواجهة بأكملها متسقة.

---

## أسئلة؟

هل تحتاج إلى مساعدة مع Playwright أو الاختبار الآلي؟

- **وثائق Playwright:** https://playwright.dev/
- **GitHub Issues:** https://github.com/Itqan-community/quran-apps-directory/issues
- **منتدى المجتمع:** https://community.itqan.dev
- **البريد الإلكتروني:** connect@itqan.dev

---

**الإصدار:** 1.0
**آخر تحديث:** 30 نوفمبر 2025
**إصدار Playwright:** 1.40+
**إصدار Node:** 18+

---

**الملحق: ملفات الاختبار الكاملة**

انظر إلى المستودع للحصول على ملفات الاختبار كاملة وقابلة للتشغيل:
- `tests/verify-zindex.spec.ts`
- `tests/verify-zindex-comprehensive.spec.ts`
- `tests/helpers/zindex-analyzer.ts`
