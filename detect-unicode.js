#!/usr/bin/env node

/**
 * Unicode Character Detection Utility
 * Detects invisible Unicode characters in Google Apps Script files
 */

const fs = require('fs');
const path = require('path');

// Common invisible Unicode characters that can cause issues
const INVISIBLE_UNICODE_CHARS = [
  { char: '\u200B', name: 'Zero Width Space', code: 'U+200B' },
  { char: '\u200C', name: 'Zero Width Non-Joiner', code: 'U+200C' },
  { char: '\u200D', name: 'Zero Width Joiner', code: 'U+200D' },
  { char: '\u2060', name: 'Word Joiner', code: 'U+2060' },
  { char: '\uFEFF', name: 'Zero Width No-Break Space (BOM)', code: 'U+FEFF' },
  { char: '\u00A0', name: 'Non-Breaking Space', code: 'U+00A0' },
  { char: '\u2000', name: 'En Quad', code: 'U+2000' },
  { char: '\u2001', name: 'Em Quad', code: 'U+2001' },
  { char: '\u2002', name: 'En Space', code: 'U+2002' },
  { char: '\u2003', name: 'Em Space', code: 'U+2003' },
  { char: '\u2004', name: 'Three-Per-Em Space', code: 'U+2004' },
  { char: '\u2005', name: 'Four-Per-Em Space', code: 'U+2005' },
  { char: '\u2006', name: 'Six-Per-Em Space', code: 'U+2006' },
  { char: '\u2007', name: 'Figure Space', code: 'U+2007' },
  { char: '\u2008', name: 'Punctuation Space', code: 'U+2008' },
  { char: '\u2009', name: 'Thin Space', code: 'U+2009' },
  { char: '\u200A', name: 'Hair Space', code: 'U+200A' },
  { char: '\u202F', name: 'Narrow No-Break Space', code: 'U+202F' },
  { char: '\u205F', name: 'Medium Mathematical Space', code: 'U+205F' },
  { char: '\u3000', name: 'Ideographic Space', code: 'U+3000' },
];

/**
 * Detects invisible Unicode characters in a file
 * @param {string} filePath - Path to the file to analyze
 * @returns {Object} - Detection results
 */
function detectInvisibleCharacters(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const results = {
    filePath,
    hasInvisibleChars: false,
    detectedChars: [],
    lineDetails: []
  };

  const lines = content.split('\n');

  INVISIBLE_UNICODE_CHARS.forEach(({ char, name, code }) => {
    if (content.includes(char)) {
      results.hasInvisibleChars = true;
      
      const occurrences = (content.match(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      
      results.detectedChars.push({
        char,
        name,
        code,
        occurrences
      });

      // Find line numbers with this character
      lines.forEach((line, index) => {
        if (line.includes(char)) {
          results.lineDetails.push({
            lineNumber: index + 1,
            char,
            name,
            code,
            lineContent: line.substring(0, 100) + (line.length > 100 ? '...' : '')
          });
        }
      });
    }
  });

  return results;
}

/**
 * Analyzes a directory for invisible Unicode characters
 * @param {string} dirPath - Directory path to analyze
 * @param {Array} extensions - File extensions to check
 * @returns {Array} - Array of detection results
 */
function analyzeDirectory(dirPath, extensions = ['.js', '.gs', '.json']) {
  const results = [];
  
  function walkDirectory(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    items.forEach(item => {
      const itemPath = path.join(currentPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory() && !item.startsWith('.')) {
        walkDirectory(itemPath);
      } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
        try {
          const result = detectInvisibleCharacters(itemPath);
          results.push(result);
        } catch (error) {
          console.error(`Error analyzing ${itemPath}:`, error.message);
        }
      }
    });
  }
  
  walkDirectory(dirPath);
  return results;
}

/**
 * Formats detection results for console output
 * @param {Array} results - Array of detection results
 */
function printResults(results) {
  console.log('\n🔍 Unicode Character Detection Results\n');
  console.log('═'.repeat(60));
  
  const problemFiles = results.filter(r => r.hasInvisibleChars);
  
  if (problemFiles.length === 0) {
    console.log('✅ No invisible Unicode characters detected in any files.');
    return;
  }
  
  console.log(`❌ Found invisible Unicode characters in ${problemFiles.length} file(s):\n`);
  
  problemFiles.forEach(result => {
    console.log(`📄 File: ${result.filePath}`);
    console.log('─'.repeat(40));
    
    result.detectedChars.forEach(char => {
      console.log(`  🚨 ${char.name} (${char.code}): ${char.occurrences} occurrence(s)`);
    });
    
    if (result.lineDetails.length > 0) {
      console.log('  📍 Line details:');
      result.lineDetails.forEach(detail => {
        console.log(`    Line ${detail.lineNumber}: ${detail.name} (${detail.code})`);
        console.log(`    Content: "${detail.lineContent}"`);
      });
    }
    console.log('');
  });
  
  // Summary
  console.log('📊 Summary:');
  const charCounts = {};
  problemFiles.forEach(result => {
    result.detectedChars.forEach(char => {
      charCounts[char.code] = (charCounts[char.code] || 0) + char.occurrences;
    });
  });
  
  Object.entries(charCounts).forEach(([code, count]) => {
    const charInfo = INVISIBLE_UNICODE_CHARS.find(c => c.code === code);
    console.log(`  ${charInfo.name} (${code}): ${count} total occurrences`);
  });
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node detect-unicode.js <file-or-directory-path>');
    process.exit(1);
  }
  
  const targetPath = args[0];
  
  try {
    if (!fs.existsSync(targetPath)) {
      console.error(`Error: Path does not exist: ${targetPath}`);
      process.exit(1);
    }
    
    const stat = fs.statSync(targetPath);
    let results;
    
    if (stat.isFile()) {
      results = [detectInvisibleCharacters(targetPath)];
    } else if (stat.isDirectory()) {
      results = analyzeDirectory(targetPath);
    } else {
      console.error(`Error: Path is neither a file nor directory: ${targetPath}`);
      process.exit(1);
    }
    
    printResults(results);
    
    // Exit with error code if problems found
    const hasProblems = results.some(r => r.hasInvisibleChars);
    process.exit(hasProblems ? 1 : 0);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

module.exports = {
  detectInvisibleCharacters,
  analyzeDirectory,
  INVISIBLE_UNICODE_CHARS
};