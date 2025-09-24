#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/**
 * Post-build script to generate compressed assets (gzip and brotli)
 * This enables better compression on supported servers
 */

const distPath = 'dist';
const extensions = ['.js', '.css', '.html', '.json', '.svg'];

function compressFile(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  
  // Generate gzip version
  const gzipBuffer = zlib.gzipSync(fileBuffer, { level: 9 });
  fs.writeFileSync(`${filePath}.gz`, gzipBuffer);
  
  // Generate brotli version (if supported)
  try {
    const brotliBuffer = zlib.brotliCompressSync(fileBuffer, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
        [zlib.constants.BROTLI_PARAM_SIZE_HINT]: fileBuffer.length
      }
    });
    fs.writeFileSync(`${filePath}.br`, brotliBuffer);
  } catch (error) {
    console.warn(`Brotli compression failed for ${filePath}:`, error.message);
  }
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDirectory(filePath);
    } else if (extensions.some(ext => file.endsWith(ext))) {
      console.log(`Compressing: ${filePath}`);
      compressFile(filePath);
    }
  });
}

console.log('🗜️  Compressing assets for better performance...');

try {
  if (fs.existsSync(distPath)) {
    walkDirectory(distPath);
    console.log('✅ Compression complete!');
  } else {
    console.error('❌ Dist directory not found. Run build first.');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Compression failed:', error.message);
  process.exit(1);
}
