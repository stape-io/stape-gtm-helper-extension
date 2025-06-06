function injectGTMHelper() {
  // Check if already injected
  if (document.querySelector('.gtm-helper')) {
    console.log('GTM Helper already injected');
    return;
  }
  
  let selectedValues = [];
  let currentTab = 'none';
  
  // Detect which tab is currently active
  const detectActiveTab = () => {
    const tagsTab = document.querySelector('tags-tab[aria-hidden="false"]');
    const variablesTab = document.querySelector('variables-tab[aria-hidden="false"]');
    
    if (tagsTab) return 'tags';
    if (variablesTab) return 'variables';
    return 'none';
  };
  
  // Get tag data from the page (only visible cards) - but always include all available types
  const getTagData = () => {
    try {
      // Get ALL tag cards (both visible and hidden) to ensure we have all tag types in dropdown
      const allTags = Array.from(document.querySelectorAll('.tags-tab__tag.gtm-debug-card, .tags-tab__blocked-tags.gtm-debug-card .wd-nominated-tag-type'));
      
      const tagNames = allTags.map(e => e.childNodes[3].innerHTML.split('<')[0].trim());
      const tagCounts = tagNames.reduce((acc, name) => (acc[name] = (acc[name] || 0) + 1, acc), {});
      return Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
    } catch (error) {
      console.warn('Could not extract tag data:', error);
      return [];
    }
  };
  
  // Get variable data from the page (only visible cards) - but always include all available types
  const getVariableData = () => {
    try {
      let variableTypes = [];
      
      // Try to get from table format first
      const variableTable = document.querySelector('.gtm-debug-variable-table');
      if (variableTable) {
        const tableRows = Array.from(variableTable.querySelectorAll('tbody tr.gtm-debug-variable-table-row'));
        variableTypes = tableRows.map(row => {
          const cells = row.querySelectorAll('td');
          // Second column (index 1) contains the variable type
          return cells[1] ? cells[1].textContent.trim() : 'Unknown Variable Type';
        });
      } else {
        // Fallback to card format
        const allVariables = Array.from(document.querySelectorAll('.variables-tab .gtm-debug-card'));
        variableTypes = allVariables.map(e => {
          const typeElement = e.querySelector('.variable-type') || e.querySelector('[class*="type"]');
          return typeElement ? typeElement.textContent.trim() : 'Unknown Variable Type';
        });
      }
      
      const typeCounts = variableTypes.reduce((acc, type) => (acc[type] = (acc[type] || 0) + 1, acc), {});
      return Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
    } catch (error) {
      console.warn('Could not extract variable data:', error);
      return [];
    }
  };
  
  // CSS styles
  const styles = `
    .gtm-helper { 
      background: white; 
      border: 1px solid #e5e7eb; 
      border-radius: 8px; 
      box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
      margin-bottom: 16px;
      font-family: "Google Sans", Roboto, Helvetica, Arial, sans-serif;
    }
    .gtm-header { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      padding: 12px 16px; 
      cursor: pointer; 
      border-bottom: 1px solid #f3f4f6;
    }
    .gtm-title { display: flex; align-items: center; gap: 8px; font-weight: bold; }
    .gtm-content { 
      padding: 16px; 
      display: block; 
      border-top: 1px solid #f3f4f6;
    }
    .gtm-content.hidden { display: none; }
    .gtm-toggle { 
      transition: transform 0.3s; 
      display: flex; 
      align-items: center; 
      color: #6b7280;
    }
    .gtm-toggle.collapsed { transform: rotate(-90deg); }
    
    .gtm-controls {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      align-items: start;
    }
    
    @media (max-width: 640px) {
      .gtm-controls {
        grid-template-columns: 1fr;
      }
    }
    
    .gtm-control-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
    }
    
    .gtm-control-label {
      font-size: 12px;
      font-weight: 500;
      color: #374151;
    }
    
    .gtm-select, .gtm-input {
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      font-family: inherit;
      background: white;
      min-width: 120px;
    }
    
    .gtm-select:focus, .gtm-input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    .gtm-multiselect {
      position: relative;
      min-width: 200px;
    }
    
    .gtm-multiselect-display {
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      background: white;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      min-height: 20px;
    }
    
    .gtm-multiselect-display:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    .gtm-multiselect-tags {
      display: flex;
      align-items: center;
      flex: 1;
    }
    
    .gtm-selected-count {
      color: #374151;
      font-size: 14px;
    }
    
    .gtm-selected-count.placeholder {
      color: #9ca3af;
    }
    
    .gtm-multiselect-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      max-height: 200px;
      overflow-y: auto;
      display: none;
    }
    
    .gtm-multiselect-dropdown.open {
      display: block;
    }
    
    .gtm-multiselect-option {
      padding: 10px 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      transition: background-color 0.2s;
    }
    
    .gtm-option-left {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
    }
    
    .gtm-multiselect-option:hover {
      background: #f9fafb;
    }
    
    .gtm-multiselect-option.selected {
      background: #eff6ff;
    }
    
    .gtm-checkbox {
      position: relative;
      width: 16px;
      height: 16px;
      appearance: none;
      border: 2px solid #d1d5db;
      border-radius: 3px;
      background: white;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .gtm-checkbox:checked {
      background: #3b82f6;
      border-color: #3b82f6;
    }
    
    .gtm-checkbox:checked::after {
      content: '✓';
      position: absolute;
      top: -1px;
      left: 1px;
      color: white;
      font-size: 12px;
      font-weight: bold;
    }
    
    .gtm-checkbox:hover {
      border-color: #3b82f6;
    }
    
    .gtm-option-label {
      font-size: 14px;
      color: #374151;
      user-select: none;
    }
    
    .gtm-option-badge {
      background: #e5e7eb;
      color: #374151;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 7px;
      border-radius: 10px;
      min-width: 18px;
      text-align: center;
      flex-shrink: 0;
    }
    
    .gtm-input::placeholder {
      color: #9ca3af;
    }
    
    /* Hide filtered cards */
    .ng-hide {
      display: none !important;
    }
  `;
  
  // Generate options HTML
  const generateOptionsHTML = (data) => {
    if (data.length === 0) {
      return '<div class="gtm-multiselect-option" style="padding: 16px; text-align: center; color: #9ca3af;">No items found</div>';
    }
    
    return data.map(item => {
      const value = item.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      return `
        <div class="gtm-multiselect-option" data-value="${value}" data-name="${item.name}">
          <div class="gtm-option-left">
            <input type="checkbox" class="gtm-checkbox"> 
            <span class="gtm-option-label">${item.name}</span>
          </div>
          <span class="gtm-option-badge">${item.count}</span>
        </div>
      `;
    }).join('');
  };
  
  // Generate content based on active tab
  const generateContent = () => {
    const tab = detectActiveTab();
    currentTab = tab;
    
    if (tab === 'tags') {
      const tagData = getTagData();
      return `
        <div class="gtm-controls">
          <div class="gtm-control-group">
            <label class="gtm-control-label">Tag Type</label>
            <div class="gtm-multiselect" id="gtm-multiselect">
              <div class="gtm-multiselect-display" tabindex="0">
                <div class="gtm-multiselect-tags" id="gtm-selected-tags">
                  <span class="gtm-selected-count placeholder">Select tag types...</span>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6,9 12,15 18,9"></polyline>
                </svg>
              </div>
              <div class="gtm-multiselect-dropdown" id="gtm-dropdown">
                ${generateOptionsHTML(tagData)}
              </div>
            </div>
          </div>
          <div class="gtm-control-group">
            <label class="gtm-control-label">Search Tags</label>
            <input type="text" class="gtm-input" id="gtm-search-input" placeholder="Search tags..." />
          </div>
        </div>
      `;
    } else if (tab === 'variables') {
      const variableData = getVariableData();
      return `
        <div class="gtm-controls">
          <div class="gtm-control-group">
            <label class="gtm-control-label">Variable Type</label>
            <div class="gtm-multiselect" id="gtm-multiselect">
              <div class="gtm-multiselect-display" tabindex="0">
                <div class="gtm-multiselect-tags" id="gtm-selected-tags">
                  <span class="gtm-selected-count placeholder">Select variable types...</span>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6,9 12,15 18,9"></polyline>
                </svg>
              </div>
              <div class="gtm-multiselect-dropdown" id="gtm-dropdown">
                ${generateOptionsHTML(variableData)}
              </div>
            </div>
          </div>
          <div class="gtm-control-group">
            <label class="gtm-control-label">Variable Name</label>
            <input type="text" class="gtm-input" id="gtm-name-input" placeholder="Search by name..." />
          </div>
        </div>
        <div class="gtm-controls" style="margin-top: 12px;">
          <div class="gtm-control-group">
            <label class="gtm-control-label">Variable Value</label>
            <input type="text" class="gtm-input" id="gtm-value-input" placeholder="Search by value..." />
          </div>
          <div class="gtm-control-group"></div>
        </div>
      `;
    } else {
      return `
        <div style="padding: 24px; text-align: center; color: #6b7280;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 12px; opacity: 0.5;">
            <path d="M9 12l2 2 4-4"></path>
            <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
            <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
          </svg>
          <h3 style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #374151;">No Active Tab</h3>
          <p style="margin: 0; font-size: 14px;">Switch to the Tags or Variables tab to use filtering options</p>
        </div>
      `;
    }
  };
  
  // Create and inject the helper - always inject, regardless of tab state
  const block = `
    <div class="gtm-helper">
      <div class="gtm-header" id="gtm-header">
        <div class="gtm-title">
          <img src="https://cdn.brandfetch.io/id17gi1DlV/w/800/h/365/theme/light/logo.png?c=1bxid64Mup7aczewSAYMX&t=1742838995174"
            width="48" height="48" alt="Stape Logo" />
          <span>GTM HELPER</span>
        </div>
        <span class="gtm-toggle">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6,9 12,15 18,9"></polyline>
          </svg>
        </span>
      </div>
      <div class="gtm-content" id="gtm-content">
        ${generateContent()}
      </div>
    </div>
  `;
  
  // Find target element
  const targetElement = document.querySelector('.blg-title.debugger-content-component__title');
  if (!targetElement) {
    console.warn('Target element not found');
    return;
  }
  
  // Inject CSS
  if (!document.querySelector('#gtm-helper-styles')) {
    const style = document.createElement('style');
    style.id = 'gtm-helper-styles';
    style.textContent = styles;
    document.head.appendChild(style);
  }
  
  // Inject HTML
  targetElement.insertAdjacentHTML('afterend', block);
  
  // Setup event listeners - header toggle always works
  setupEventListeners();
  
  // Update content based on current tab
  updateContentBasedOnTab();
  
  function setupEventListeners() {
    // Toggle functionality - always works regardless of tab
    const header = document.getElementById('gtm-header');
    if (header) {
      // Remove existing listeners to prevent duplicates
      const newHeader = header.cloneNode(true);
      header.parentNode.replaceChild(newHeader, header);
      
      newHeader.addEventListener('click', function() {
        const content = document.getElementById('gtm-content');
        const toggle = document.querySelector('.gtm-toggle');
        if (content) content.classList.toggle('hidden');
        if (toggle) toggle.classList.toggle('collapsed');
        console.log('GTM Helper toggled');
      });
    }
    
    // Setup content-specific listeners only if we have active content
    if (currentTab === 'tags' || currentTab === 'variables') {
      setupContentListeners();
    }
  }
  
  function setupContentListeners() {
    // Multi-select functionality
    setupMultiSelect();
    
    // Search input handlers
    const searchInput = document.getElementById('gtm-search-input');
    const nameInput = document.getElementById('gtm-name-input');
    const valueInput = document.getElementById('gtm-value-input');
    
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        console.log('Tag search:', this.value);
        applyTagSearchFilter(this.value);
      });
    }
    
    if (nameInput) {
      nameInput.addEventListener('input', function() {
        console.log('Variable name search:', this.value);
        // Apply unified filtering that respects all active filters
        if (currentTab === 'variables') {
          applyVariableFiltering();
        }
      });
    }
    
    if (valueInput) {
      valueInput.addEventListener('input', function() {
        console.log('Variable value search:', this.value);
        // Apply unified filtering that respects all active filters
        if (currentTab === 'variables') {
          applyVariableFiltering();
        }
      });
    }
  }
  
  function updateContentBasedOnTab() {
    const newTab = detectActiveTab();
    currentTab = newTab;
    
    const content = document.getElementById('gtm-content');
    if (content) {
      selectedValues = []; // Reset selections when tab changes
      content.innerHTML = generateContent();
      
      // Only setup content listeners if we have an active tab
      if (currentTab === 'tags' || currentTab === 'variables') {
        setupContentListeners();
      }
    }
  }
  
  function setupMultiSelect() {
    const multiselect = document.getElementById('gtm-multiselect');
    const dropdown = document.getElementById('gtm-dropdown');
    
    if (!multiselect || !dropdown) return;
    
    const display = multiselect.querySelector('.gtm-multiselect-display');
    
    if (display) {
      // Remove existing listeners
      const newDisplay = display.cloneNode(true);
      display.parentNode.replaceChild(newDisplay, display);
      
      newDisplay.addEventListener('click', function() {
        dropdown.classList.toggle('open');
      });
    }
    
    // Close dropdown when clicking outside
    const outsideClickHandler = function(e) {
      if (!multiselect.contains(e.target)) {
        dropdown.classList.remove('open');
      }
    };
    
    // Remove existing outside click listeners and add new one
    document.removeEventListener('click', window.gtmHelperOutsideClick);
    window.gtmHelperOutsideClick = outsideClickHandler;
    document.addEventListener('click', outsideClickHandler);
    
    // Setup option listeners
    setupOptionListeners();
  }
  
  function setupOptionListeners() {
    const dropdown = document.getElementById('gtm-dropdown');
    if (!dropdown) return;
    
    const options = dropdown.querySelectorAll('.gtm-multiselect-option');
    options.forEach(option => {
      option.addEventListener('click', function(e) {
        e.stopPropagation();
        const checkbox = this.querySelector('.gtm-checkbox');
        const value = this.getAttribute('data-value');
        const name = this.getAttribute('data-name');
        
        if (!checkbox || !value) return;
        
        checkbox.checked = !checkbox.checked;
        
        if (checkbox.checked) {
          if (!selectedValues.some(item => item.value === value)) {
            selectedValues.push({ value, name });
          }
          this.classList.add('selected');
        } else {
          selectedValues = selectedValues.filter(item => item.value !== value);
          this.classList.remove('selected');
        }
        
        updateSelectedCount();
        handleFilterChange();
      });
    });
  }
  
  function updateSelectedCount() {
    const countElement = document.querySelector('.gtm-selected-count');
    if (!countElement) return;
    
    if (selectedValues.length === 0) {
      const typeText = currentTab === 'variables' ? 'variable types' : 'tag types';
      countElement.textContent = `Select ${typeText}...`;
      countElement.classList.add('placeholder');
    } else if (selectedValues.length === 1) {
      const typeText = currentTab === 'variables' ? 'variable type' : 'tag type';
      countElement.textContent = `1 ${typeText} selected`;
      countElement.classList.remove('placeholder');
    } else {
      const typeText = currentTab === 'variables' ? 'variable types' : 'tag types';
      countElement.textContent = `${selectedValues.length} ${typeText} selected`;
      countElement.classList.remove('placeholder');
    }
  }
  
  function handleFilterChange() {
    console.log(`${currentTab} filter changed:`, selectedValues);
    
    if (currentTab === 'tags') {
      applyTagFiltering();
    } else if (currentTab === 'variables') {
      applyVariableFiltering();
    }
  }
  
  function applyTagFiltering() {
    const allTagCards = document.querySelectorAll('.tags-tab__tag.gtm-debug-card, .tags-tab__blocked-tags.gtm-debug-card .wd-nominated-tag-type');
    
    // Get current search text (if any)
    const searchInput = document.getElementById('gtm-search-input');
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    
    if (selectedValues.length === 0 && !searchTerm) {
      // No filters selected and no search - show all tags
      allTagCards.forEach(card => {
        card.classList.remove('ng-hide');
      });
      console.log('No tag filters selected - showing all tags');
      return;
    }
    
    // Get selected tag type names
    const selectedTagTypes = selectedValues.map(item => item.name);
    const searchLower = searchTerm.toLowerCase();
    
    console.log('Applying tag filtering - Types:', selectedTagTypes, 'Search:', searchTerm);
    
    let hiddenCount = 0;
    let visibleCount = 0;
    
    allTagCards.forEach(card => {
      try {
        // Extract tag type from the card
        const tagTypeElement = card.childNodes[3];
        const tagType = tagTypeElement ? tagTypeElement.innerHTML.split('<')[0].trim() : '';
        
        // Check if tag type matches selected filters (if any)
        let typeMatches = true;
        if (selectedValues.length > 0) {
          typeMatches = selectedTagTypes.includes(tagType);
        }
        
        // Check if tag title matches search term (if any)
        let searchMatches = true;
        if (searchTerm) {
          const titleElement = card.querySelector('.gtm-debug-card__title');
          if (titleElement) {
            const titleText = titleElement.textContent.toLowerCase();
            searchMatches = titleText.includes(searchLower);
          } else {
            // Fallback to full card text if no title element found
            const cardText = card.textContent.toLowerCase();
            searchMatches = cardText.includes(searchLower);
          }
        }
        
        // BOTH conditions must be true for tag to be visible
        if (typeMatches && searchMatches) {
          card.classList.remove('ng-hide');
          visibleCount++;
        } else {
          card.classList.add('ng-hide');
          hiddenCount++;
        }
      } catch (error) {
        console.warn('Error processing tag card:', error, card);
        // Hide cards we can't process
        card.classList.add('ng-hide');
        hiddenCount++;
      }
    });
    
    const filterSummary = [
      selectedValues.length > 0 ? `Type: YES` : 'Type: ANY',
      searchTerm ? `Search: "${searchTerm}"` : 'Search: ANY'
    ].join(', ');
    
    console.log(`Tag filtering applied - ${filterSummary} → ${visibleCount} visible, ${hiddenCount} hidden`);
  }
  
  function applyVariableFiltering() {
    // Check if we have table format or card format
    const variableTable = document.querySelector('.gtm-debug-variable-table');
    
    if (variableTable) {
      applyVariableTableFiltering();
    } else {
      applyVariableCardFiltering();
    }
  }
  
  function applyVariableTableFiltering() {
    const allVariableRows = document.querySelectorAll('.gtm-debug-variable-table tbody tr.gtm-debug-variable-table-row');
    
    // Get current search terms (if any)
    const nameInput = document.getElementById('gtm-name-input');
    const valueInput = document.getElementById('gtm-value-input');
    const nameSearch = nameInput ? nameInput.value.trim().toLowerCase() : '';
    const valueSearch = valueInput ? valueInput.value.trim().toLowerCase() : '';
    
    if (selectedValues.length === 0 && !nameSearch && !valueSearch) {
      // No filters selected and no searches - show all variables
      allVariableRows.forEach(row => {
        row.classList.remove('ng-hide');
      });
      console.log('No variable filters selected - showing all variable rows');
      return;
    }
    
    // Get selected variable type names
    const selectedVariableTypes = selectedValues.map(item => item.name);
    
    console.log('Applying variable table filtering - Types:', selectedVariableTypes, 'Name:', nameSearch, 'Value:', valueSearch);
    
    let hiddenCount = 0;
    let visibleCount = 0;
    
    allVariableRows.forEach(row => {
      try {
        const cells = row.querySelectorAll('td');
        if (cells.length < 4) {
          row.classList.add('ng-hide');
          hiddenCount++;
          return;
        }
        
        // Extract data from table cells
        const variableName = cells[0].textContent.trim(); // First column: variable name
        const variableType = cells[1].textContent.trim(); // Second column: variable type
        const variableValue = cells[3].textContent.trim(); // Fourth column: variable value
        
        // Check if variable type matches selected filters (if any)
        let typeMatches = true;
        if (selectedValues.length > 0) {
          typeMatches = selectedVariableTypes.includes(variableType);
        }
        
        // Check if variable name matches search term (if any)
        let nameMatches = true;
        if (nameSearch) {
          nameMatches = variableName.toLowerCase().includes(nameSearch);
        }
        
        // Check if variable value matches search term (if any)
        let valueMatches = true;
        if (valueSearch) {
          valueMatches = variableValue.toLowerCase().includes(valueSearch);
        }
        
        // ALL conditions must be true for variable to be visible
        if (typeMatches && nameMatches && valueMatches) {
          row.classList.remove('ng-hide');
          visibleCount++;
        } else {
          row.classList.add('ng-hide');
          hiddenCount++;
        }
      } catch (error) {
        console.warn('Error processing variable table row:', error, row);
        // Hide rows we can't process
        row.classList.add('ng-hide');
        hiddenCount++;
      }
    });
    
    const filterSummary = [
      selectedValues.length > 0 ? `Type: YES` : 'Type: ANY',
      nameSearch ? `Name: "${nameSearch}"` : 'Name: ANY',
      valueSearch ? `Value: "${valueSearch}"` : 'Value: ANY'
    ].join(', ');
    
    console.log(`Variable table filtering applied - ${filterSummary} → ${visibleCount} visible, ${hiddenCount} hidden`);
  }
  
  function applyVariableCardFiltering() {
    const allVariableCards = document.querySelectorAll('.variables-tab .gtm-debug-card');
    
    // Get current search terms (if any)
    const nameInput = document.getElementById('gtm-name-input');
    const valueInput = document.getElementById('gtm-value-input');
    const nameSearch = nameInput ? nameInput.value.trim().toLowerCase() : '';
    const valueSearch = valueInput ? valueInput.value.trim().toLowerCase() : '';
    
    if (selectedValues.length === 0 && !nameSearch && !valueSearch) {
      // No filters selected and no searches - show all variables
      allVariableCards.forEach(card => {
        card.classList.remove('ng-hide');
      });
      console.log('No variable filters selected - showing all variable cards');
      return;
    }
    
    // Get selected variable type names
    const selectedVariableTypes = selectedValues.map(item => item.name);
    
    console.log('Applying variable card filtering - Types:', selectedVariableTypes, 'Name:', nameSearch, 'Value:', valueSearch);
    
    let hiddenCount = 0;
    let visibleCount = 0;
    
    allVariableCards.forEach(card => {
      try {
        // Extract variable type from the card
        const typeElement = card.querySelector('.variable-type') || card.querySelector('[class*="type"]');
        const variableType = typeElement ? typeElement.textContent.trim() : '';
        
        // Check if variable type matches selected filters (if any)
        let typeMatches = true;
        if (selectedValues.length > 0) {
          typeMatches = selectedVariableTypes.includes(variableType);
        }
        
        // Check if variable name matches search term (if any)
        let nameMatches = true;
        if (nameSearch) {
          const titleElement = card.querySelector('.gtm-debug-card__title');
          if (titleElement) {
            const titleText = titleElement.textContent.toLowerCase();
            nameMatches = titleText.includes(nameSearch);
          } else {
            const cardText = card.textContent.toLowerCase();
            nameMatches = cardText.includes(nameSearch);
          }
        }
        
        // Check if variable value matches search term (if any)
        let valueMatches = true;
        if (valueSearch) {
          const cardText = card.textContent.toLowerCase();
          valueMatches = cardText.includes(valueSearch);
        }
        
        // ALL conditions must be true for variable to be visible
        if (typeMatches && nameMatches && valueMatches) {
          card.classList.remove('ng-hide');
          visibleCount++;
        } else {
          card.classList.add('ng-hide');
          hiddenCount++;
        }
      } catch (error) {
        console.warn('Error processing variable card:', error, card);
        // Hide cards we can't process
        card.classList.add('ng-hide');
        hiddenCount++;
      }
    });
    
    const filterSummary = [
      selectedValues.length > 0 ? `Type: YES` : 'Type: ANY',
      nameSearch ? `Name: "${nameSearch}"` : 'Name: ANY',
      valueSearch ? `Value: "${valueSearch}"` : 'Value: ANY'
    ].join(', ');
    
    console.log(`Variable card filtering applied - ${filterSummary} → ${visibleCount} visible, ${hiddenCount} hidden`);
  }
  
  function applyTagSearchFilter(searchTerm) {
    const allTagCards = document.querySelectorAll('.tags-tab__tag.gtm-debug-card, .tags-tab__blocked-tags.gtm-debug-card .wd-nominated-tag-type');
    
    if (!searchTerm.trim()) {
      // No search term - only apply type filtering
      applyTagFiltering();
      return;
    }
    
    const searchLower = searchTerm.toLowerCase();
    console.log('Applying tag search filter:', searchTerm);
    
    let hiddenCount = 0;
    let visibleCount = 0;
    
    allTagCards.forEach(card => {
      try {
        // Get tag type
        const tagTypeElement = card.childNodes[3];
        const tagType = tagTypeElement ? tagTypeElement.innerHTML.split('<')[0].trim() : '';
        
        // Check if tag type matches selected filters (if any)
        let typeMatches = true;
        if (selectedValues.length > 0) {
          const selectedTagTypes = selectedValues.map(item => item.name);
          typeMatches = selectedTagTypes.includes(tagType);
        }
        
        // Check if tag title matches search term
        let searchMatches = false;
        const titleElement = card.querySelector('.gtm-debug-card__title');
        if (titleElement) {
          const titleText = titleElement.textContent.toLowerCase();
          searchMatches = titleText.includes(searchLower);
        } else {
          // Fallback to full card text if no title element found
          const cardText = card.textContent.toLowerCase();
          searchMatches = cardText.includes(searchLower);
        }
        
        // BOTH conditions must be true for tag to be visible
        if (typeMatches && searchMatches) {
          card.classList.remove('ng-hide');
          visibleCount++;
        } else {
          card.classList.add('ng-hide');
          hiddenCount++;
        }
      } catch (error) {
        console.warn('Error processing tag card for search:', error, card);
        card.classList.add('ng-hide');
        hiddenCount++;
      }
    });
    
    console.log(`Tag filtering applied - Type: ${selectedValues.length > 0 ? 'YES' : 'ANY'}, Search: "${searchTerm}" → ${visibleCount} visible, ${hiddenCount} hidden`);
  }
  
  function applyVariableNameFilter(searchTerm) {
    applyVariableSearch('name', searchTerm);
  }
  
  function applyVariableValueFilter(searchTerm) {
    applyVariableSearch('value', searchTerm);
  }
  
  function applyVariableSearch(searchType, searchTerm) {
    const allVariableCards = document.querySelectorAll('.variables-tab .gtm-debug-card');
    
    // Get current search terms
    const nameSearch = document.getElementById('gtm-name-input')?.value?.toLowerCase() || '';
    const valueSearch = document.getElementById('gtm-value-input')?.value?.toLowerCase() || '';
    
    console.log(`Applying variable search - Name: "${nameSearch}", Value: "${valueSearch}"`);
    
    let hiddenCount = 0;
    let visibleCount = 0;
    
    allVariableCards.forEach(card => {
      try {
        // Get variable type
        const typeElement = card.querySelector('.variable-type') || card.querySelector('[class*="type"]');
        const variableType = typeElement ? typeElement.textContent.trim() : '';
        
        // Check if variable type matches selected filters (if any)
        let typeMatches = true;
        if (selectedValues.length > 0) {
          const selectedVariableTypes = selectedValues.map(item => item.name);
          typeMatches = selectedVariableTypes.includes(variableType);
        }
        
        // Check if variable name matches search term (if provided)
        let nameMatches = true;
        if (nameSearch) {
          const titleElement = card.querySelector('.gtm-debug-card__title');
          if (titleElement) {
            const titleText = titleElement.textContent.toLowerCase();
            nameMatches = titleText.includes(nameSearch);
          } else {
            const cardText = card.textContent.toLowerCase();
            nameMatches = cardText.includes(nameSearch);
          }
        }
        
        // Check if variable value matches search term (if provided)
        let valueMatches = true;
        if (valueSearch) {
          const cardText = card.textContent.toLowerCase();
          valueMatches = cardText.includes(valueSearch);
        }
        
        // ALL conditions must be true for variable to be visible
        if (typeMatches && nameMatches && valueMatches) {
          card.classList.remove('ng-hide');
          visibleCount++;
        } else {
          card.classList.add('ng-hide');
          hiddenCount++;
        }
      } catch (error) {
        console.warn('Error processing variable card for search:', error, card);
        card.classList.add('ng-hide');
        hiddenCount++;
      }
    });
    
    const filterSummary = [
      selectedValues.length > 0 ? `Type: YES` : 'Type: ANY',
      nameSearch ? `Name: "${nameSearch}"` : 'Name: ANY', 
      valueSearch ? `Value: "${valueSearch}"` : 'Value: ANY'
    ].join(', ');
    
    console.log(`Variable filtering applied - ${filterSummary} → ${visibleCount} visible, ${hiddenCount} hidden`);
  }
  
  // Monitor tab changes and card visibility
  const observer = new MutationObserver((mutations) => {
    let shouldUpdateTab = false;
    let shouldUpdateData = false;
    
    mutations.forEach(mutation => {
      // Check for tab changes
      if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
        const target = mutation.target;
        if (target.tagName === 'TAGS-TAB' || target.tagName === 'VARIABLES-TAB') {
          shouldUpdateTab = true;
        }
      }
      
      // Check for new cards being added (like "see more" functionality)
      if (mutation.type === 'childList') {
        const checkForNewCards = (nodes) => {
          for (const node of nodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if the added node is a card or contains cards
              if (node.matches && (
                node.matches('.gtm-debug-card') ||
                node.matches('.tags-tab__tag.gtm-debug-card') ||
                node.matches('.variables-tab .gtm-debug-card') ||
                node.matches('.tags-tab__blocked-tags.gtm-debug-card .wd-nominated-tag-type')
              )) {
                console.log('New GTM card detected:', node);
                return true;
              }
              
              // Check if the added node contains cards
              if (node.querySelector && (
                node.querySelector('.gtm-debug-card') ||
                node.querySelector('.tags-tab__tag.gtm-debug-card') ||
                node.querySelector('.variables-tab .gtm-debug-card') ||
                node.querySelector('.tags-tab__blocked-tags.gtm-debug-card .wd-nominated-tag-type')
              )) {
                console.log('Container with new GTM cards detected:', node);
                return true;
              }
            }
          }
          return false;
        };
        
        if (checkForNewCards(mutation.addedNodes)) {
          shouldUpdateData = true;
        }
      }
      
      // Check for card visibility changes (style, class, hidden attribute)
      if (mutation.type === 'attributes' && 
          (mutation.attributeName === 'style' || 
           mutation.attributeName === 'class' ||
           mutation.attributeName === 'hidden')) {
        
        const target = mutation.target;
        
        // Check if the mutation affects tag or variable cards
        if (target.matches && (
          target.matches('.gtm-debug-card') ||
          target.matches('.tags-tab__tag') ||
          target.matches('.variables-tab') ||
          target.closest('.gtm-debug-card') ||
          target.closest('.tags-tab') ||
          target.closest('.variables-tab')
        )) {
          shouldUpdateData = true;
        }
      }
    });
    
    // Handle tab changes
    if (shouldUpdateTab) {
      setTimeout(() => {
        const newTab = detectActiveTab();
        if (newTab !== currentTab) {
          console.log('Tab changed from', currentTab, 'to', newTab);
          const content = document.getElementById('gtm-content');
          if (content) {
            selectedValues = []; // Reset selections
            content.innerHTML = generateContent();
            setupEventListeners();
          }
        }
      }, 100);
    }
    
    // Handle data updates (debounced)
    if (shouldUpdateData) {
      clearTimeout(window.gtmHelperDataTimeout);
      window.gtmHelperDataTimeout = setTimeout(() => {
        const content = document.getElementById('gtm-content');
        if (content && (currentTab === 'tags' || currentTab === 'variables')) {
          console.log('Updating GTM Helper data due to card changes');
          
          // Get fresh data
          const newData = currentTab === 'tags' ? getTagData() : getVariableData();
          console.log('Fresh data:', newData);
          
          // Store current selections
          const currentSelections = new Set(selectedValues.map(item => item.name));
          
          // Update the dropdown with new data
          const dropdown = document.getElementById('gtm-dropdown');
          if (dropdown) {
            dropdown.innerHTML = generateOptionsHTML(newData);
            
            // Re-setup option event listeners
            setupOptionListeners();
            
            // Restore selections
            selectedValues = [];
            const options = dropdown.querySelectorAll('.gtm-multiselect-option');
            options.forEach(option => {
              const name = option.getAttribute('data-name');
              const value = option.getAttribute('data-value');
              const checkbox = option.querySelector('.gtm-checkbox');
              
              if (currentSelections.has(name)) {
                checkbox.checked = true;
                option.classList.add('selected');
                selectedValues.push({ value, name });
              }
            });
            
            updateSelectedCount();
          }
        }
      }, 200); // Reduced timeout for faster "see more" response
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-hidden', 'style', 'class', 'hidden']
  });
  
  console.log('GTM Helper injected successfully');
}

export default injectGTMHelper;