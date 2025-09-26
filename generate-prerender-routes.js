#!/usr/bin/env node

/**
 * Generate routes for Angular SSG prerendering
 * This script reads the applications data and generates all possible routes
 * for static site generation
 */

const fs = require('fs');
const path = require('path');

// Read the applications data
function getApplicationsData() {
  try {
    const applicationsDataPath = path.join(__dirname, 'src/app/services/applicationsData.ts');
    const fileContent = fs.readFileSync(applicationsDataPath, 'utf-8');
    
    // Extract applications data from the TypeScript file
    const applicationsMatch = fileContent.match(/export const applicationsData = (\[[\s\S]*?\]);/);
    if (!applicationsMatch) {
      throw new Error('Could not find applicationsData export');
    }
    
    // Convert to JSON-like format for parsing
    let dataString = applicationsMatch[1]
      .replace(/'/g, '"')
      .replace(/(\w+):/g, '"$1":')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');
    
    try {
      return JSON.parse(dataString);
    } catch (parseError) {
      console.warn('Could not parse applications data with JSON.parse, using fallback method');
      return extractApplicationIds(fileContent);
    }
  } catch (error) {
    console.error('Error reading applications data:', error);
    return [];
  }
}

// Fallback method to extract just the IDs
function extractApplicationIds(fileContent) {
  const idMatches = fileContent.match(/"id":\s*"([^"]+)"/g);
  if (!idMatches) return [];
  
  return idMatches.map(match => {
    const id = match.match(/"id":\s*"([^"]+)"/)[1];
    return { id };
  });
}

// Get categories
function getCategories() {
  try {
    const applicationsDataPath = path.join(__dirname, 'src/app/services/applicationsData.ts');
    const fileContent = fs.readFileSync(applicationsDataPath, 'utf-8');
    
    // Extract categories from the file
    const categoriesMatch = fileContent.match(/export const categories = (\[[\s\S]*?\]);/);
    if (!categoriesMatch) {
      // Fallback to common categories if not found
      return [
        { name: 'mushaf' },
        { name: 'tafsir' },
        { name: 'translations' },
        { name: 'audio' },
        { name: 'recite' },
        { name: 'kids' },
        { name: 'riwayat' },
        { name: 'tajweed' },
        { name: 'memorize' },
        { name: 'all' }
      ];
    }
    
    // Extract category names
    const nameMatches = categoriesMatch[1].match(/name:\s*"([^"]+)"/g);
    if (!nameMatches) return [];
    
    return nameMatches.map(match => {
      const name = match.match(/name:\s*"([^"]+)"/)[1];
      return { name };
    });
  } catch (error) {
    console.error('Error reading categories:', error);
    return [];
  }
}

function generateRoutes() {
  const applications = getApplicationsData();
  const categories = getCategories();
  const languages = ['en', 'ar'];
  const routes = [];

  console.log(`Found ${applications.length} applications and ${categories.length} categories`);

  // Base routes
  routes.push('/', '/en', '/ar');

  // Category routes
  categories.forEach(category => {
    languages.forEach(lang => {
      routes.push(`/${lang}/${category.name}`);
    });
  });

  // Application detail routes
  applications.forEach(app => {
    languages.forEach(lang => {
      routes.push(`/${lang}/app/${app.id}`);
    });
  });

  // Static page routes
  const staticPages = ['about-us', 'contact-us', 'request'];
  staticPages.forEach(page => {
    languages.forEach(lang => {
      routes.push(`/${lang}/${page}`);
    });
  });

  // Developer pages (extract unique developers)
  const developers = new Set();
  applications.forEach(app => {
    if (app.Developer_Name_En) {
      developers.add(encodeURIComponent(app.Developer_Name_En));
    }
    if (app.Developer_Name_Ar) {
      developers.add(encodeURIComponent(app.Developer_Name_Ar));
    }
  });

  developers.forEach(developer => {
    languages.forEach(lang => {
      routes.push(`/${lang}/developer/${developer}`);
    });
  });

  // Remove duplicates and sort
  const uniqueRoutes = [...new Set(routes)].sort();
  
  console.log(`Generated ${uniqueRoutes.length} routes for prerendering`);
  
  return uniqueRoutes;
}

function updateAngularConfig() {
  const configPath = path.join(__dirname, 'angular.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  
  const routes = generateRoutes();
  
  // Add prerender configuration
  if (!config.projects.demo.architect.prerender) {
    config.projects.demo.architect.prerender = {
      "builder": "@angular-devkit/build-angular:prerender",
      "options": {
        "routes": routes
      },
      "configurations": {
        "production": {
          "buildTarget": "demo:build:production"
        },
        "development": {
          "buildTarget": "demo:build:development"
        },
        "staging": {
          "buildTarget": "demo:build:staging"
        }
      }
    };
  } else {
    // Update existing prerender configuration
    config.projects.demo.architect.prerender.options.routes = routes;
  }
  
  // Write back to file
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('Updated angular.json with prerender routes');
}

function generateRoutesFile() {
  const routes = generateRoutes();
  const routesContent = `// Auto-generated routes for prerendering
// Generated on ${new Date().toISOString()}
export const prerenderRoutes = ${JSON.stringify(routes, null, 2)};
`;
  
  fs.writeFileSync(path.join(__dirname, 'prerender-routes.ts'), routesContent);
  console.log('Generated prerender-routes.ts');
}

// Main execution
if (require.main === module) {
  console.log('Generating prerender routes...');
  generateRoutesFile();
  updateAngularConfig();
  console.log('Route generation completed!');
}

module.exports = {
  generateRoutes,
  updateAngularConfig,
  generateRoutesFile
};
