#!/usr/bin/env node

/**
 * Cleanup script for repository preparation
 * Removes unwanted files before committing
 */

const fs = require('fs');
const path = require('path');

const filesToRemove = [
  'test-registration.js',
  'test-user-collection.js',
  'setup-atlas.js',
  'setup-auth.js',
  'test-connection.js',
  'AUTH_SETUP_README.md',
  'MONGODB_ATLAS_SETUP.md',
  'PROTECTION_GUIDE.md',
  'cleanup-for-repo.js',
  '.gitignore.example'
];

const directoriesToRemove = [
  // Add any directories to remove if needed
];

console.log('🧹 Cleaning up repository files...\n');

let removedCount = 0;

filesToRemove.forEach(file => {
  const filePath = path.join(__dirname, file);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Removed: ${file}`);
      removedCount++;
    } else {
      console.log(`⚠️  Not found: ${file}`);
    }
  } catch (error) {
    console.log(`❌ Error removing ${file}:`, error.message);
  }
});

directoriesToRemove.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`✅ Removed directory: ${dir}`);
      removedCount++;
    }
  } catch (error) {
    console.log(`❌ Error removing directory ${dir}:`, error.message);
  }
});

console.log(`\n🎉 Cleanup complete! Removed ${removedCount} items.`);
console.log('\n📝 Next steps:');
console.log('1. Review the .gitignore file');
console.log('2. Check git status to see what will be committed');
console.log('3. Commit your changes');
console.log('4. Push to your repository');

console.log('\n📋 Files that should be committed:');
console.log('✅ Source code (components, pages, API routes)');
console.log('✅ Configuration files (package.json, tsconfig.json, etc.)');
console.log('✅ Documentation (README.md if you create one)');
console.log('✅ .gitignore and other config files');

console.log('\n🚫 Files that should NOT be committed:');
console.log('❌ node_modules/ (ignored by .gitignore)');
console.log('❌ .next/ (ignored by .gitignore)');
console.log('❌ .env files (ignored by .gitignore)');
console.log('❌ Test files and setup scripts (cleaned up)');
