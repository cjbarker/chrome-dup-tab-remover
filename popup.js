document.addEventListener('DOMContentLoaded', function() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const loadingMsg = document.getElementById('loadingMsg');
    const resultsContainer = document.getElementById('resultsContainer');
    const noDuplicates = document.getElementById('noDuplicates');
    const duplicateGroups = document.getElementById('duplicateGroups');
    const closeTabsBtn = document.getElementById('closeTabsBtn');
    
    // New UI elements
    const statsContainer = document.getElementById('statsContainer');
    const bulkActions = document.getElementById('bulkActions');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const selectNoneBtn = document.getElementById('selectNoneBtn');
    const exportBtn = document.getElementById('exportBtn');
    const keyboardHints = document.getElementById('keyboardHints');
    
    // Statistics elements
    const groupCount = document.getElementById('groupCount');
    const duplicateCount = document.getElementById('duplicateCount');
    const selectedCount = document.getElementById('selectedCount');
    const protectedCount = document.getElementById('protectedCount');
    
    // Settings elements
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const confirmCloseSetting = document.getElementById('confirmCloseSetting');
    const autoSelectSetting = document.getElementById('autoSelectSetting');
    const performanceModeSetting = document.getElementById('performanceModeSetting');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const resetSettingsBtn = document.getElementById('resetSettingsBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    
    // Default settings
    let userSettings = {
        confirmClose: true,
        autoSelect: true,
        performanceMode: false
    };
    
    let currentDuplicates = {};
    
    analyzeBtn.addEventListener('click', analyzeTabs);
    closeTabsBtn.addEventListener('click', closeSelectedTabs);
    selectAllBtn.addEventListener('click', selectAllDuplicates);
    selectNoneBtn.addEventListener('click', selectNoneDuplicates);
    exportBtn.addEventListener('click', exportDuplicateList);
    
    // Settings event listeners
    settingsBtn.addEventListener('click', toggleSettings);
    saveSettingsBtn.addEventListener('click', saveSettings);
    resetSettingsBtn.addEventListener('click', resetSettings);
    closeSettingsBtn.addEventListener('click', () => settingsPanel.style.display = 'none');
    
    // Load user settings on startup
    loadSettings();
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Update selected count when checkboxes change
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('tab-checkbox')) {
            updateStatistics();
        }
    });
    
    // Add undo button dynamically when needed
    let undoBtn = null;
    
    function createUndoButton() {
        if (!undoBtn) {
            undoBtn = document.createElement('button');
            undoBtn.id = 'undoBtn';
            undoBtn.textContent = 'Undo Last Close';
            undoBtn.style.cssText = `
                background-color: #6c757d;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                width: 100%;
                margin-top: 8px;
            `;
            undoBtn.addEventListener('mouseover', () => {
                undoBtn.style.backgroundColor = '#5a6268';
            });
            undoBtn.addEventListener('mouseout', () => {
                undoBtn.style.backgroundColor = '#6c757d';
            });
            undoBtn.addEventListener('click', undoLastClose);
            closeTabsBtn.parentNode.insertBefore(undoBtn, closeTabsBtn.nextSibling);
        }
        return undoBtn;
    }
    
    async function analyzeTabs() {
        const startTime = performance.now();
        
        try {
            // Show loading state
            analyzeBtn.disabled = true;
            loadingMsg.style.display = 'block';
            resultsContainer.style.display = 'none';
            
            if (userSettings.performanceMode) {
                loadingMsg.textContent = 'Analyzing tabs (Performance Mode)...';
            }
            
            // Send message to background script
            const response = await chrome.runtime.sendMessage({ action: 'analyzeTabs' });
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            currentDuplicates = response.duplicates;
            displayResults(currentDuplicates);
            
            // Performance tracking
            const endTime = performance.now();
            const duration = Math.round(endTime - startTime);
            console.log(`Analysis completed in ${duration}ms`);
            
        } catch (error) {
            console.error('Error analyzing tabs:', error);
            alert('Error analyzing tabs: ' + error.message);
        } finally {
            // Hide loading state
            analyzeBtn.disabled = false;
            loadingMsg.style.display = 'none';
            loadingMsg.textContent = 'Analyzing tabs...';
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
            statsContainer.style.display = 'none';
            bulkActions.style.display = 'none';
            keyboardHints.style.display = 'none';
        } else {
            // Display duplicate groups
            noDuplicates.style.display = 'none';
            closeTabsBtn.style.display = 'block';
            statsContainer.style.display = 'block';
            bulkActions.style.display = 'flex';
            keyboardHints.style.display = 'block';
            
            duplicateUrls.forEach(url => {
                const group = duplicates[url];
                const groupElement = createDuplicateGroupElement(url, group);
                duplicateGroups.appendChild(groupElement);
            });
            
            // Update statistics
            updateStatistics();
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
            
            // Check if tab is protected (only pinned tabs)
            const isProtected = tab.pinned;
            
            if (isProtected) {
                tabCheckbox.disabled = true;
                tabDiv.style.opacity = '0.6';
            } else if (userSettings.autoSelect && index > 0) {
                // Auto-select duplicates but keep first non-protected tab unchecked
                tabCheckbox.checked = true;
            }
            
            tabCheckbox.addEventListener('change', function() {
                updateGroupCheckboxState(groupDiv);
                updateStatistics();
            });
            
            const tabTitle = document.createElement('span');
            tabTitle.className = 'tab-title';
            tabTitle.textContent = tab.title || 'Untitled Tab';
            tabTitle.title = tab.title || 'Untitled Tab';
            
            // Add visual indicators for pinned tabs
            if (tab.pinned) {
                tabTitle.textContent += ' 📌';
                tabTitle.title += ' (Pinned - Protected)';
                tabTitle.style.fontStyle = 'italic';
            }
            
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
            // Select all duplicates but keep first non-protected tab unchecked
            let firstNonProtectedFound = false;
            tabs.forEach((checkbox, index) => {
                if (!checkbox.disabled) {
                    if (!firstNonProtectedFound) {
                        checkbox.checked = false; // Keep first non-protected tab unchecked
                        firstNonProtectedFound = true;
                    } else {
                        checkbox.checked = true;
                    }
                }
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
        const enabledCheckboxes = groupElement.querySelectorAll('.tab-checkbox:not(:disabled)');
        const checkedTabs = groupElement.querySelectorAll('.tab-checkbox:checked');
        
        if (checkedTabs.length === 0) {
            groupCheckbox.checked = false;
            groupCheckbox.indeterminate = false;
        } else if (checkedTabs.length === enabledCheckboxes.length - 1) { // All but one enabled tab selected
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
            
            // Confirm action based on user settings
            if (userSettings.confirmClose) {
                const confirmMessage = `Are you sure you want to close ${selectedTabIds.length} tab${selectedTabIds.length === 1 ? '' : 's'}?`;
                if (!confirm(confirmMessage)) {
                    return;
                }
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
                // Show undo button if tabs were closed successfully
                if (response.canUndo) {
                    const undo = createUndoButton();
                    undo.style.display = 'block';
                }
                
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
    
    async function undoLastClose() {
        if (!undoBtn) return;
        
        try {
            undoBtn.disabled = true;
            undoBtn.textContent = 'Restoring...';
            
            const response = await chrome.runtime.sendMessage({ action: 'undoClose' });
            
            if (response.error) {
                alert('Error undoing: ' + response.error);
                return;
            }
            
            if (response.success) {
                // Hide undo button after successful undo
                undoBtn.style.display = 'none';
                
                // Re-analyze tabs to update the display
                await analyzeTabs();
            } else {
                alert('Undo failed: ' + response.message);
            }
        } catch (error) {
            console.error('Error undoing close:', error);
            alert('Error undoing: ' + error.message);
        } finally {
            if (undoBtn) {
                undoBtn.disabled = false;
                undoBtn.textContent = 'Undo Last Close';
            }
        }
    }
    
    function selectAllDuplicates() {
        const groupCheckboxes = document.querySelectorAll('.group-checkbox');
        groupCheckboxes.forEach(checkbox => {
            if (!checkbox.disabled) {
                checkbox.checked = true;
                const groupElement = checkbox.closest('.duplicate-group');
                toggleGroupSelection(groupElement, true);
            }
        });
        updateStatistics();
    }
    
    function selectNoneDuplicates() {
        const groupCheckboxes = document.querySelectorAll('.group-checkbox');
        groupCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
            const groupElement = checkbox.closest('.duplicate-group');
            toggleGroupSelection(groupElement, false);
        });
        updateStatistics();
    }
    
    function updateStatistics() {
        const groups = Object.keys(currentDuplicates);
        let totalDuplicates = 0;
        let totalProtected = 0;
        let totalSelected = 0;
        
        groups.forEach(url => {
            const tabs = currentDuplicates[url];
            totalDuplicates += tabs.length;
            
            tabs.forEach(tab => {
                if (tab.pinned) {
                    totalProtected++;
                }
            });
        });
        
        const selectedCheckboxes = document.querySelectorAll('.tab-checkbox:checked');
        totalSelected = selectedCheckboxes.length;
        
        // Update display
        groupCount.textContent = groups.length;
        duplicateCount.textContent = totalDuplicates;
        selectedCount.textContent = totalSelected;
        protectedCount.textContent = totalProtected;
        
        // Enable/disable close button based on selection
        closeTabsBtn.disabled = totalSelected === 0;
    }
    
    function exportDuplicateList() {
        const groups = Object.keys(currentDuplicates);
        let exportText = 'Duplicate Tab Report\n';
        exportText += '==================\n\n';
        exportText += `Generated: ${new Date().toLocaleString()}\n`;
        exportText += `Total Groups: ${groups.length}\n`;
        
        let totalTabs = 0;
        groups.forEach(url => {
            totalTabs += currentDuplicates[url].length;
        });
        exportText += `Total Duplicate Tabs: ${totalTabs}\n\n`;
        
        groups.forEach((url, index) => {
            const tabs = currentDuplicates[url];
            exportText += `Group ${index + 1}: ${url}\n`;
            exportText += `Tabs (${tabs.length}):\n`;
            
            tabs.forEach((tab, tabIndex) => {
                const status = tab.pinned ? ' [PINNED]' : '';
                exportText += `  ${tabIndex + 1}. ${tab.title}${status}\n`;
            });
            exportText += '\n';
        });
        
        // Create and trigger download
        const blob = new Blob([exportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `duplicate-tabs-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Show feedback
        const originalText = exportBtn.textContent;
        exportBtn.textContent = 'Exported!';
        exportBtn.style.backgroundColor = '#218838';
        setTimeout(() => {
            exportBtn.textContent = originalText;
            exportBtn.style.backgroundColor = '#28a745';
        }, 1500);
    }
    
    function handleKeyboardShortcuts(e) {
        // Only handle shortcuts when Alt key is pressed
        if (!e.altKey || e.ctrlKey || e.shiftKey) return;
        
        switch(e.code) {
            case 'KeyA':
                e.preventDefault();
                if (!analyzeBtn.disabled) {
                    analyzeTabs();
                }
                break;
            case 'KeyS':
                e.preventDefault();
                if (selectAllBtn.style.display !== 'none') {
                    selectAllDuplicates();
                }
                break;
            case 'KeyN':
                e.preventDefault();
                if (selectNoneBtn.style.display !== 'none') {
                    selectNoneDuplicates();
                }
                break;
            case 'KeyC':
                e.preventDefault();
                if (closeTabsBtn.style.display !== 'none' && !closeTabsBtn.disabled) {
                    closeSelectedTabs();
                }
                break;
            case 'KeyE':
                e.preventDefault();
                if (exportBtn.style.display !== 'none') {
                    exportDuplicateList();
                }
                break;
        }
    }
    
    function toggleSettings() {
        const isVisible = settingsPanel.style.display !== 'none';
        settingsPanel.style.display = isVisible ? 'none' : 'block';
    }
    
    async function loadSettings() {
        try {
            const result = await chrome.storage.sync.get('userSettings');
            if (result.userSettings) {
                userSettings = { ...userSettings, ...result.userSettings };
            }
            updateSettingsUI();
        } catch (error) {
            console.warn('Could not load settings:', error);
        }
    }
    
    async function saveSettings() {
        userSettings = {
            confirmClose: confirmCloseSetting.checked,
            autoSelect: autoSelectSetting.checked,
            performanceMode: performanceModeSetting.checked
        };
        
        try {
            await chrome.storage.sync.set({ userSettings });
            
            // Visual feedback
            const originalText = saveSettingsBtn.textContent;
            saveSettingsBtn.textContent = 'Saved!';
            saveSettingsBtn.style.backgroundColor = '#28a745';
            saveSettingsBtn.style.color = 'white';
            
            setTimeout(() => {
                saveSettingsBtn.textContent = originalText;
                saveSettingsBtn.style.backgroundColor = '';
                saveSettingsBtn.style.color = '';
            }, 1500);
        } catch (error) {
            console.error('Could not save settings:', error);
            alert('Could not save settings. Please try again.');
        }
    }
    
    function resetSettings() {
        userSettings = {
            confirmClose: true,
            autoSelect: true,
            performanceMode: false
        };
        updateSettingsUI();
        
        // Visual feedback
        const originalText = resetSettingsBtn.textContent;
        resetSettingsBtn.textContent = 'Reset!';
        setTimeout(() => {
            resetSettingsBtn.textContent = originalText;
        }, 1000);
    }
    
    function updateSettingsUI() {
        confirmCloseSetting.checked = userSettings.confirmClose;
        autoSelectSetting.checked = userSettings.autoSelect;
        performanceModeSetting.checked = userSettings.performanceMode;
    }
});