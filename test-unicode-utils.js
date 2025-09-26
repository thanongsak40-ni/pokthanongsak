#!/usr/bin/env node

/**
 * Test suite for Unicode detection and cleanup utilities
 */

const fs = require('fs');
const path = require('path');
const { detectInvisibleCharacters, INVISIBLE_UNICODE_CHARS } = require('./detect-unicode.js');
const { cleanInvisibleCharacters, cleanFile } = require('./clean-unicode.js');

// Create a temporary directory for tests
const testDir = '/tmp/unicode-test';
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

/**
 * Test runner utility
 */
function runTest(testName, testFn) {
  try {
    console.log(`\n🧪 Running test: ${testName}`);
    testFn();
    console.log(`✅ Test passed: ${testName}`);
  } catch (error) {
    console.error(`❌ Test failed: ${testName}`);
    console.error(`   Error: ${error.message}`);
    process.exitCode = 1;
  }
}

/**
 * Assert utility
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Test 1: Create a file with invisible Unicode characters
runTest('Create test file with invisible Unicode characters', () => {
  const testContent = `
// Google Apps Script with invisible Unicode characters
function doPost(e) {${'\u200B'}
  const data = JSON.parse(e.postData.contents);${'\u2060'}
  ${'\uFEFF'}console.log('Received data:', data);
  
  // Process the data${'\u00A0'}
  if (data.type === 'message') {${'\u200C'}
    handleMessage(data);${'\u200D'}
  }
  
  return ContentService${'\u2000'}
    .createTextOutput(JSON.stringify({status: 'success'}))${'\u2003'}
    .setMimeType(ContentService.MimeType.JSON);
}

function handleMessage(data) {${'\u3000'}
  Logger.log('Handling message:', data.message.text);${'\u202F'}
}`;

  const testFilePath = path.join(testDir, 'test-script.gs');
  fs.writeFileSync(testFilePath, testContent, 'utf8');
  
  assert(fs.existsSync(testFilePath), 'Test file should be created');
  
  const fileContent = fs.readFileSync(testFilePath, 'utf8');
  assert(fileContent.includes('\u200B'), 'File should contain Zero Width Space');
  assert(fileContent.includes('\uFEFF'), 'File should contain BOM');
  assert(fileContent.includes('\u00A0'), 'File should contain Non-Breaking Space');
});

// Test 2: Detection functionality
runTest('Detect invisible Unicode characters', () => {
  const testFilePath = path.join(testDir, 'test-script.gs');
  const result = detectInvisibleCharacters(testFilePath);
  
  assert(result.hasInvisibleChars, 'Should detect invisible characters');
  assert(result.detectedChars.length > 0, 'Should find specific character types');
  assert(result.lineDetails.length > 0, 'Should provide line details');
  
  // Check for specific characters we added
  const foundZWS = result.detectedChars.some(c => c.code === 'U+200B');
  const foundBOM = result.detectedChars.some(c => c.code === 'U+FEFF');
  const foundNBSP = result.detectedChars.some(c => c.code === 'U+00A0');
  
  assert(foundZWS, 'Should detect Zero Width Space');
  assert(foundBOM, 'Should detect BOM');
  assert(foundNBSP, 'Should detect Non-Breaking Space');
});

// Test 3: Cleanup functionality
runTest('Clean invisible Unicode characters', () => {
  const testFilePath = path.join(testDir, 'test-script.gs');
  const originalContent = fs.readFileSync(testFilePath, 'utf8');
  
  const result = cleanInvisibleCharacters(originalContent);
  
  assert(result.hasChanges, 'Should have changes');
  assert(result.changes.length > 0, 'Should report specific changes');
  assert(result.cleanedContent !== result.originalContent, 'Content should be different');
  
  // Verify specific characters are removed/replaced
  assert(!result.cleanedContent.includes('\u200B'), 'Zero Width Space should be removed');
  assert(!result.cleanedContent.includes('\u200C'), 'Zero Width Non-Joiner should be removed');
  assert(!result.cleanedContent.includes('\u200D'), 'Zero Width Joiner should be removed');
});

// Test 4: File cleanup functionality
runTest('Clean file with backup', () => {
  const testFilePath = path.join(testDir, 'test-script.gs');
  
  const result = cleanFile(testFilePath, {
    inPlace: true,
    backup: true
  });
  
  assert(result.hasChanges, 'Should have changes');
  assert(result.action === 'cleaned-in-place', 'Should clean in place');
  assert(result.backupPath && fs.existsSync(result.backupPath), 'Should create backup file');
  
  // Verify the cleaned file doesn't have invisible characters
  const cleanedContent = fs.readFileSync(testFilePath, 'utf8');
  assert(!cleanedContent.includes('\u200B'), 'Cleaned file should not have Zero Width Space');
});

// Test 5: Clean file with no changes
runTest('Clean already clean file', () => {
  const cleanContent = `
function simpleFunction() {
  console.log('This is a clean file');
  return 'success';
}`;
  
  const cleanFilePath = path.join(testDir, 'clean-script.gs');
  fs.writeFileSync(cleanFilePath, cleanContent, 'utf8');
  
  const result = cleanFile(cleanFilePath);
  
  assert(!result.hasChanges, 'Should have no changes');
  assert(result.action === 'no-changes', 'Should report no changes');
});

// Test 6: Preserve BOM option
runTest('Preserve BOM option', () => {
  const contentWithBOM = '\uFEFF' + `
function testFunction() {
  console.log('Function with BOM');
}`;
  
  const result = cleanInvisibleCharacters(contentWithBOM, { preserveBOM: true });
  
  assert(result.cleanedContent.startsWith('\uFEFF'), 'Should preserve BOM when requested');
  
  const resultNoBOM = cleanInvisibleCharacters(contentWithBOM, { preserveBOM: false });
  assert(!resultNoBOM.cleanedContent.startsWith('\uFEFF'), 'Should remove BOM when not preserving');
});

// Test 7: Google Apps Script validation patterns
runTest('Google Apps Script pattern validation', () => {
  const gsContent = `
function doPost(e) {
  console.log('POST received');
  Logger.log('Processing request');
  
  const sheet = SpreadsheetApp.openById('sheet-id');
  const drive = DriveApp.getFileById('file-id');
  const props = PropertiesService.getScriptProperties();
  
  const response = UrlFetchApp.fetch('https://api.example.com');
  
  return ContentService.createTextOutput('OK');
}`;

  const testFilePath = path.join(testDir, 'validation-test.gs');
  fs.writeFileSync(testFilePath, gsContent, 'utf8');
  
  const { validateGoogleAppsScript } = require('./clean-unicode.js');
  const validation = validateGoogleAppsScript(testFilePath);
  
  assert(validation.isValid, 'Should validate as valid Google Apps Script');
  assert(validation.patterns.length > 0, 'Should recognize Google Apps Script patterns');
});

// Cleanup
console.log('\n🧹 Cleaning up test files...');
if (fs.existsSync(testDir)) {
  fs.rmSync(testDir, { recursive: true, force: true });
}

console.log('\n📊 Test Summary:');
if (process.exitCode === 1) {
  console.log('❌ Some tests failed');
} else {
  console.log('✅ All tests passed!');
}