document.addEventListener('DOMContentLoaded', function() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const loadingMsg = document.getElementById('loadingMsg');
    const resultsContainer = document.getElementById('resultsContainer');
    const noDuplicates = document.getElementById('noDuplicates');
    const duplicateGroups = document.getElementById('duplicateGroups');
    const closeTabsBtn = document.getElementById('closeTabsBtn');
    
    let currentDuplicates = {};
    
    analyzeBtn.addEventListener('click', analyzeTabs);
    closeTabsBtn.addEventListener('click', closeSelectedTabs);
    
    async function analyzeTabs() {
        try {
            // Show loading state
            analyzeBtn.disabled = true;
            loadingMsg.style.display = 'block';
            resultsContainer.style.display = 'none';
            
            // Send message to background script
            const response = await chrome.runtime.sendMessage({ action: 'analyzeTabs' });
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            currentDuplicates = response.duplicates;
            displayResults(currentDuplicates);
            
        } catch (error) {
            console.error('Error analyzing tabs:', error);
            alert('Error analyzing tabs: ' + error.message);
        } finally {
            // Hide loading state
            analyzeBtn.disabled = false;
            loadingMsg.style.display = 'none';
        }
    }
    
    function displayResults(duplicates) {
        // Clear previous results
        duplicateGroups.innerHTML = '';
        
        const duplicateUrls = Object.keys(duplicates);
        
        if (duplicateUrls.length === 0) {
            // No duplicates found
            noDuplicates.style.display = 'block';
            closeTabsBtn.style.display = 'none';
        } else {
            // Display duplicate groups
            noDuplicates.style.display = 'none';
            closeTabsBtn.style.display = 'block';
            
            duplicateUrls.forEach(url => {
                const group = duplicates[url];
                const groupElement = createDuplicateGroupElement(url, group);
                duplicateGroups.appendChild(groupElement);
            });
        }
        
        resultsContainer.style.display = 'block';
    }
    
    function createDuplicateGroupElement(url, tabs) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'duplicate-group';
        
        // Create group header with checkbox and URL
        const headerDiv = document.createElement('div');
        headerDiv.className = 'group-header';
        
        const groupCheckbox = document.createElement('input');
        groupCheckbox.type = 'checkbox';
        groupCheckbox.className = 'group-checkbox';
        groupCheckbox.addEventListener('change', function() {
            toggleGroupSelection(groupDiv, this.checked);
        });
        
        const urlSpan = document.createElement('span');
        urlSpan.className = 'group-url';
        urlSpan.textContent = `${url} (${tabs.length} tabs)`;
        
        headerDiv.appendChild(groupCheckbox);
        headerDiv.appendChild(urlSpan);
        
        // Create tab list
        const tabListDiv = document.createElement('div');
        tabListDiv.className = 'tab-list';
        
        tabs.forEach((tab, index) => {
            const tabDiv = document.createElement('div');
            tabDiv.className = 'tab-item';
            
            const tabCheckbox = document.createElement('input');
            tabCheckbox.type = 'checkbox';
            tabCheckbox.className = 'tab-checkbox';
            tabCheckbox.dataset.tabId = tab.id;
            
            // Don't select the first tab by default (keep one open)
            if (index > 0) {
                tabCheckbox.checked = true;
            }
            
            tabCheckbox.addEventListener('change', function() {
                updateGroupCheckboxState(groupDiv);
            });
            
            const tabTitle = document.createElement('span');
            tabTitle.className = 'tab-title';
            tabTitle.textContent = tab.title || 'Untitled Tab';
            tabTitle.title = tab.title || 'Untitled Tab';
            
            tabDiv.appendChild(tabCheckbox);
            tabDiv.appendChild(tabTitle);
            tabListDiv.appendChild(tabDiv);
        });
        
        groupDiv.appendChild(headerDiv);
        groupDiv.appendChild(tabListDiv);
        
        // Update group checkbox state initially
        updateGroupCheckboxState(groupDiv);
        
        return groupDiv;
    }
    
    function toggleGroupSelection(groupElement, selected) {
        const tabCheckboxes = groupElement.querySelectorAll('.tab-checkbox');
        const tabs = Array.from(tabCheckboxes);
        
        if (selected) {
            // Select all but the first tab (keep one open)
            tabs.forEach((checkbox, index) => {
                checkbox.checked = index > 0;
            });
        } else {
            // Deselect all tabs
            tabs.forEach(checkbox => {
                checkbox.checked = false;
            });
        }
    }
    
    function updateGroupCheckboxState(groupElement) {
        const groupCheckbox = groupElement.querySelector('.group-checkbox');
        const tabCheckboxes = groupElement.querySelectorAll('.tab-checkbox');
        const checkedTabs = groupElement.querySelectorAll('.tab-checkbox:checked');
        
        if (checkedTabs.length === 0) {
            groupCheckbox.checked = false;
            groupCheckbox.indeterminate = false;
        } else if (checkedTabs.length === tabCheckboxes.length - 1) { // -1 because we keep one tab
            groupCheckbox.checked = true;
            groupCheckbox.indeterminate = false;
        } else {
            groupCheckbox.checked = false;
            groupCheckbox.indeterminate = true;
        }
    }
    
    async function closeSelectedTabs() {
        try {
            const selectedTabIds = [];
            const checkedBoxes = document.querySelectorAll('.tab-checkbox:checked');
            
            checkedBoxes.forEach(checkbox => {
                selectedTabIds.push(parseInt(checkbox.dataset.tabId));
            });
            
            if (selectedTabIds.length === 0) {
                alert('No tabs selected for closing.');
                return;
            }
            
            // Confirm action
            const confirmMessage = `Are you sure you want to close ${selectedTabIds.length} tab${selectedTabIds.length === 1 ? '' : 's'}?`;
            if (!confirm(confirmMessage)) {
                return;
            }
            
            closeTabsBtn.disabled = true;
            closeTabsBtn.textContent = 'Closing Tabs...';
            
            // Send message to background script
            const response = await chrome.runtime.sendMessage({ 
                action: 'closeTabs', 
                tabIds: selectedTabIds 
            });
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            if (response.success) {
                // Re-analyze tabs to update the display
                await analyzeTabs();
            } else {
                alert('Error closing tabs: ' + response.message);
            }
            
        } catch (error) {
            console.error('Error closing tabs:', error);
            alert('Error closing tabs: ' + error.message);
        } finally {
            closeTabsBtn.disabled = false;
            closeTabsBtn.textContent = 'Close Selected Tabs';
        }
    }
});