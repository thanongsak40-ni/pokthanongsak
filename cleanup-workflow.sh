#!/bin/bash

# Google Apps Script Unicode Cleanup Workflow
# This script demonstrates how to integrate Unicode cleanup into your development workflow

echo "🧹 Google Apps Script Unicode Cleanup Workflow"
echo "==============================================="

# Step 1: Detect issues in current directory
echo -e "\n📍 Step 1: Detecting Unicode issues..."
if node detect-unicode.js . >/dev/null 2>&1; then
    echo "✅ No Unicode issues detected in repository"
    echo "ℹ️  Repository is ready for deployment"
    exit 0
else
    echo "⚠️  Unicode issues detected! Running cleanup..."
fi

# Step 2: Clean all Google Apps Script files
echo -e "\n🔧 Step 2: Cleaning Google Apps Script files..."
node clean-unicode.js . --in-place --validate

# Step 3: Final verification
echo -e "\n✅ Step 3: Final verification..."
if node detect-unicode.js . >/dev/null 2>&1; then
    echo "🎉 Cleanup completed successfully!"
    echo "📋 Repository is now ready for deployment"
    
    # Optional: Show git status
    echo -e "\n📊 Git status after cleanup:"
    git status --porcelain
else
    echo "❌ Some issues remain. Please review the output above."
    exit 1
fi

echo -e "\n💡 Next steps:"
echo "   1. Review the changes made by the cleanup process"
echo "   2. Test your Google Apps Script functions"
echo "   3. Commit the cleaned files to your repository"
echo "   4. Deploy to Google Apps Script platform"