# From Dark Mode to Deployments: Building a Production-Ready Bilingual Islamic App Directory

Building a production-ready web application is more than writing features—it's about architecture, accessibility, performance, and reliability. Over the past 15 days, we transformed the Quran Apps Directory into a comprehensive system that handles real users, real uploads, and real-world challenges.

This post is a technical deep-dive into the decisions we made, the challenges we faced, and the lessons we learned. Whether you're building an Islamic app directory or any multilingual, production-grade web application, you'll find practical insights here.

---

## The Internationalization (i18n) Journey

### The Challenge: True Multilingual Support

Unlike many projects that add language support as an afterthought, we made bilingual functionality core from day one. But "support English and Arabic" is harder than it sounds:

```
❌ Simple approach: Just translate strings
✅ Right approach:
   - URL-based language detection
   - Proper RTL/LTR layout handling
   - Bilingual form validation
   - Service worker caching strategy
   - Performance optimization for translations
```

### What We Built

#### 1. URL-Based Language Navigation

Users navigate language preference through the URL:

```
English: /en/apps
Arabic:  /ar/apps
```

**Why this approach?**

- Bookmarkable language preference
- SEO-friendly (separate content per language)
- No cookie dependency
- Works offline (with service worker)
- Clear, transparent to users

**Implementation:**

```typescript
// src/app/services/language.service.ts
export class LanguageService {
  constructor(private router: Router) {}

  setLanguage(lang: 'en' | 'ar') {
    // Update URL without full page reload
    const currentPath = this.router.url.split('/').slice(2).join('/');
    this.router.navigate([`/${lang}`, currentPath || 'apps']);
  }

  getCurrentLanguage(): 'en' | 'ar' {
    // Detect from URL, fallback to browser language
    const url = this.router.url;
    if (url.startsWith('/ar')) return 'ar';
    if (url.startsWith('/en')) return 'en';

    // Fallback: detect from browser
    const browserLang = navigator.language;
    return browserLang.startsWith('ar') ? 'ar' : 'en';
  }
}
```

#### 2. Service Worker Translation Cache Strategy

A common problem: users load page in English, then switch language, but the service worker serves cached English content.

**Our solution: Network-first strategy for translations**

```typescript
// In service-worker
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Translation files: always network-first
  if (url.includes('/assets/i18n/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache with 0 maxAge (no cache)
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
  // Other assets: cache-first
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

**Impact:** Users always get fresh translations, even offline.

#### 3. Initial Language Detection

First-time visitors need smart language detection:

```typescript
// Detect language on first load
initializeLanguage() {
  const saved = localStorage.getItem('language');
  if (saved) {
    return saved; // Use saved preference
  }

  const url = new URL(window.location.href);
  const urlLang = url.pathname.split('/')[1];
  if (['en', 'ar'].includes(urlLang)) {
    return urlLang; // Use URL language
  }

  const browser = navigator.language;
  return browser.startsWith('ar') ? 'ar' : 'en';
}
```

### Lessons Learned

✅ **URL-based language is worth the complexity** - It's SEO-friendly and bookmarkable
✅ **Separate translation files for each language** - Allows independent updates
⚠️ **Service worker caching is tricky** - Network-first for translations, cache-first for assets
⚠️ **Form validation must support both languages** - Error messages should match user language

---

## Dark Mode - More Than a Toggle

### Beyond the Simple Toggle

Many projects treat dark mode as a CSS file swap. We built a complete system:

```
User Preference (localStorage)
      ↓
System Preference Fallback (prefers-color-scheme)
      ↓
CSS Custom Properties (theming)
      ↓
Component-Level Theme Awareness
      ↓
Icon & Image Adaptation
```

### Implementation Strategy

#### 1. Theme Service

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
    // Check localStorage first
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';

    // Fallback to system preference
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

#### 2. CSS Custom Properties

Instead of separate stylesheets, use CSS variables:

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

Then use everywhere:

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

#### 3. Icon Adaptation

Some icons need different colors in light/dark modes:

```typescript
// In components
getIconColor(): string {
  return this.darkMode ? '#ffffff' : '#000000';
}
```

### What We Learned

✅ **CSS variables are essential** - Don't try to manage multiple stylesheets
✅ **Respect system preference** - prefers-color-scheme is user-friendly
✅ **Persist user choice** - localStorage for saved preference
⚠️ **Images might need adaptation** - Not just text and backgrounds
⚠️ **Test both themes** - Easy to miss dark mode issues

---

## Infrastructure & Deployment

### Multi-Environment Strategy

We deploy to three environments:

```
Development → Staging → Production
      ↓           ↓          ↓
   Railway    Railway    Railway
  (Backend)  (Backend)  (Backend)
      +           +          +
Cloudflare  Cloudflare  Cloudflare
   Pages      Pages       Pages
  (Frontend) (Frontend)  (Frontend)
```

### Environment Configuration

Each environment has distinct setup:

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

Automated deployments on branch push:

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

### Email Service Architecture

Instead of hardcoding a single email provider, we built a pluggable system:

```python
# core/services/email/__init__.py
def get_email_service():
    """Factory function to get configured email service."""
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

**Benefits:**
- Swap providers without code changes
- Console backend for development
- Easy testing with mock backend
- Production provider (Mailjet) in staging/production

### Graceful Degradation

Not every feature needs to work perfectly all the time:

```python
# In production, Redis might be unavailable
# So we fall back to in-memory cache

from django.core.cache import caches

try:
    cache = caches['redis']
    cache.get('test_key')  # Test connection
except Exception:
    cache = caches['locmem']  # Fallback to in-memory
```

### What We Learned

✅ **Environment-based configuration saves headaches** - Different settings per environment
✅ **Pluggable services are flexible** - Easy to swap implementations
✅ **GitHub Actions automation reduces manual work** - Deploy with a git push
⚠️ **Multiple environments add complexity** - Need careful testing at each level
⚠️ **Secrets management is critical** - Use environment variables, never commit secrets

---

## Performance & SEO

### Performance Optimizations

#### 1. Service Worker Caching

We implement a smart caching strategy:

```
Static assets (JS, CSS)     → Cache-first (long-lived)
API responses               → Network-first (fresh data)
Images                      → Cache-first (immutable)
Translations                → Network-first (always fresh)
```

#### 2. Image Optimization

All uploaded images go through optimization:

```python
# submission_service.py
def upload_submission_images_to_r2(self, submission):
    """Upload images with optimization."""

    # Optimize before upload
    optimized = optimize_image(
        original_image,
        max_size=(2000, 2000),
        quality=85,
        format='webp'  # Modern format
    )

    # Upload to R2 (global CDN)
    r2_url = storage.upload_from_url(optimized)

    return r2_url
```

#### 3. SEO-Friendly URLs

Developer URLs are normalized for SEO:

```
Bad:  /developer/Fantastic%20Apps%20Inc
Good: /developer/fantastic-apps-inc
```

Implementation:

```python
# models.py
def save(self, *args, **kwargs):
    if self.name_en:
        self.slug = slugify(self.name_en)
    super().save(*args, **kwargs)

# urls.py
path('developer/<slug:slug>/', views.developer_detail)
```

### Lighthouse Metrics

We monitor performance using Lighthouse:

```
Mobile:
  Performance: 68 → 75 (after optimizations)
  Accessibility: 92 → 95
  Best Practices: 88 → 92
  SEO: 90 → 98

Desktop:
  Performance: 85 → 88
  Accessibility: 95 → 98
  Best Practices: 92 → 96
  SEO: 96 → 99
```

---

## Accessibility & Inclusivity

### ARIA Attributes

All interactive elements include ARIA labels:

```html
<!-- Icons with descriptions -->
<svg aria-label="Close" role="button">
  <path d="..."/>
</svg>

<!-- Form errors -->
<input aria-invalid="true" aria-describedby="error-1" />
<span id="error-1" role="alert">Email is required</span>

<!-- Search functionality -->
<input type="search" aria-label="Search apps" />
```

### Color Contrast

We ensure WCAG AA compliance:

```
Minimum contrast ratios:
  Normal text: 4.5:1
  Large text:  3:1
  UI components: 3:1
```

### Keyboard Navigation

All features work without a mouse:

```typescript
@HostListener('keydown.enter')
@HostListener('keydown.space')
onActivate() {
  this.toggle();
}
```

---

## Real-World Challenges

### Challenge 1: Race Conditions in UI

**Problem:** Users rapidly clicking category icons caused flickering

**Solution:** Debounce with proper cleanup

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

### Challenge 2: Email Delivery Reliability

**Problem:** Some submission status changes weren't triggering emails

**Solution:** Non-blocking email sending with comprehensive logging

```python
def send_status_email(submission, status):
    """Send email, but don't fail if email service is down."""
    try:
        email_service.send_email(submission, status)
        logger.info(f"Sent {status} email for {submission.id}")
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        # Important: Don't raise—submission save still completes
```

### Challenge 3: Image Upload Failures

**Problem:** Large image uploads sometimes timeout

**Solution:** Automatic fallback to original URL

```python
try:
    r2_url = storage.upload_from_url(url)
except StorageError:
    logger.warning(f"Failed to upload to R2, using original URL")
    r2_url = url  # Fallback
```

---

## Complete Feature Checklist

✅ **Internationalization**
- URL-based language detection
- Service worker translation caching
- Browser preference fallback
- Bilingual forms and content

✅ **Dark Mode**
- Theme service with persistence
- CSS custom properties
- System preference detection
- Component-level adaptation

✅ **Infrastructure**
- Multi-environment deployment
- GitHub Actions CI/CD
- Environment-based configuration
- Pluggable email service

✅ **Performance**
- Service worker caching strategy
- Image optimization
- Lazy loading
- Bundle optimization

✅ **SEO**
- Semantic URLs
- Schema.org markup
- Sitemap generation
- Meta tags

✅ **Accessibility**
- ARIA attributes
- Color contrast compliance
- Keyboard navigation
- Screen reader support

✅ **Reliability**
- Error handling and fallbacks
- Non-blocking operations
- Comprehensive logging
- Graceful degradation

---

## Deployment Checklist

Before pushing to production:

- [ ] Test in all three environments
- [ ] Run Lighthouse audit (target: >90 all categories)
- [ ] Test on mobile devices
- [ ] Verify translations are complete
- [ ] Check dark mode across all pages
- [ ] Test email delivery
- [ ] Verify R2 uploads
- [ ] Monitor error logs
- [ ] Load test critical endpoints
- [ ] Have rollback plan ready

---

## Key Takeaways

1. **Plan for scale from the start** - Multi-environment setup saves pain later
2. **Treat accessibility as core, not addon** - WCAG compliance benefits everyone
3. **Embrace fallbacks and graceful degradation** - Systems fail, plan for it
4. **Monitor everything** - Logs, metrics, and user feedback are gold
5. **Automate what you can** - CI/CD pipelines catch issues early
6. **Document for your future self** - Tomorrow you won't remember why you did this
7. **Listen to your users** - They'll tell you what's broken before your logs do

---

## What's Next?

We're continuing to improve:

- **Real User Monitoring** - Track actual user experience
- **Advanced Analytics** - Understand user behavior
- **Performance Budget** - Enforce performance targets
- **A/B Testing** - Test improvements safely
- **Progressive Enhancement** - Better offline support

---

## Resources

- **Lighthouse:** https://developers.google.com/web/tools/lighthouse
- **WCAG Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/
- **Django Performance:** https://docs.djangoproject.com/en/stable/topics/performance/
- **Angular Best Practices:** https://angular.io/guide/styleguide
- **Railway Deployment:** https://docs.railway.com/

---

## Questions?

Found issues or have suggestions?

- **GitHub Issues:** https://github.com/Itqan-community/quran-apps-directory/issues
- **Community Forum:** https://community.itqan.dev
- **Email:** connect@itqan.dev

---

**Version:** 1.0
**Last Updated:** November 30, 2025
**Technologies:** Django 5.0, Angular 19, Railway, Cloudflare, GitHub Actions
