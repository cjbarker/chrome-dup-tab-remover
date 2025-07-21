# Duplicate Tab Remover Chrome Extension

A Chrome extension that helps you identify and remove duplicate tabs, keeping your browser organized and improving performance.

## Features

- **One-Click Analysis**: Analyze all open tabs for duplicates with a single button click
- **Tree Structure Display**: View duplicate tabs organized by URL in an easy-to-read grouped format
- **Selective Removal**: Choose which specific tabs to close or select entire groups
- **Smart Defaults**: Automatically selects duplicate tabs while keeping one instance of each URL open
- **URL Normalization**: Intelligently identifies duplicates by ignoring tracking parameters and URL variations

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The Duplicate Tab Remover icon will appear in your Chrome toolbar

## Testing the Extension

### Basic Functionality Test
1. **Create duplicate tabs**: Open several tabs with the same URL (e.g., multiple Google.com tabs)
2. **Load the extension**: Click the Duplicate Tab Remover icon in your toolbar
3. **Analyze tabs**: Click "Analyze Tabs for Duplicates"
4. **Verify detection**: Confirm that duplicate tabs are properly grouped and displayed
5. **Test selection**: Use individual and group checkboxes to select tabs for closure
6. **Close tabs**: Click "Close Selected Tabs" and confirm tabs are closed as expected

### Advanced Testing Scenarios
- **Multiple duplicate groups**: Open duplicates of different websites (e.g., 3x Google, 2x GitHub, 4x Stack Overflow)
- **URL variations**: Test with URLs that have different tracking parameters to verify normalization
- **Cross-window tabs**: Open duplicate tabs across multiple Chrome windows
- **Edge cases**: Test with special URLs like chrome:// pages, local files, or extensions

### Expected Behavior
- ✅ Only groups with 2+ identical URLs should appear as duplicates
- ✅ First tab in each group should remain unselected by default (preserved)
- ✅ Group checkboxes should control all tabs in that group
- ✅ Confirmation dialog should appear before closing tabs
- ✅ Extension should re-analyze automatically after closing tabs

### Troubleshooting
If you encounter issues:
1. Check the Chrome Developer Console (`F12` → Console tab) for error messages
2. Verify the extension has the "tabs" permission in `chrome://extensions/`
3. Reload the extension if making code changes
4. Test with simple duplicate tabs first before complex scenarios

## Usage

1. Click the Duplicate Tab Remover icon in your Chrome toolbar
2. Click "Analyze Tabs for Duplicates" to scan all open tabs
3. Review the grouped duplicate tabs displayed in the popup
4. Use checkboxes to select which tabs to close:
   - Individual tab checkboxes for precise control
   - Group checkboxes to select/deselect entire duplicate groups
5. Click "Close Selected Tabs" to remove the selected duplicates
6. Confirm the action when prompted

## How It Works

The extension:
- Scans all open tabs across all Chrome windows
- Normalizes URLs by removing common tracking parameters
- Groups tabs with identical normalized URLs
- Displays groups with 2+ tabs as duplicates
- Allows selective removal while preserving at least one tab per unique URL

## Files Structure

- `manifest.json` - Extension configuration and permissions
- `popup.html` - User interface for the extension popup
- `popup.js` - Frontend logic for user interactions
- `background.js` - Background service worker for tab analysis and management
- `README.md` - This documentation file

## Permissions

This extension requires the "tabs" permission to:
- Read information about open tabs
- Close selected duplicate tabs

## Privacy

This extension operates entirely locally within your browser. No data is sent to external servers or stored permanently.