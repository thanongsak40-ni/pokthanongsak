# Unicode Character Cleanup Tools

This repository includes utilities to detect and clean invisible Unicode characters from Google Apps Script files that can cause parsing errors and unexpected behavior.

## Problem

Invisible Unicode characters can be introduced into code files through various means:
- Copy/paste from web browsers or documents
- Text editors with different encoding handling
- Data transfer between different systems
- Manual insertion of special characters

These characters can cause:
- Script parsing errors
- Unexpected runtime behavior
- Deployment failures
- Debugging difficulties

## Tools Provided

### 1. `detect-unicode.js` - Unicode Character Detection

Scans files for invisible Unicode characters and provides detailed reports.

#### Usage

```bash
# Detect characters in a single file
node detect-unicode.js path/to/file.gs

# Detect characters in a directory
node detect-unicode.js path/to/directory

# Using npm script
npm run detect path/to/file.gs
```

#### Detected Characters

The tool detects these common invisible Unicode characters:

- **U+200B** - Zero Width Space
- **U+200C** - Zero Width Non-Joiner  
- **U+200D** - Zero Width Joiner
- **U+2060** - Word Joiner
- **U+FEFF** - Zero Width No-Break Space (BOM)
- **U+00A0** - Non-Breaking Space
- **U+2000-U+200A** - Various space characters
- **U+202F** - Narrow No-Break Space
- **U+205F** - Medium Mathematical Space
- **U+3000** - Ideographic Space

#### Output Example

```
🔍 Unicode Character Detection Results

═══════════════════════════════════════════════════════════

❌ Found invisible Unicode characters in 1 file(s):

📄 File: /path/to/script.gs
────────────────────────────────────────
  🚨 Zero Width Space (U+200B): 3 occurrence(s)
  🚨 Non-Breaking Space (U+00A0): 2 occurrence(s)
  📍 Line details:
    Line 5: Zero Width Space (U+200B)
    Content: "function doPost(e) {..."

📊 Summary:
  Zero Width Space (U+200B): 3 total occurrences
  Non-Breaking Space (U+00A0): 2 total occurrences
```

### 2. `clean-unicode.js` - Unicode Character Cleanup

Removes or replaces invisible Unicode characters from files.

#### Usage

```bash
# Clean a single file (creates .cleaned version)
node clean-unicode.js path/to/file.gs

# Clean file in place with backup
node clean-unicode.js path/to/file.gs --in-place

# Clean directory recursively
node clean-unicode.js path/to/directory --in-place

# Using npm script
npm run clean path/to/file.gs
```

#### Options

- `--in-place` - Clean files in place (default: create `.cleaned` files)
- `--no-backup` - Don't create backup files when cleaning in place
- `--preserve-bom` - Preserve Byte Order Mark (BOM) characters
- `--no-nbsp` - Don't replace non-breaking spaces with regular spaces
- `--no-spaces` - Don't replace various space characters with regular spaces
- `--validate` - Validate Google Apps Script files after cleaning
- `--verbose` - Show detailed changes during cleaning

#### Cleanup Strategy

1. **Removal**: Zero-width characters are completely removed
2. **Replacement**: Space-like characters are replaced with regular spaces
3. **Preservation**: BOM characters can be preserved if needed (use `--preserve-bom`)

#### Output Example

```
🧹 Unicode Character Cleanup Results

═══════════════════════════════════════════════════════════
📊 Summary:
  Total files processed: 1
  Files with changes: 1
  Files unchanged: 0
  Files with errors: 0

✅ Files successfully cleaned:
────────────────────────────────────────
📄 /path/to/script.gs
   Action: cleaned-in-place
   Backup: /path/to/script.gs.backup
   Changes made:
     - Zero Width Space (U+200B): 3 instances [removed]
     - Non-Breaking Space (U+00A0): 2 instances " "

🎉 Cleanup completed successfully!
```

### 3. `test-unicode-utils.js` - Test Suite

Comprehensive test suite to validate the utilities work correctly.

```bash
# Run tests
node test-unicode-utils.js

# Or using npm
npm test
```

## Integration with Google Apps Script

### For LINE Bot Integration

The cleanup tools are particularly useful for Google Apps Script projects that handle:

- **Webhook Processing**: Clean request handling functions
- **Data Parsing**: Ensure JSON parsing works correctly
- **Database Operations**: Clean spreadsheet and drive operations
- **Response Generation**: Proper content type handling
- **Logging**: Ensure debug output works correctly

### Common Issues Fixed

1. **Parsing Errors**: Invisible characters breaking JSON.parse()
2. **Function Declaration Issues**: Characters affecting function syntax
3. **String Comparison Problems**: Hidden characters in string literals
4. **Property Access Issues**: Characters in object property names
5. **API Response Problems**: Characters affecting HTTP responses

## Best Practices

### Before Deployment

1. Run detection on all script files:
   ```bash
   node detect-unicode.js . 
   ```

2. Clean any files with issues:
   ```bash
   node clean-unicode.js . --in-place --validate
   ```

3. Test the cleaned scripts thoroughly

### Development Workflow

1. **Pre-commit**: Add detection to your development workflow
2. **Code Review**: Check for invisible characters during reviews  
3. **CI/CD**: Include validation in automated testing
4. **Deployment**: Final check before script deployment

### File Organization

```
project/
├── src/
│   ├── main.gs              # Main Google Apps Script file
│   ├── webhooks.gs          # LINE webhook handlers  
│   ├── database.gs          # Database operations
│   └── utils.gs             # Utility functions
├── detect-unicode.js        # Detection utility
├── clean-unicode.js         # Cleanup utility
├── test-unicode-utils.js    # Test suite
└── package.json            # Node.js configuration
```

## Google Apps Script Specific Considerations

### Function Validation

The cleanup tool includes validation for Google Apps Script patterns:

- Function declarations
- Google Service usage (DriveApp, SheetsApp, etc.)
- Logging statements (console.log, Logger.log)
- Properties Service usage
- URL Fetch operations
- Content Service responses

### Preserved Functionality

The cleanup process maintains:

- ✅ All script functionality
- ✅ Variable names and values
- ✅ Function parameters and return values
- ✅ API call structures
- ✅ Error handling logic
- ✅ Comment content

### Safety Features

- **Backup Creation**: Original files are backed up by default
- **Validation**: Post-cleanup validation ensures script integrity
- **Detailed Reporting**: Complete change logs for review
- **Reversible**: Backups allow for easy rollback if needed

## Troubleshooting

### Common Issues

1. **Permission Errors**: Ensure write permissions for target files
2. **Node.js Version**: Requires Node.js 12.0.0 or higher
3. **File Encoding**: Files must be UTF-8 encoded
4. **Large Files**: Very large files may require increased memory

### Getting Help

1. Check the tool output for specific error messages
2. Use `--verbose` flag for detailed change information
3. Run tests to verify tool functionality: `npm test`
4. Review backup files if cleanup results are unexpected

## License

MIT License - Feel free to use and modify for your projects.