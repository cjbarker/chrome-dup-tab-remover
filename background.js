// Background script for Duplicate Tab Remover extension

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
});

async function analyzeDuplicateTabs() {
    try {
        // Get all tabs
        const tabs = await chrome.tabs.query({});
        
        // Group tabs by URL
        const urlGroups = {};
        
        tabs.forEach(tab => {
            const url = normalizeUrl(tab.url);
            if (!urlGroups[url]) {
                urlGroups[url] = [];
            }
            urlGroups[url].push({
                id: tab.id,
                title: tab.title,
                url: tab.url,
                windowId: tab.windowId,
                index: tab.index
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

function normalizeUrl(url) {
    try {
        const urlObj = new URL(url);
        
        // Remove common tracking parameters
        const paramsToRemove = [
            'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
            'fbclid', 'gclid', 'ref', 'source'
        ];
        
        paramsToRemove.forEach(param => {
            urlObj.searchParams.delete(param);
        });
        
        // Remove trailing slash for consistency
        let pathname = urlObj.pathname;
        if (pathname.endsWith('/') && pathname.length > 1) {
            pathname = pathname.slice(0, -1);
        }
        
        return `${urlObj.protocol}//${urlObj.host}${pathname}${urlObj.search}${urlObj.hash}`;
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
        
        // Remove tabs
        await chrome.tabs.remove(tabIds);
        
        return { 
            success: true, 
            message: `Successfully closed ${tabIds.length} tab${tabIds.length === 1 ? '' : 's'}` 
        };
    } catch (error) {
        console.error('Error closing tabs:', error);
        return { success: false, message: error.message };
    }
}