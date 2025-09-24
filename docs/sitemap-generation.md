# Sitemap Generation Documentation

## Overview

The Quran Apps Directory uses an automated sitemap generation system that creates a comprehensive SEO-optimized `sitemap.xml` file with all pages, apps, categories, and developers.

## Features

- ✅ **Comprehensive Coverage**: 180+ URLs across all content
- ✅ **Bilingual Support**: Arabic and English versions of all pages
- ✅ **SEO Optimized**: Proper priorities and change frequencies
- ✅ **XML Validation**: Proper character escaping and format
- ✅ **Automated**: Integrated into build process
- ✅ **Developer Pages**: Individual pages for all app developers

## Generated URLs

| Section | URLs | Priority | Change Frequency |
|---------|------|----------|------------------|
| Homepage | 2 (ar/en) | 1.0 | weekly |
| Categories | 22 (11 × 2 languages) | 0.9 | weekly |
| Apps | 88 (44 apps × 2 languages) | 0.8 | monthly |
| Developers | 68 (34 developers × 2 languages) | 0.7 | monthly |
| Static Pages | 6 (3 pages × 2 languages) | 0.6 | yearly |
| **Total** | **186 URLs** | | |

## Usage

### Manual Generation
```bash
npm run generate-sitemap
# or
npm run sitemap
# or
node generate-sitemap.js
```

### Automatic Generation (Build Process)
The sitemap is automatically generated before each build:

```bash
npm run build          # Generates sitemap + builds
npm run build:dev      # Generates sitemap + dev build
npm run build:staging  # Generates sitemap + staging build
npm run build:prod     # Generates sitemap + production build
```

## Script Configuration

### File: `generate-sitemap.js`

Key configuration options:

```javascript
const CONFIG = {
  baseUrl: 'https://quran-apps.itqan.dev',
  languages: ['ar', 'en'],
  defaultLanguage: 'en',
  outputPath: 'src/sitemap.xml',
  dataPath: 'src/app/services/applicationsData.ts'
};
```

### Static Pages Configuration

```javascript
const STATIC_PAGES = [
  { path: 'about-us', priority: 0.6, changefreq: 'yearly' },
  { path: 'contact-us', priority: 0.6, changefreq: 'yearly' },
  { path: 'request', priority: 0.6, changefreq: 'yearly' }
];
```

## Data Sources

The script automatically parses:

1. **Applications Data**: `src/app/services/applicationsData.ts`
   - App IDs for individual app pages
   - Developer names for developer pages
   - Category information

2. **Route Configuration**: Based on Angular routing patterns
   - `/:lang/app/:id` for app detail pages
   - `/:lang/developer/:slug` for developer pages  
   - `/:lang/:category` for category pages
   - `/:lang/:page` for static pages

## URL Structure

### Homepage
- `https://quran-apps.itqan.dev/ar`
- `https://quran-apps.itqan.dev/en`

### Categories
- `https://quran-apps.itqan.dev/ar/Mushaf`
- `https://quran-apps.itqan.dev/en/Translations`
- etc.

### Apps
- `https://quran-apps.itqan.dev/ar/app/1_Wahy`
- `https://quran-apps.itqan.dev/en/app/5_Quran`
- etc.

### Developers
- `https://quran-apps.itqan.dev/ar/developer/quran-com`
- `https://quran-apps.itqan.dev/en/developer/tarteel-inc`
- etc.

### Static Pages
- `https://quran-apps.itqan.dev/ar/about-us`
- `https://quran-apps.itqan.dev/en/contact-us`
- etc.

## SEO Features

### Hreflang Support
Homepage URLs include proper hreflang attributes:
```xml
<xhtml:link rel="alternate" hreflang="ar" href="https://quran-apps.itqan.dev/ar"/>
<xhtml:link rel="alternate" hreflang="en" href="https://quran-apps.itqan.dev/en"/>
<xhtml:link rel="alternate" hreflang="x-default" href="https://quran-apps.itqan.dev/en"/>
```

### Priority Structure
- **1.0**: Homepage (highest priority)
- **0.9**: Category pages (high priority)  
- **0.8**: Individual app pages (high priority)
- **0.7**: Developer pages (medium priority)
- **0.6**: Static pages (medium priority)

### Change Frequencies
- **weekly**: Homepage and categories (frequently updated)
- **monthly**: Apps and developers (moderate updates)
- **yearly**: Static pages (rarely updated)

## Character Escaping

The script properly escapes XML special characters:
- `&` → `&amp;`
- `<` → `&lt;`
- `>` → `&gt;`
- `"` → `&quot;`
- `'` → `&#39;`

Example: `6_Rayyaan & Bayaan` becomes `6_Rayyaan &amp; Bayaan`

## Validation

The script includes basic XML validation and provides detailed statistics:

```
📊 Parsed data:
   Apps: 44
   Categories: 11
   Developers: 34

📈 URL Statistics:
   Homepage: 2 URLs
   Categories: 22 URLs
   Apps: 88 URLs
   Developers: 68 URLs
   Static Pages: 6 URLs
   📊 Total: 186 URLs

✅ Sitemap generated successfully!
📁 Output: src/sitemap.xml
📊 Size: 35 KB
🔗 URLs: 186
```

## Troubleshooting

### Common Issues

1. **Parsing Errors**: Ensure `applicationsData.ts` follows expected format
2. **XML Validation**: Check for unescaped special characters
3. **Missing URLs**: Verify data source contains expected applications

### Manual Validation
```bash
# Validate XML format
xmllint --noout src/sitemap.xml

# Check line count  
wc -l src/sitemap.xml

# View first few entries
head -30 src/sitemap.xml
```

## Deployment

The sitemap is automatically included in builds and deployed to:
- **Development**: `dev.quran-apps.itqan.dev/sitemap.xml`
- **Staging**: `staging.quran-apps.itqan.dev/sitemap.xml`  
- **Production**: `quran-apps.itqan.dev/sitemap.xml`

## Maintenance

The script requires no regular maintenance as it automatically:
- Reads current application data
- Updates timestamps to current date
- Handles new apps, categories, or developers
- Maintains proper URL structure and priorities

For adding new static pages, update the `STATIC_PAGES` configuration in the script.
