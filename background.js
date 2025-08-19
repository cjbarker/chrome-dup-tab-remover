// Background script for Duplicate Tab Remover extension

// Store recently closed tabs for undo functionality
let recentlyClosedTabs = [];

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'analyzeTabs') {
        analyzeDuplicateTabs().then(duplicates => {
            sendResponse({ duplicates });
        }).catch(error => {
            console.error('Error analyzing tabs:', error);
            sendResponse({ error: error.message });
        });
        return true; // Will respond asynchronously
    }
    
    if (request.action === 'closeTabs') {
        closeSelectedTabs(request.tabIds).then(result => {
            sendResponse(result);
        }).catch(error => {
            console.error('Error closing tabs:', error);
            sendResponse({ error: error.message });
        });
        return true; // Will respond asynchronously
    }
    
    if (request.action === 'undoClose') {
        undoLastClose().then(result => {
            sendResponse(result);
        }).catch(error => {
            console.error('Error undoing close:', error);
            sendResponse({ error: error.message });
        });
        return true; // Will respond asynchronously
    }
});

async function analyzeDuplicateTabs() {
    try {
        // Get all tabs
        const tabs = await chrome.tabs.query({});
        
        // Group tabs by URL
        const urlGroups = {};
        
        tabs.forEach(tab => {
            // Skip tabs that shouldn't be closed
            if (shouldSkipTab(tab)) {
                return;
            }
            
            const url = normalizeUrl(tab.url);
            if (!urlGroups[url]) {
                urlGroups[url] = [];
            }
            urlGroups[url].push({
                id: tab.id,
                title: tab.title,
                url: tab.url,
                windowId: tab.windowId,
                index: tab.index,
                pinned: tab.pinned,
                active: tab.active
            });
        });
        
        // Filter out groups with only one tab (no duplicates)
        const duplicateGroups = {};
        
        Object.keys(urlGroups).forEach(url => {
            if (urlGroups[url].length > 1) {
                duplicateGroups[url] = urlGroups[url];
            }
        });
        
        return duplicateGroups;
    } catch (error) {
        console.error('Error in analyzeDuplicateTabs:', error);
        throw error;
    }
}

// Helper function to determine if a tab should be skipped from duplicate detection
function shouldSkipTab(tab) {
    // Skip pinned tabs
    if (tab.pinned) return true;
    
    // Skip system/extension pages
    const systemUrls = [
        'chrome://',
        'chrome-extension://',
        'edge://',
        'about:',
        'moz-extension://',
        'safari-extension://'
    ];
    
    return systemUrls.some(prefix => tab.url.startsWith(prefix));
}

function normalizeUrl(url) {
    try {
        const urlObj = new URL(url);
        
        // Enhanced tracking parameter removal
        const trackingParams = [
            // Google Analytics & Ads
            'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
            'utm_id', 'utm_source_platform', 'gclid', 'gclsrc', 'dclid',
            'wbraid', 'gbraid',
            
            // Social Media
            'fbclid', 'igshid', 'twclid', 'li_fat_id',
            
            // Email Marketing
            'mc_cid', 'mc_eid', '_hsenc', '_hsmi',
            
            // Other tracking
            'ref', 'source', 'campaign_id', 'affiliate_id',
            
            // Session IDs (common patterns)
            'sessionid', 'jsessionid', 'phpsessid', 'aspsessionid'
        ];
        
        trackingParams.forEach(param => {
            urlObj.searchParams.delete(param);
        });
        
        // Remove session IDs with pattern matching
        for (const [key] of urlObj.searchParams) {
            if (key.toLowerCase().includes('session')) {
                urlObj.searchParams.delete(key);
            }
        }
        
        // Remove trailing slash for consistency
        let pathname = urlObj.pathname;
        if (pathname.endsWith('/') && pathname.length > 1) {
            pathname = pathname.slice(0, -1);
        }
        
        // Build normalized URL
        let normalized = `${urlObj.protocol}//${urlObj.host}${pathname}`;
        
        // Add search params if they exist
        if (urlObj.search) {
            normalized += urlObj.search;
        }
        
        // Handle hash - keep for single-page apps that use it for navigation
        const spaHosts = ['github.com', 'stackoverflow.com', 'reddit.com', 'medium.com'];
        if (urlObj.hash && spaHosts.some(host => urlObj.hostname.includes(host))) {
            normalized += urlObj.hash;
        }
        
        return normalized;
    } catch (error) {
        // If URL parsing fails, return original URL
        return url;
    }
}

async function closeSelectedTabs(tabIds) {
    try {
        if (!tabIds || tabIds.length === 0) {
            return { success: false, message: 'No tabs selected' };
        }
        
        // Get tab info before closing for undo functionality
        const allTabs = await chrome.tabs.query({});
        const tabsToClose = allTabs.filter(tab => tabIds.includes(tab.id));
        
        // Double-check: don't close pinned or special tabs
        const safeTabIds = tabIds.filter(id => {
            const tab = tabsToClose.find(t => t.id === id);
            return tab && !shouldSkipTab(tab);
        });
        
        if (safeTabIds.length === 0) {
            return { success: false, message: 'No safe tabs to close (all are pinned or system tabs)' };
        }
        
        // Store for undo (keep last 5 operations)
        const tabInfo = tabsToClose
            .filter(tab => safeTabIds.includes(tab.id))
            .map(tab => ({
                url: tab.url,
                title: tab.title,
                windowId: tab.windowId
            }));
            
        recentlyClosedTabs.push({
            tabs: tabInfo,
            closedAt: Date.now()
        });
        
        // Keep only recent entries
        recentlyClosedTabs = recentlyClosedTabs.slice(-5);
        
        // Close the safe tabs
        await chrome.tabs.remove(safeTabIds);
        
        return { 
            success: true, 
            message: `Successfully closed ${safeTabIds.length} tab${safeTabIds.length === 1 ? '' : 's'}`,
            canUndo: true
        };
    } catch (error) {
        console.error('Error closing tabs:', error);
        return { success: false, message: error.message };
    }
}

// Undo functionality
async function undoLastClose() {
    try {
        if (recentlyClosedTabs.length === 0) {
            return { success: false, message: 'Nothing to undo' };
        }
        
        const lastOperation = recentlyClosedTabs.pop();
        let restoredCount = 0;
        
        for (const tabInfo of lastOperation.tabs) {
            try {
                await chrome.tabs.create({
                    url: tabInfo.url,
                    windowId: tabInfo.windowId,
                    active: false
                });
                restoredCount++;
            } catch (error) {
                console.warn('Could not restore tab:', tabInfo.url, error);
            }
        }
        
        return { 
            success: true, 
            message: `Restored ${restoredCount} of ${lastOperation.tabs.length} tabs` 
        };
    } catch (error) {
        console.error('Error in undoLastClose:', error);
        return { success: false, message: error.message };
    }
}