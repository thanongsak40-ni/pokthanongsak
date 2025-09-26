#!/usr/bin/env node

/**
 * Unicode Character Cleanup Utility
 * Removes invisible Unicode characters from Google Apps Script files
 */

const fs = require('fs');
const path = require('path');
const { detectInvisibleCharacters, INVISIBLE_UNICODE_CHARS } = require('./detect-unicode.js');

/**
 * Cleans invisible Unicode characters from a string
 * @param {string} content - The content to clean
 * @param {Object} options - Cleanup options
 * @returns {Object} - Cleanup results
 */
function cleanInvisibleCharacters(content, options = {}) {
  const {
    preserveBOM = false,
    replaceNBSP = true,
    replaceSpaces = true,
    logChanges = false
  } = options;

  let cleanedContent = content;
  const changes = [];

  INVISIBLE_UNICODE_CHARS.forEach(({ char, name, code }) => {
    // Skip BOM if preservation is requested
    if (!preserveBOM || code !== 'U+FEFF') {
      const regex = new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = content.match(regex);
      
      if (matches) {
        let replacement = '';
        
        // Special handling for certain characters
        if (code === 'U+00A0' && replaceNBSP) {
          // Replace non-breaking space with regular space
          replacement = ' ';
        } else if (replaceSpaces && (
          code === 'U+2000' || code === 'U+2001' || code === 'U+2002' || 
          code === 'U+2003' || code === 'U+2004' || code === 'U+2005' || 
          code === 'U+2006' || code === 'U+2007' || code === 'U+2008' || 
          code === 'U+2009' || code === 'U+200A' || code === 'U+202F' || 
          code === 'U+205F' || code === 'U+3000'
        )) {
          // Replace various space characters with regular space
          replacement = ' ';
        }
        
        cleanedContent = cleanedContent.replace(regex, replacement);
        
        changes.push({
          char,
          name,
          code,
          count: matches.length,
          replacedWith: replacement === '' ? '[removed]' : `"${replacement}"`
        });
        
        if (logChanges) {
          console.log(`  Replaced ${matches.length} instances of ${name} (${code}) with ${replacement === '' ? '[removed]' : `"${replacement}"`}`);
        }
      }
    }
  });

  return {
    originalContent: content,
    cleanedContent,
    changes,
    hasChanges: changes.length > 0
  };
}

/**
 * Cleans invisible Unicode characters from a file
 * @param {string} filePath - Path to the file to clean
 * @param {Object} options - Cleanup options
 * @returns {Object} - Cleanup results
 */
function cleanFile(filePath, options = {}) {
  const {
    backup = true,
    inPlace = false,
    outputPath = null,
    ...cleanOptions
  } = options;

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const originalContent = fs.readFileSync(filePath, 'utf8');
  const result = cleanInvisibleCharacters(originalContent, cleanOptions);

  if (!result.hasChanges) {
    return {
      ...result,
      filePath,
      action: 'no-changes',
      backupPath: null,
      outputPath: filePath
    };
  }

  let backupPath = null;
  let finalOutputPath = filePath;

  // Create backup if requested
  if (backup && inPlace) {
    backupPath = `${filePath}.backup`;
    fs.writeFileSync(backupPath, originalContent, 'utf8');
  }

  // Determine output path
  if (outputPath) {
    finalOutputPath = outputPath;
  } else if (!inPlace) {
    const dir = path.dirname(filePath);
    const name = path.basename(filePath, path.extname(filePath));
    const ext = path.extname(filePath);
    finalOutputPath = path.join(dir, `${name}.cleaned${ext}`);
  }

  // Write cleaned content
  fs.writeFileSync(finalOutputPath, result.cleanedContent, 'utf8');

  return {
    ...result,
    filePath,
    action: inPlace ? 'cleaned-in-place' : 'cleaned-to-new-file',
    backupPath,
    outputPath: finalOutputPath
  };
}

/**
 * Cleans all files in a directory
 * @param {string} dirPath - Directory path to clean
 * @param {Object} options - Cleanup options
 * @returns {Array} - Array of cleanup results
 */
function cleanDirectory(dirPath, options = {}) {
  const {
    extensions = ['.js', '.gs', '.json'],
    recursive = true,
    ...cleanOptions
  } = options;

  const results = [];

  function walkDirectory(currentPath) {
    const items = fs.readdirSync(currentPath);

    items.forEach(item => {
      const itemPath = path.join(currentPath, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory() && !item.startsWith('.') && recursive) {
        walkDirectory(itemPath);
      } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
        try {
          const result = cleanFile(itemPath, cleanOptions);
          results.push(result);
        } catch (error) {
          console.error(`Error cleaning ${itemPath}:`, error.message);
          results.push({
            filePath: itemPath,
            action: 'error',
            error: error.message,
            hasChanges: false
          });
        }
      }
    });
  }

  walkDirectory(dirPath);
  return results;
}

/**
 * Formats cleanup results for console output
 * @param {Array} results - Array of cleanup results
 */
function printResults(results) {
  console.log('\n🧹 Unicode Character Cleanup Results\n');
  console.log('═'.repeat(60));

  const changedFiles = results.filter(r => r.hasChanges);
  const errorFiles = results.filter(r => r.action === 'error');
  const unchangedFiles = results.filter(r => !r.hasChanges && r.action !== 'error');

  console.log(`📊 Summary:`);
  console.log(`  Total files processed: ${results.length}`);
  console.log(`  Files with changes: ${changedFiles.length}`);
  console.log(`  Files unchanged: ${unchangedFiles.length}`);
  console.log(`  Files with errors: ${errorFiles.length}\n`);

  if (changedFiles.length > 0) {
    console.log('✅ Files successfully cleaned:');
    console.log('─'.repeat(40));

    changedFiles.forEach(result => {
      console.log(`📄 ${result.filePath}`);
      console.log(`   Action: ${result.action}`);
      if (result.backupPath) {
        console.log(`   Backup: ${result.backupPath}`);
      }
      if (result.outputPath !== result.filePath) {
        console.log(`   Output: ${result.outputPath}`);
      }
      
      console.log(`   Changes made:`);
      result.changes.forEach(change => {
        console.log(`     - ${change.name} (${change.code}): ${change.count} instances ${change.replacedWith}`);
      });
      console.log('');
    });
  }

  if (unchangedFiles.length > 0) {
    console.log('ℹ️  Files with no changes needed:');
    unchangedFiles.forEach(result => {
      console.log(`  ✓ ${result.filePath}`);
    });
    console.log('');
  }

  if (errorFiles.length > 0) {
    console.log('❌ Files with errors:');
    errorFiles.forEach(result => {
      console.log(`  ✗ ${result.filePath}: ${result.error}`);
    });
    console.log('');
  }

  // Overall status
  if (errorFiles.length > 0) {
    console.log('⚠️  Cleanup completed with errors.');
  } else if (changedFiles.length > 0) {
    console.log('🎉 Cleanup completed successfully!');
  } else {
    console.log('✨ All files were already clean!');
  }
}

/**
 * Validates that cleaned Google Apps Script maintains functionality
 * @param {string} filePath - Path to the cleaned file
 * @returns {Object} - Validation results
 */
function validateGoogleAppsScript(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];

  // Basic syntax checks for Google Apps Script
  const patterns = [
    { regex: /function\s+\w+\s*\([^)]*\)\s*{/, name: 'Function declarations' },
    { regex: /console\.log\s*\(/, name: 'Console logging' },
    { regex: /Logger\.log\s*\(/, name: 'Logger usage' },
    { regex: /DriveApp\.|SheetsApp\.|GmailApp\./, name: 'Google Services usage' },
    { regex: /PropertiesService\./, name: 'Properties Service usage' },
    { regex: /UrlFetchApp\./, name: 'URL Fetch usage' }
  ];

  patterns.forEach(pattern => {
    const matches = content.match(new RegExp(pattern.regex, 'g'));
    if (matches) {
      console.log(`✓ ${pattern.name}: ${matches.length} instances found`);
    }
  });

  // Check for potential issues after cleanup
  if (content.includes('undefined')) {
    issues.push('Found "undefined" which might indicate variable issues');
  }

  if (content.includes('SyntaxError')) {
    issues.push('Found "SyntaxError" which might indicate parsing issues');
  }

  return {
    isValid: issues.length === 0,
    issues,
    patterns: patterns.map(p => p.name)
  };
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node clean-unicode.js <file-or-directory-path> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --in-place      Clean files in place (default: create .cleaned files)');
    console.log('  --no-backup     Don\'t create backup files when cleaning in place');
    console.log('  --preserve-bom  Preserve Byte Order Mark (BOM) characters');
    console.log('  --no-nbsp       Don\'t replace non-breaking spaces with regular spaces');
    console.log('  --no-spaces     Don\'t replace various space characters with regular spaces');
    console.log('  --validate      Validate Google Apps Script files after cleaning');
    console.log('  --verbose       Show detailed changes during cleaning');
    process.exit(1);
  }

  const targetPath = args[0];
  const options = {
    inPlace: args.includes('--in-place'),
    backup: !args.includes('--no-backup'),
    preserveBOM: args.includes('--preserve-bom'),
    replaceNBSP: !args.includes('--no-nbsp'),
    replaceSpaces: !args.includes('--no-spaces'),
    logChanges: args.includes('--verbose')
  };

  const validate = args.includes('--validate');

  try {
    if (!fs.existsSync(targetPath)) {
      console.error(`Error: Path does not exist: ${targetPath}`);
      process.exit(1);
    }

    const stat = fs.statSync(targetPath);
    let results;

    if (stat.isFile()) {
      results = [cleanFile(targetPath, options)];
    } else if (stat.isDirectory()) {
      results = cleanDirectory(targetPath, options);
    } else {
      console.error(`Error: Path is neither a file nor directory: ${targetPath}`);
      process.exit(1);
    }

    printResults(results);

    // Validate Google Apps Script files if requested
    if (validate) {
      console.log('\n🔍 Validating Google Apps Script files...\n');
      const gsFiles = results.filter(r => 
        r.outputPath && (r.outputPath.endsWith('.gs') || r.outputPath.endsWith('.js'))
      );

      gsFiles.forEach(result => {
        console.log(`Validating: ${result.outputPath}`);
        const validation = validateGoogleAppsScript(result.outputPath);
        if (validation.isValid) {
          console.log('✅ Validation passed');
        } else {
          console.log('❌ Validation issues:');
          validation.issues.forEach(issue => console.log(`  - ${issue}`));
        }
        console.log('');
      });
    }

    // Exit with error code if any errors occurred
    const hasErrors = results.some(r => r.action === 'error');
    process.exit(hasErrors ? 1 : 0);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

module.exports = {
  cleanInvisibleCharacters,
  cleanFile,
  cleanDirectory,
  validateGoogleAppsScript
};