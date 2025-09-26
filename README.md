# pokthanongsak

This repository contains Google Apps Script code for a LINE bot integration with Google Drive and Sheets for project management. The system handles image uploads, PDF processing, and data synchronization between different spreadsheets.

## ⚠️ Unicode Character Cleanup

This repository includes utilities to detect and clean invisible Unicode characters that can cause parsing errors and unexpected behavior in Google Apps Script execution.

### Key Features

- **LINE webhook handling** for messages and images
- **Project lookup and validation** from master spreadsheets
- **File upload tracking and management** with Google Drive integration
- **Automatic data insertion** into project-specific RS sheets
- **Working hours validation** for uploads
- **Push notifications** for upload confirmations
- **PDF and image processing** with automatic archiving

### Unicode Cleanup Tools

The following utilities are available to ensure clean, error-free Google Apps Script code:

- `detect-unicode.js` - Detects invisible Unicode characters in files
- `clean-unicode.js` - Removes invisible Unicode characters from files
- `test-unicode-utils.js` - Test suite for the cleanup utilities

### Quick Start

1. **Detect invisible characters:**
   ```bash
   node detect-unicode.js sample-line-bot.gs
   ```

2. **Clean invisible characters:**
   ```bash
   node clean-unicode.js sample-line-bot.gs --in-place --validate
   ```

3. **Run tests:**
   ```bash
   npm test
   ```

### Documentation

See [UNICODE_CLEANUP.md](UNICODE_CLEANUP.md) for detailed documentation on the Unicode cleanup tools and best practices.

### Sample Files

- `sample-line-bot.gs` - Sample Google Apps Script with invisible Unicode characters (for demonstration)
- `sample-line-bot.cleaned.gs` - The same file after cleanup (clean version)

The cleaned code maintains all original functionality while removing invisible Unicode characters that could cause script execution issues.