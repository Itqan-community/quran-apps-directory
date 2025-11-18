import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const screenshotDir = './test-screenshots';

// Ensure screenshot directory exists
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

test.describe('Comprehensive App Icon Z-Index Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport to desktop size
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Listen for console messages
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        console.log(`[Browser ${type}]:`, msg.text());
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      console.log('[Page Error]:', error.message);
    });
  });

  test('comprehensive verification with console logging', async ({ page }) => {
    console.log('\n=== Comprehensive Z-Index Verification ===\n');

    // Navigate to the app list page
    console.log('1. Loading app list page...');
    await page.goto('http://localhost:4200/en');

    // Wait for Angular to bootstrap
    await page.waitForTimeout(5000);

    // Check for error messages on page
    const errorMessages = await page.locator('[class*="error"], [class*="alert"]').allTextContents();
    if (errorMessages.length > 0) {
      console.log('⚠ Error messages on page:', errorMessages);
    }

    // Take initial screenshot
    await page.screenshot({
      path: path.join(screenshotDir, 'comprehensive-01-initial.png'),
      fullPage: true
    });
    console.log('✓ Screenshot saved: comprehensive-01-initial.png');

    // Wait a bit more for any delayed loading
    await page.waitForTimeout(3000);

    // Take another screenshot after waiting
    await page.screenshot({
      path: path.join(screenshotDir, 'comprehensive-02-after-wait.png'),
      fullPage: true
    });
    console.log('✓ Screenshot saved: comprehensive-02-after-wait.png');

    // Analyze all elements on the page
    const elementAnalysis = await page.evaluate(() => {
      const allElements: any[] = [];
      const elements = document.querySelectorAll('*');

      elements.forEach((el, index) => {
        const tagName = el.tagName.toLowerCase();
        const classes = el.className;

        // Only track relevant elements
        if (
          tagName === 'img' ||
          (typeof classes === 'string' && (
            classes.includes('app') ||
            classes.includes('card') ||
            classes.includes('icon') ||
            classes.includes('screenshot')
          ))
        ) {
          const styles = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();

          allElements.push({
            tagName,
            className: typeof classes === 'string' ? classes : '',
            id: el.id,
            zIndex: styles.zIndex,
            position: styles.position,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            isVisible: rect.width > 0 && rect.height > 0,
            src: tagName === 'img' ? (el as HTMLImageElement).src : undefined
          });
        }
      });

      return allElements;
    });

    console.log('\n2. Element Analysis:');
    console.log(`   Found ${elementAnalysis.length} relevant elements`);

    elementAnalysis.forEach((el, i) => {
      console.log(`\n   Element ${i + 1}:`);
      console.log(`     Tag: ${el.tagName}`);
      console.log(`     Class: ${el.className || 'none'}`);
      console.log(`     ID: ${el.id || 'none'}`);
      console.log(`     Z-Index: ${el.zIndex}, Position: ${el.position}`);
      console.log(`     Size: ${el.width}x${el.height}, Visible: ${el.isVisible}`);
      if (el.src) {
        const srcParts = el.src.split('/');
        console.log(`     Src: ${srcParts[srcParts.length - 1]}`);
      }
    });

    // Try to navigate to a specific app by constructing URL from known data
    console.log('\n3. Attempting to navigate to app detail page...');

    // First, let's check if we're using the correct routing
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);

    // Try different app URLs based on common patterns
    const testUrls = [
      'http://localhost:4200/en/app/1',
      'http://localhost:4200/en/apps/1',
      'http://localhost:4200/en/application/1',
      'http://localhost:4200/app/1'
    ];

    for (const testUrl of testUrls) {
      console.log(`\n   Trying: ${testUrl}`);
      await page.goto(testUrl);
      await page.waitForTimeout(3000);

      const pageText = await page.locator('body').textContent();
      const hasAppContent = pageText && (
        pageText.includes('Download') ||
        pageText.includes('Screenshot') ||
        pageText.includes('Similar') ||
        pageText.includes('Rating')
      );

      if (hasAppContent) {
        console.log(`   ✓ Found app content at: ${testUrl}`);

        await page.screenshot({
          path: path.join(screenshotDir, 'comprehensive-03-app-detail.png'),
          fullPage: true
        });
        console.log('   ✓ Screenshot saved: comprehensive-03-app-detail.png');

        // Analyze images on this page
        const detailImages = await page.locator('img').evaluateAll((images) => {
          return images.map((img) => {
            const styles = window.getComputedStyle(img);
            const rect = img.getBoundingClientRect();
            return {
              src: img.src.substring(img.src.lastIndexOf('/') + 1),
              className: img.className,
              zIndex: styles.zIndex,
              position: styles.position,
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              isVisible: rect.width > 0 && rect.height > 0
            };
          });
        });

        console.log(`\n   Found ${detailImages.length} images on detail page:`);
        detailImages.forEach((img, i) => {
          console.log(`     ${i + 1}. ${img.src}`);
          console.log(`        Class: ${img.className || 'none'}`);
          console.log(`        Z-Index: ${img.zIndex}, Position: ${img.position}`);
          console.log(`        Size: ${img.width}x${img.height}`);
        });

        break;
      } else {
        console.log(`   ✗ No app content found at: ${testUrl}`);
      }
    }

    // Generate final report
    const report = {
      timestamp: new Date().toISOString(),
      analysis: {
        elementsFound: elementAnalysis.length,
        elements: elementAnalysis
      },
      recommendations: [] as string[]
    };

    // Analyze for z-index issues
    const iconElements = elementAnalysis.filter(el =>
      el.className.includes('icon') ||
      (el.tagName === 'img' && el.width < 200 && el.height < 200)
    );

    const screenshotElements = elementAnalysis.filter(el =>
      el.className.includes('screenshot') ||
      (el.tagName === 'img' && (el.width > 200 || el.height > 200))
    );

    console.log('\n4. Z-Index Analysis:');
    console.log(`   Icon-like elements: ${iconElements.length}`);
    console.log(`   Screenshot-like elements: ${screenshotElements.length}`);

    if (iconElements.length > 0 && screenshotElements.length > 0) {
      const iconZIndexes = iconElements.map(e => parseInt(e.zIndex) || 0);
      const screenshotZIndexes = screenshotElements.map(e => parseInt(e.zIndex) || 0);

      const maxIconZ = Math.max(...iconZIndexes);
      const maxScreenshotZ = Math.max(...screenshotZIndexes);

      console.log(`   Max icon z-index: ${maxIconZ}`);
      console.log(`   Max screenshot z-index: ${maxScreenshotZ}`);

      if (maxIconZ >= maxScreenshotZ) {
        console.log('   ✅ Icons have higher or equal z-index than screenshots');
        report.recommendations.push('Z-index layering is correct');
      } else {
        console.log('   ❌ Icons have lower z-index than screenshots');
        report.recommendations.push('ISSUE: Icons have lower z-index than screenshots');
        report.recommendations.push(`Recommended fix: Set icon z-index to at least ${maxScreenshotZ + 1}`);
      }
    } else if (iconElements.length === 0 && screenshotElements.length === 0) {
      console.log('   ⚠ No app icons or screenshots found on page');
      report.recommendations.push('WARNING: No app icons or screenshots detected');
      report.recommendations.push('This may indicate a data loading issue');
    }

    // Save report
    const reportPath = path.join(screenshotDir, 'comprehensive-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✓ Comprehensive report saved: ${reportPath}`);

    console.log('\n=== Verification Complete ===\n');
  });
});
