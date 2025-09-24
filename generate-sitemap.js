#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Sitemap Generator for Quran Apps Directory
 * Automatically generates comprehensive sitemap.xml with all apps, categories, and pages
 */

// Configuration
const CONFIG = {
  baseUrl: 'https://quran-apps.itqan.dev',
  languages: ['ar', 'en'],
  defaultLanguage: 'en',
  outputPath: 'src/sitemap.xml',
  dataPath: 'src/app/services/applicationsData.ts'
};

// Static pages configuration
const STATIC_PAGES = [
  { path: 'about-us', priority: 0.6, changefreq: 'yearly' },
  { path: 'contact-us', priority: 0.6, changefreq: 'yearly' },
  { path: 'request', priority: 0.6, changefreq: 'yearly' }
];

/**
 * Parse TypeScript/JavaScript data file to extract applications and categories
 */
function parseApplicationsData() {
  try {
    const dataContent = fs.readFileSync(CONFIG.dataPath, 'utf8');
    
    // Extract applications array using regex
    const appsMatch = dataContent.match(/export const applicationsData = \[([\s\S]*?)\];/);
    if (!appsMatch) {
      throw new Error('Could not find applicationsData export');
    }
    
    // Extract categories array using regex  
    const categoriesMatch = dataContent.match(/export const categories = \[([\s\S]*?)\];/);
    if (!categoriesMatch) {
      throw new Error('Could not find categories export');
    }
    
    // Parse app IDs
    const appIds = [];
    const appIdMatches = dataContent.matchAll(/"id":\s*"([^"]+)"/g);
    for (const match of appIdMatches) {
      appIds.push(match[1]);
    }
    
    // Parse unique developer names for developer pages
    const developers = new Set();
    const developerMatches = dataContent.matchAll(/"Developer_Name_En":\s*"([^"]+)"/g);
    for (const match of developerMatches) {
      if (match[1] && match[1].trim()) {
        developers.add(match[1].trim());
      }
    }
    
    // Parse category names
    const categories = [];
    const categoryMatches = dataContent.matchAll(/name:\s*"([^"]+)"/g);
    for (const match of categoryMatches) {
      categories.push(match[1]);
    }
    
    console.log(`📊 Parsed data:`);
    console.log(`   Apps: ${appIds.length}`);
    console.log(`   Categories: ${categories.length}`);
    console.log(`   Developers: ${developers.size}`);
    
    return {
      appIds,
      categories,
      developers: Array.from(developers)
    };
    
  } catch (error) {
    console.error('❌ Error parsing applications data:', error.message);
    process.exit(1);
  }
}

/**
 * Create URL slug from string (for developer names)
 */
function createSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
}

/**
 * Escape XML special characters
 */
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Get current date in ISO format for lastmod
 */
function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Generate XML for a single URL entry
 */
function generateUrlEntry(loc, lastmod, changefreq, priority, alternateLinks = null) {
  let entry = `  <url>\n`;
  entry += `    <loc>${escapeXml(loc)}</loc>\n`;
  entry += `    <lastmod>${lastmod}</lastmod>\n`;
  entry += `    <changefreq>${changefreq}</changefreq>\n`;
  entry += `    <priority>${priority}</priority>\n`;
  
  // Add hreflang attributes for bilingual pages
  if (alternateLinks) {
    alternateLinks.forEach(link => {
      entry += `    <xhtml:link rel="alternate" hreflang="${link.hreflang}" href="${escapeXml(link.href)}"/>\n`;
    });
  }
  
  entry += `  </url>\n`;
  return entry;
}

/**
 * Generate hreflang links for bilingual pages
 */
function generateHreflangLinks(basePath) {
  return [
    { hreflang: 'ar', href: `${CONFIG.baseUrl}/ar${basePath}` },
    { hreflang: 'en', href: `${CONFIG.baseUrl}/en${basePath}` },
    { hreflang: 'x-default', href: `${CONFIG.baseUrl}/en${basePath}` }
  ];
}

/**
 * Generate complete sitemap XML
 */
function generateSitemap(data) {
  const currentDate = getCurrentDate();
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n\n`;
  
  console.log('🔨 Generating sitemap sections...');
  
  // 1. Homepage URLs (Priority 1.0)
  sitemap += `  <!-- Homepage URLs - Priority 1.0 -->\n`;
  CONFIG.languages.forEach(lang => {
    const hreflangLinks = generateHreflangLinks('');
    sitemap += generateUrlEntry(
      `${CONFIG.baseUrl}/${lang}`,
      currentDate,
      'weekly',
      '1.0',
      hreflangLinks
    );
  });
  sitemap += '\n';
  
  // 2. Category Pages (Priority 0.9)
  sitemap += `  <!-- Category Pages - Priority 0.9 -->\n`;
  data.categories.forEach(category => {
    CONFIG.languages.forEach(lang => {
      sitemap += generateUrlEntry(
        `${CONFIG.baseUrl}/${lang}/${category}`,
        currentDate,
        'weekly',
        '0.9'
      );
    });
  });
  sitemap += '\n';
  
  // 3. Individual App Pages (Priority 0.8)
  sitemap += `  <!-- Individual App Pages - Priority 0.8 -->\n`;
  data.appIds.forEach(appId => {
    CONFIG.languages.forEach(lang => {
      sitemap += generateUrlEntry(
        `${CONFIG.baseUrl}/${lang}/app/${appId}`,
        currentDate,
        'monthly',
        '0.8'
      );
    });
  });
  sitemap += '\n';
  
  // 4. Developer Pages (Priority 0.7)
  sitemap += `  <!-- Developer Pages - Priority 0.7 -->\n`;
  data.developers.forEach(developer => {
    const developerSlug = createSlug(developer);
    CONFIG.languages.forEach(lang => {
      sitemap += generateUrlEntry(
        `${CONFIG.baseUrl}/${lang}/developer/${developerSlug}`,
        currentDate,
        'monthly',
        '0.7'
      );
    });
  });
  sitemap += '\n';
  
  // 5. Static Pages (Priority 0.6)
  sitemap += `  <!-- Static Pages - Priority 0.6 -->\n`;
  STATIC_PAGES.forEach(page => {
    CONFIG.languages.forEach(lang => {
      sitemap += generateUrlEntry(
        `${CONFIG.baseUrl}/${lang}/${page.path}`,
        currentDate,
        page.changefreq,
        page.priority.toString()
      );
    });
  });
  
  sitemap += `</urlset>\n`;
  
  return sitemap;
}

/**
 * Calculate total URLs and provide statistics
 */
function calculateStats(data) {
  const stats = {
    homepage: CONFIG.languages.length, // 2
    categories: data.categories.length * CONFIG.languages.length, // 11 * 2 = 22
    apps: data.appIds.length * CONFIG.languages.length, // 29 * 2 = 58
    developers: data.developers.length * CONFIG.languages.length, // ~44 * 2 = ~88
    staticPages: STATIC_PAGES.length * CONFIG.languages.length, // 3 * 2 = 6
  };
  
  stats.total = stats.homepage + stats.categories + stats.apps + stats.developers + stats.staticPages;
  
  return stats;
}

/**
 * Main execution function
 */
function main() {
  console.log('🚀 Starting sitemap generation...\n');
  
  try {
    // Parse data
    const data = parseApplicationsData();
    
    // Calculate statistics
    const stats = calculateStats(data);
    console.log(`\n📈 URL Statistics:`);
    console.log(`   Homepage: ${stats.homepage} URLs`);
    console.log(`   Categories: ${stats.categories} URLs`);
    console.log(`   Apps: ${stats.apps} URLs`);
    console.log(`   Developers: ${stats.developers} URLs`);
    console.log(`   Static Pages: ${stats.staticPages} URLs`);
    console.log(`   📊 Total: ${stats.total} URLs`);
    
    // Generate sitemap
    const sitemapXml = generateSitemap(data);
    
    // Write to file
    fs.writeFileSync(CONFIG.outputPath, sitemapXml, 'utf8');
    
    // Validate XML (basic check)
    if (sitemapXml.includes('<?xml') && sitemapXml.includes('</urlset>')) {
      console.log(`\n✅ Sitemap generated successfully!`);
      console.log(`📁 Output: ${CONFIG.outputPath}`);
      console.log(`📊 Size: ${Math.round(sitemapXml.length / 1024)} KB`);
      console.log(`🔗 URLs: ${stats.total}`);
    } else {
      throw new Error('Generated XML appears to be invalid');
    }
    
  } catch (error) {
    console.error('\n❌ Sitemap generation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, parseApplicationsData, generateSitemap };
