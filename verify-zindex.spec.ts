import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const screenshotDir = './test-screenshots';

// Ensure screenshot directory exists
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

test.describe('App Icon Z-Index Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport to desktop size
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test('should verify app icons are visible on app list page', async ({ page }) => {
    console.log('\n=== Test 1: App List Page ===');

    // Navigate to the app list page
    await page.goto('http://localhost:4200/en', { waitUntil: 'networkidle' });

    // Wait for Angular to load - look for any content
    await page.waitForTimeout(3000);

    // Take a full page screenshot first to see what's rendered
    await page.screenshot({
      path: path.join(screenshotDir, '01-app-list-page.png'),
      fullPage: true
    });
    console.log('✓ Screenshot saved: 01-app-list-page.png');

    // Get page content to analyze structure
    const bodyHTML = await page.locator('body').innerHTML();
    const hasContent = bodyHTML.length > 100;
    console.log(`✓ Page loaded with ${bodyHTML.length} characters of HTML`);

    // Try to find app-related elements with various possible selectors
    const possibleSelectors = [
      'app-card',
      '.app-card',
      '[class*="app"]',
      'img[class*="icon"]',
      '.card',
      'nz-card',
      '[nz-card]'
    ];

    for (const selector of possibleSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✓ Found ${count} elements matching: ${selector}`);
      }
    }

    // Look for any images
    const allImages = await page.locator('img').count();
    console.log(`✓ Total images on page: ${allImages}`);

    if (allImages > 0) {
      // Analyze first few images
      const images = await page.locator('img').all();
      for (let i = 0; i < Math.min(5, images.length); i++) {
        const img = images[i];
        const src = await img.getAttribute('src');
        const className = await img.getAttribute('class');
        const styles = await img.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            zIndex: computed.zIndex,
            position: computed.position,
            display: computed.display
          };
        });
        console.log(`  Image ${i + 1}: src=${src}, class=${className}, styles=${JSON.stringify(styles)}`);
      }
    }
  });

  test('should verify app icons on app detail page', async ({ page }) => {
    console.log('\n=== Test 2: App Detail Page ===');

    // Navigate to a specific app detail page
    await page.goto('http://localhost:4200/en/app/35-study%20quran', { waitUntil: 'networkidle' });

    // Wait for Angular to load
    await page.waitForTimeout(3000);

    // Take a screenshot of the top of the page
    await page.screenshot({
      path: path.join(screenshotDir, '02-app-detail-top.png'),
      fullPage: false
    });
    console.log('✓ Screenshot saved: 02-app-detail-top.png');

    // Get all images on the page
    const allImages = await page.locator('img').count();
    console.log(`✓ Total images on detail page: ${allImages}`);

    // Look for similar apps or related content
    const h3Elements = await page.locator('h3').all();
    console.log(`✓ Found ${h3Elements.length} h3 elements`);

    for (const h3 of h3Elements) {
      const text = await h3.textContent();
      console.log(`  H3: "${text}"`);
    }

    // Scroll down to see more content
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(1000);

    // Take another screenshot after scrolling
    await page.screenshot({
      path: path.join(screenshotDir, '03-app-detail-scrolled.png'),
      fullPage: false
    });
    console.log('✓ Screenshot saved: 03-app-detail-scrolled.png');

    // Take full page screenshot
    await page.screenshot({
      path: path.join(screenshotDir, '04-app-detail-fullpage.png'),
      fullPage: true
    });
    console.log('✓ Screenshot saved: 04-app-detail-fullpage.png');
  });

  test('should analyze z-index values of all images', async ({ page }) => {
    console.log('\n=== Test 3: Z-Index Analysis ===');

    // Test on list page
    await page.goto('http://localhost:4200/en', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const listPageZIndexData = await page.locator('img').evaluateAll((images) => {
      return images.map((img, index) => {
        const styles = window.getComputedStyle(img);
        const rect = img.getBoundingClientRect();
        return {
          index: index + 1,
          src: img.src?.substring(img.src.lastIndexOf('/') + 1) || 'unknown',
          className: img.className,
          zIndex: styles.zIndex,
          position: styles.position,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          isVisible: rect.width > 0 && rect.height > 0
        };
      });
    });

    console.log('\n📊 List Page Image Z-Index Analysis:');
    listPageZIndexData.forEach(data => {
      console.log(`  ${data.index}. ${data.src}`);
      console.log(`     Class: ${data.className || 'none'}`);
      console.log(`     Z-Index: ${data.zIndex}, Position: ${data.position}`);
      console.log(`     Size: ${data.width}x${data.height}, Visible: ${data.isVisible}`);
    });

    // Test on detail page
    await page.goto('http://localhost:4200/en/app/35-study%20quran', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const detailPageZIndexData = await page.locator('img').evaluateAll((images) => {
      return images.map((img, index) => {
        const styles = window.getComputedStyle(img);
        const rect = img.getBoundingClientRect();
        return {
          index: index + 1,
          src: img.src?.substring(img.src.lastIndexOf('/') + 1) || 'unknown',
          className: img.className,
          zIndex: styles.zIndex,
          position: styles.position,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          isVisible: rect.width > 0 && rect.height > 0
        };
      });
    });

    console.log('\n📊 Detail Page Image Z-Index Analysis:');
    detailPageZIndexData.forEach(data => {
      console.log(`  ${data.index}. ${data.src}`);
      console.log(`     Class: ${data.className || 'none'}`);
      console.log(`     Z-Index: ${data.zIndex}, Position: ${data.position}`);
      console.log(`     Size: ${data.width}x${data.height}, Visible: ${data.isVisible}`);
    });

    // Save analysis report
    const report = {
      timestamp: new Date().toISOString(),
      listPage: {
        url: 'http://localhost:4200/en',
        images: listPageZIndexData
      },
      detailPage: {
        url: 'http://localhost:4200/en/app/35-study%20quran',
        images: detailPageZIndexData
      }
    };

    const reportPath = path.join(screenshotDir, 'zindex-analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✓ Report saved: ${reportPath}`);

    // Analysis summary
    const iconImages = detailPageZIndexData.filter(img =>
      img.className?.includes('icon') ||
      img.src?.includes('icon') ||
      (img.width < 200 && img.height < 200)
    );

    const screenshotImages = detailPageZIndexData.filter(img =>
      img.className?.includes('screenshot') ||
      img.src?.includes('screenshot') ||
      (img.width > 200 || img.height > 200)
    );

    console.log('\n📋 Summary:');
    console.log(`  Potential app icon images: ${iconImages.length}`);
    console.log(`  Potential screenshot images: ${screenshotImages.length}`);

    if (iconImages.length > 0 && screenshotImages.length > 0) {
      const iconZIndexes = iconImages.map(i => parseInt(i.zIndex) || 0);
      const screenshotZIndexes = screenshotImages.map(i => parseInt(i.zIndex) || 0);

      const maxIconZ = Math.max(...iconZIndexes);
      const maxScreenshotZ = Math.max(...screenshotZIndexes);

      console.log(`  Max icon z-index: ${maxIconZ}`);
      console.log(`  Max screenshot z-index: ${maxScreenshotZ}`);

      if (maxIconZ >= maxScreenshotZ) {
        console.log('  ✅ Icons have higher or equal z-index than screenshots');
      } else {
        console.log('  ❌ Icons have lower z-index than screenshots');
      }
    }
  });
});
