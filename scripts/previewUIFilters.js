export function previewUIFilters(isEnabled = true) {
  console.log("STAPE GTM HELPER: Starting Preview UI Filters", { isEnabled })
  window.__stape_extension = window.__stape_extension || {};
  
  function PreviewUIFiltersMonitor() {
    const stylesId = 'preview-ui-filters-styles';
    const containerId = 'stape-preview-filters-container';
    
    const monitor = {
      observer: null,
      debounceTimer: null,
      currentTab: 'none',
      searchQuery: '',
      selectedFilters: [],
      isCollapsed: true
    };

    monitor.detectActiveTab = function() {
      const tagsTab = document.querySelector('tags-tab[aria-hidden="false"]');
      const variablesTab = document.querySelector('variables-tab[aria-hidden="false"]');
      
      console.log('STAPE: Tab detection', {
        tagsTab: !!tagsTab,
        variablesTab: !!variablesTab,
        allTagsTabs: document.querySelectorAll('tags-tab').length,
        allVariablesTabs: document.querySelectorAll('variables-tab').length
      });
      
      if (tagsTab) return 'tags';
      if (variablesTab) return 'variables';
      return 'none';
    };

    monitor.getTagCount = function() {
      const tags = document.querySelectorAll('tags-tab .gtm-debug-card, tags-tab__blocked-tags .gtm-debug-card');
      return tags.length;
    };

    monitor.getVariableCount = function() {
      const variables = document.querySelectorAll('variables-tab .gtm-debug-variable-table-row, variables-tab .gtm-debug-table-row, variables-tab .gtm-debug-card');
      return variables.length;
    };

    monitor.getCount = function() {
      return monitor.currentTab === 'tags' ? monitor.getTagCount() : monitor.getVariableCount();
    };

    monitor.getTagData = function() {
      // Try multiple selectors to find tags
      const selectors = [
        'tags-tab .gtm-debug-card, tags-tab__blocked-tags .gtm-debug-card',
        '.gtm-debug-card',
        'tags-tab .gtm-debug-card'
      ];
      
      let tags = null;
      for (const selector of selectors) {
        const found = document.querySelectorAll(selector);
        if (found.length > 0) {
          tags = found;
          break;
        }
      }

      if (!tags || tags.length === 0) {
        return [];
      }

      const tagTypes = new Map();
      
      tags.forEach(tag => {
        const subtitleEl = tag.querySelector('.gtm-debug-card__subtitle');
        if (subtitleEl) {
          let type = subtitleEl.textContent.trim();
          
          // Split by first dash to get tag type (e.g., "Google Analytics: GA4 Event - Inactive - Fired 1 time" -> "Google Analytics: GA4 Event")
          const dashIndex = type.indexOf(' - ');
          if (dashIndex !== -1) {
            type = type.substring(0, dashIndex).trim();
          }
          
          // Ignore paused tags
          if (type.toLowerCase() !== 'paused') {
            tagTypes.set(type, (tagTypes.get(type) || 0) + 1);
          }
        }
      });
      
      const result = Array.from(tagTypes.entries()).sort((a, b) => b[1] - a[1]);
      console.log('STAPE: Tag data collected', { result, totalTags: tags.length });
      return result;
    };

    monitor.getVariableData = function() {
      const selectors = [
        'variables-tab .gtm-debug-variable-table-row',
        'variables-tab .gtm-debug-table-row',
        'variables-tab .gtm-debug-card'
      ];
      
      let variables = null;
      for (const selector of selectors) {
        const found = document.querySelectorAll(selector);
        if (found.length > 0) {
          variables = found;
          console.log(`STAPE: Using variable selector "${selector}" - found ${found.length} variables`);
          break;
        }
      }

      if (!variables || variables.length === 0) {
        return [];
      }

      const variableTypes = new Map();
      
      variables.forEach(variable => {
        let type = 'Unknown';
        
        // Based on HTML: Column 2 has class "gtm-debug-variable-table-cell-20" and contains the type
        const possibleTypeSelectors = [
          '.gtm-debug-card__subtitle',                              // Card view
          '.gtm-debug-variable-table-cell-20',                      // Table view - type column with specific class
          '.gtm-debug-table-cell:nth-child(2)'                      // Table view - second column fallback
        ];
        
        for (const selector of possibleTypeSelectors) {
          const typeEl = variable.querySelector(selector);
          if (typeEl && typeEl.textContent.trim()) {
            type = typeEl.textContent.trim();
            console.log(`STAPE: Found variable type "${type}" using selector "${selector}"`);
            break;
          }
        }
        
        if (type === 'Unknown') {
          console.log('STAPE: Could not find variable type, trying all selectors:', {
            hasSpecificClass: !!variable.querySelector('.gtm-debug-variable-table-cell-20'),
            hasSecondChild: !!variable.querySelector('.gtm-debug-table-cell:nth-child(2)'),
            allCells: variable.querySelectorAll('.gtm-debug-table-cell').length,
            innerHTML: variable.innerHTML.substring(0, 200)
          });
        }
        
        variableTypes.set(type, (variableTypes.get(type) || 0) + 1);
      });
      
      const result = Array.from(variableTypes.entries()).sort((a, b) => b[1] - a[1]);
      console.log('STAPE: Variable data collected', { result, totalVariables: variables.length });
      return result;
    };

    monitor.getData = function() {
      return monitor.currentTab === 'tags' ? monitor.getTagData() : monitor.getVariableData();
    };

    monitor.injectStyles = function() {
      let styleEl = document.getElementById(stylesId);
      if (styleEl) return;

      const styles = `
        .stape-preview-filters {
          position: fixed;
          top: 82px;
          right: 28px;
          width: 320px;
          background: #fff;
          border: 1px solid #dadce0;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          font-family: 'Google Sans', Roboto, Arial, sans-serif;
          font-size: 14px;
          z-index: 5;
          max-height: 80vh;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        
        .stape-preview-filters.collapsed {
          height: auto;
        }
        
        .stape-filters-header {
          background: #f8f9fa;
          padding: 12px 16px;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          user-select: none;
        }
        
        .stape-filters-title {
          font-weight: 500;
          color: #202124;
          display: flex;
          align-items: center;
        }
        
        .stape-filters-title img {
          width: 16px;
          height: 16px;
          margin-right: 8px;
        }
        
        .stape-filters-toggle {
          color: #5f6368;
          font-size: 16px;
          transform: rotate(0deg);
          transition: transform 0.2s ease;
        }
        
        .stape-filters-toggle.collapsed {
          transform: rotate(180deg);
        }
        
        .stape-filters-content {
          max-height: 60vh;
          overflow-y: auto;
          transition: max-height 0.3s ease;
        }
        
        .stape-filters-content.collapsed {
          max-height: 0;
          overflow: hidden;
        }
        
        .stape-filters-section {
          padding: 16px;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .stape-filters-section:last-child {
          border-bottom: none;
        }
        
        .stape-filters-section-title {
          font-weight: 500;
          margin-bottom: 12px;
          color: #202124;
        }
        
        .stape-search-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #dadce0;
          border-radius: 4px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s ease;
          box-sizing: border-box;
        }
        
        .stape-search-input:focus {
          border-color: #4285f4;
          box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.1);
        }
        
        .stape-multiselect {
          border: 1px solid #dadce0;
          border-radius: 4px;
          position: relative;
        }
        
        .stape-multiselect-header {
          padding: 8px 12px;
          background: #fff;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .stape-multiselect-header:hover {
          background: #f8f9fa;
        }
        
        .stape-multiselect-options {
          max-height: 200px;
          overflow-y: auto;
          border-top: 1px solid #e0e0e0;
          background: #fff;
          position: relative;
          display: none;
        }
        
        .stape-multiselect-options.show {
          display: block;
        }
        
        .stape-multiselect-option {
          padding: 8px 12px;
          display: flex;
          align-items: center;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        
        .stape-multiselect-option:hover {
          background: #f1f3f4;
        }
        
        .stape-multiselect-option input[type="checkbox"] {
          margin-right: 8px;
          cursor: pointer;
        }
        
        .stape-option-count {
          color: #5f6368;
          font-size: 12px;
          margin-left: auto;
        }
        
        .stape-filter-actions {
          padding: 12px 16px;
          background: #f8f9fa;
          display: flex;
          gap: 8px;
        }
        
        .stape-btn {
          padding: 6px 12px;
          border: 1px solid #dadce0;
          border-radius: 4px;
          background: #fff;
          color: #202124;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s ease;
        }
        
        .stape-btn:hover {
          background: #f1f3f4;
        }
        
        .stape-btn-primary {
          background: #4285f4;
          color: #fff;
          border-color: #4285f4;
        }
        
        .stape-btn-primary:hover {
          background: #3367d6;
        }
        
        .stape-hidden {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          height: 0 !important;
          overflow: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
        }
      `;

      styleEl = document.createElement('style');
      styleEl.id = stylesId;
      styleEl.textContent = styles;
      document.head.appendChild(styleEl);
    };

    monitor.createFilterUI = function() {
      monitor.removeFilterUI();
      
      const currentTab = monitor.detectActiveTab();
      if (currentTab === 'none') {
        console.log('STAPE: No active tab detected');
        return;
      }
      
      monitor.currentTab = currentTab;
      const data = monitor.getData();
      const count = monitor.getCount();
      
      console.log(`STAPE: Creating filter UI for ${currentTab}`, { 
        count, 
        types: data.length, 
        data: data.slice(0, 3),
        selectedFilters: monitor.selectedFilters,
        allData: data
      });
      
      if (count === 0) {
        console.log(`STAPE: No ${currentTab} found`);
        return;
      }
      
      const isTagsTab = currentTab === 'tags';
      const pluralType = isTagsTab ? 'Tags' : 'Variables';
      const singularType = isTagsTab ? 'Tag' : 'Variable';
      const searchPlaceholder = isTagsTab ? 'Search by tag name...' : 'Search by variable name or value...';
      
      const container = document.createElement('div');
      container.id = containerId;
      container.className = `stape-preview-filters ${monitor.isCollapsed ? 'collapsed' : ''}`;
      
      container.innerHTML = `
        <div class="stape-filters-header">
          <div class="stape-filters-title">
            <img src="https://stape.io/favicon.ico" alt="Stape">
            ${pluralType} Filter (${data.length} types)
          </div>
          <div class="stape-filters-toggle ${monitor.isCollapsed ? 'collapsed' : ''}">
            ▲
          </div>
        </div>
        <div class="stape-filters-content ${monitor.isCollapsed ? 'collapsed' : ''}">
          <div class="stape-filters-section">
            <div class="stape-filters-section-title">Search ${pluralType}</div>
            <input type="text" class="stape-search-input" placeholder="${searchPlaceholder}" value="${monitor.searchQuery}">
          </div>
          <div class="stape-filters-section">
            <div class="stape-filters-section-title">Filter by ${singularType} Type</div>
            <div class="stape-multiselect">
              <div class="stape-multiselect-header">
                <span>${monitor.selectedFilters.length} of ${data.length} types selected</span>
                <span>▼</span>
              </div>
              <div class="stape-multiselect-options">
                ${data.map(([type, count]) => `
                  <div class="stape-multiselect-option" data-value="${type}">
                    <input type="checkbox" value="${type}" ${monitor.selectedFilters.includes(type) ? 'checked' : ''}>
                    <span class="stape-option-label">${type}</span>
                    <span class="stape-option-count">(${count})</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
          <div class="stape-filter-actions">
            <button class="stape-btn stape-btn-primary" data-action="apply">Apply Filters</button>
            <button class="stape-btn" data-action="clear">Clear All</button>
            <button class="stape-btn" data-action="selectall">Select All</button>
          </div>
        </div>
      `;
      
      monitor.attachEventListeners(container);
      document.body.appendChild(container);
      console.log(`STAPE: Filter UI created for ${currentTab}`);
    };

    monitor.attachEventListeners = function(container) {
      const header = container.querySelector('.stape-filters-header');
      const toggle = container.querySelector('.stape-filters-toggle');
      const content = container.querySelector('.stape-filters-content');
      const searchInput = container.querySelector('.stape-search-input');
      const multiselectHeader = container.querySelector('.stape-multiselect-header');
      const multiselectOptions = container.querySelector('.stape-multiselect-options');
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      const options = container.querySelectorAll('.stape-multiselect-option');
      const buttons = container.querySelectorAll('.stape-btn');
      
      let optionsVisible = false;
      
      header.onclick = () => {
        monitor.isCollapsed = !monitor.isCollapsed;
        toggle.classList.toggle('collapsed');
        content.classList.toggle('collapsed');
      };
      
      multiselectHeader.onclick = (e) => {
        e.stopPropagation();
        optionsVisible = !optionsVisible;
        if (optionsVisible) {
          multiselectOptions.classList.add('show');
        } else {
          multiselectOptions.classList.remove('show');
        }
        console.log('STAPE: Multiselect toggled', optionsVisible);
      };
      
      searchInput.oninput = (e) => {
        monitor.searchQuery = e.target.value;
        monitor.applyFilters();
      };
      
      // Handle checkbox changes
      checkboxes.forEach(checkbox => {
        checkbox.onchange = (e) => {
          const value = e.target.value;
          if (e.target.checked) {
            if (!monitor.selectedFilters.includes(value)) {
              monitor.selectedFilters.push(value);
            }
          } else {
            monitor.selectedFilters = monitor.selectedFilters.filter(f => f !== value);
          }
          
          monitor.updateHeaderCount(container);
          console.log('STAPE: Selected filters updated:', monitor.selectedFilters);
        };
      });
      
      // Handle option clicks (entire area clickable)
      options.forEach(option => {
        option.onclick = (e) => {
          e.stopPropagation();
          
          const checkbox = option.querySelector('input[type="checkbox"]');
          const value = option.dataset.value;
          
          // Toggle checkbox
          checkbox.checked = !checkbox.checked;
          
          if (checkbox.checked) {
            if (!monitor.selectedFilters.includes(value)) {
              monitor.selectedFilters.push(value);
            }
          } else {
            monitor.selectedFilters = monitor.selectedFilters.filter(f => f !== value);
          }
          
          monitor.updateHeaderCount(container);
          console.log('STAPE: Filter toggled:', value, checkbox.checked);
        };
      });
      
      // Handle button clicks
      buttons.forEach(button => {
        button.onclick = () => {
          const action = button.dataset.action;
          
          switch (action) {
            case 'apply':
              console.log('STAPE: Apply filters');
              monitor.applyFilters();
              break;
            case 'clear':
              console.log('STAPE: Clear all filters');
              monitor.clearFilters();
              monitor.createFilterUI();
              break;
            case 'selectall':
              console.log('STAPE: Select all filters');
              monitor.selectAllFilters();
              monitor.createFilterUI();
              break;
          }
        };
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
          multiselectOptions.classList.remove('show');
          optionsVisible = false;
          
          // Also collapse the entire filter panel when clicking outside
          if (!monitor.isCollapsed) {
            monitor.isCollapsed = true;
            toggle.classList.add('collapsed');
            content.classList.add('collapsed');
          }
        }
      });
    };

    monitor.applyFilters = function() {
      console.log(`STAPE: applyFilters called for ${monitor.currentTab}`, {
        searchQuery: monitor.searchQuery,
        selectedFilters: monitor.selectedFilters,
        hasSearchQuery: monitor.searchQuery.trim() !== '',
        hasTypeFilters: monitor.selectedFilters.length > 0
      });
      
      if (monitor.currentTab === 'tags') {
        monitor.filterTags();
      } else if (monitor.currentTab === 'variables') {
        monitor.filterVariables();
      } else {
        console.log('STAPE: No active tab to filter');
      }
    };

    monitor.filterTags = function() {
      // Try multiple selectors to find tags
      const selectors = [
        'tags-tab .gtm-debug-card, tags-tab__blocked-tags .gtm-debug-card',
        '.gtm-debug-card',
        'tags-tab .gtm-debug-card'
      ];
      
      let tags = null;
      for (const selector of selectors) {
        const found = document.querySelectorAll(selector);
        if (found.length > 0) {
          tags = found;
          console.log(`STAPE: Using selector "${selector}" - found ${found.length} tags`);
          break;
        }
      }
      
      if (!tags || tags.length === 0) {
        console.log('STAPE: No tags found with any selector');
        return;
      }
      
      let visibleCount = 0;
      const hasSearchQuery = monitor.searchQuery.trim() !== '';
      const hasTypeFilters = monitor.selectedFilters.length > 0;
      
      console.log('STAPE: filterTags called', {
        tagCount: tags.length,
        searchQuery: monitor.searchQuery,
        selectedFilters: monitor.selectedFilters,
        hasSearchQuery,
        hasTypeFilters
      });
      
      tags.forEach((tag, index) => {
        const titleEl = tag.querySelector('.gtm-debug-card__title');
        const subtitleEl = tag.querySelector('.gtm-debug-card__subtitle');
        
        let visible = true;
        
        // Log tag details for debugging
        const tagTitle = titleEl ? titleEl.textContent.trim() : 'No title';
        const tagSubtitle = subtitleEl ? subtitleEl.textContent.trim() : 'No subtitle';
        
        // Always hide paused tags regardless of filters
        if (subtitleEl && subtitleEl.textContent.trim().toLowerCase() === 'paused') {
          visible = false;
          console.log(`STAPE: Tag ${index} - PAUSED (hidden):`, tagTitle);
        } else {
          // Apply type filter if selected
          if (hasTypeFilters && subtitleEl) {
            let tagType = subtitleEl.textContent.trim();
            
            // Split by first dash to get tag type
            const dashIndex = tagType.indexOf(' - ');
            if (dashIndex !== -1) {
              tagType = tagType.substring(0, dashIndex).trim();
            }
            
            visible = visible && monitor.selectedFilters.includes(tagType);
            console.log(`STAPE: Tag ${index} - Type "${tagType}" in filters:`, visible);
          }
          
          // Apply search filter if provided
          if (hasSearchQuery && titleEl && visible) {
            const tagName = titleEl.textContent.toLowerCase();
            const searchTerm = monitor.searchQuery.toLowerCase();
            visible = visible && tagName.includes(searchTerm);
            console.log(`STAPE: Tag ${index} - "${tagTitle}" contains "${searchTerm}":`, visible);
          } else if (hasSearchQuery && !titleEl) {
            visible = false;
            console.log(`STAPE: Tag ${index} - No title element, hiding during search`);
          }
        }
        
        if (visible) {
          tag.classList.remove('stape-hidden');
          tag.style.removeProperty('display');
          visibleCount++;
        } else {
          tag.classList.add('stape-hidden');
          // Also set inline style as backup
          tag.style.display = 'none';
        }
        
        // Debug logging (reduced for performance)
        if (index < 3 || !visible) {
          const hasHiddenClass = tag.classList.contains('stape-hidden');
          const isDisplayNone = tag.style.display === 'none';
          console.log(`STAPE: Tag ${index} - "${tagTitle}" - Visible: ${visible}, Hidden class: ${hasHiddenClass}, Inline style: ${isDisplayNone}`);
        }
      });
      
      console.log(`STAPE GTM HELPER: Filtered tags - ${visibleCount} visible out of ${tags.length}`);
      
      // Update tag count in UI
      monitor.updateCount(visibleCount);
    };

    monitor.filterVariables = function() {
      const selectors = [
        'variables-tab .gtm-debug-variable-table-row',
        'variables-tab .gtm-debug-table-row',
        'variables-tab .gtm-debug-card'
      ];
      
      let variables = null;
      for (const selector of selectors) {
        const found = document.querySelectorAll(selector);
        if (found.length > 0) {
          variables = found;
          console.log(`STAPE: Using selector "${selector}" - found ${found.length} variables`);
          break;
        }
      }
      
      if (!variables || variables.length === 0) {
        console.log('STAPE: No variables found with any selector');
        return;
      }
      
      let visibleCount = 0;
      const hasSearchQuery = monitor.searchQuery.trim() !== '';
      const hasTypeFilters = monitor.selectedFilters.length > 0;
      
      console.log('STAPE: filterVariables called', {
        variableCount: variables.length,
        searchQuery: monitor.searchQuery,
        selectedFilters: monitor.selectedFilters,
        hasSearchQuery,
        hasTypeFilters
      });
      
      variables.forEach((variable, index) => {
        let visible = true;
        
        // Apply type filter if selected
        if (hasTypeFilters) {
          let variableType = 'Unknown';
          
          // Variable type is in the second column with class "gtm-debug-variable-table-cell-20"
          const possibleTypeSelectors = [
            '.gtm-debug-card__subtitle',                              // Card view
            '.gtm-debug-variable-table-cell-20',                      // Table view - type column with specific class
            '.gtm-debug-table-cell:nth-child(2)'                      // Table view - second column fallback
          ];
          
          for (const selector of possibleTypeSelectors) {
            const typeEl = variable.querySelector(selector);
            if (typeEl && typeEl.textContent.trim()) {
              variableType = typeEl.textContent.trim();
              if (index < 3) console.log(`STAPE: Variable ${index} - Found type "${variableType}" using selector "${selector}"`);
              break;
            }
          }
          
          if (variableType === 'Unknown' && index < 3) {
            console.log(`STAPE: Variable ${index} - Could not determine type, trying debug:`, {
              hasSpecificClass: !!variable.querySelector('.gtm-debug-variable-table-cell-20'),
              hasSecondChild: !!variable.querySelector('.gtm-debug-table-cell:nth-child(2)'),
              allCells: variable.querySelectorAll('.gtm-debug-table-cell').length,
              selectedFilters: monitor.selectedFilters,
              innerHTML: variable.innerHTML.substring(0, 200)
            });
          }
          
          visible = visible && monitor.selectedFilters.includes(variableType);
          if (index < 3) console.log(`STAPE: Variable ${index} - Type "${variableType}" in selected filters [${monitor.selectedFilters.join(', ')}]:`, visible);
        }
        
        // Apply search filter if provided
        if (hasSearchQuery && visible) {
          let searchMatch = false;
          const query = monitor.searchQuery.toLowerCase();
          
          // For search, we want to match ALL visible columns: Name, Return Type, and Value
          // (but NOT the Type column which is used for filtering)
          
          // Column 1: Variable Name
          const possibleNameSelectors = [
            '.gtm-debug-card__title',                    // Card view - variable name
            '.gtm-debug-chip',                           // Table view - variable name in chip
            '.gtm-debug-table-cell:first-child .gtm-debug-chip',  // First column chip
            '.gtm-debug-table-cell:first-child'          // First column fallback
          ];
          
          // Column 3: Return Type (string, boolean, etc.)
          const possibleReturnTypeSelectors = [
            '.gtm-debug-table-cell:nth-child(3)'         // Third column - return type
          ];
          
          // Column 4: Variable Value  
          const possibleValueSelectors = [
            '.gtm-debug-card__value',                    // Card view - variable value  
            '.gtm-debug-variables-value',                // Table view - value column with specific class
            '.gtm-debug-variable-table-value',           // Inner value container
            '.gtm-debug-table-cell:nth-child(4)',        // Fourth column fallback
            '.gtm-debug-table-cell:last-child'           // Last column fallback
          ];
          
          // Search in variable name (column 1)
          for (const selector of possibleNameSelectors) {
            const nameEl = variable.querySelector(selector);
            if (nameEl && nameEl.textContent.toLowerCase().includes(query)) {
              searchMatch = true;
              if (index < 3) console.log(`STAPE: Variable ${index} - Name match: "${nameEl.textContent.substring(0, 30)}"`);
              break;
            }
          }
          
          // Search in return type (column 3) - e.g. "string", "boolean"
          if (!searchMatch) {
            for (const selector of possibleReturnTypeSelectors) {
              const returnTypeEl = variable.querySelector(selector);
              if (returnTypeEl && returnTypeEl.textContent.toLowerCase().includes(query)) {
                searchMatch = true;
                if (index < 3) console.log(`STAPE: Variable ${index} - Return type match: "${returnTypeEl.textContent.substring(0, 30)}"`);
                break;
              }
            }
          }
          
          // Search in variable value (column 4)
          if (!searchMatch) {
            for (const selector of possibleValueSelectors) {
              const valueEl = variable.querySelector(selector);
              if (valueEl && valueEl.textContent.toLowerCase().includes(query)) {
                searchMatch = true;
                if (index < 3) console.log(`STAPE: Variable ${index} - Value match: "${valueEl.textContent.substring(0, 30)}"`);
                break;
              }
            }
          }
          
          // Fallback: search in all text but still exclude the Type column (column 2)
          if (!searchMatch) {
            const typeEl = variable.querySelector('.gtm-debug-variable-table-cell-20'); // Type column to exclude
            const typeText = typeEl ? typeEl.textContent.toLowerCase() : '';
            const allText = variable.textContent.toLowerCase();
            
            if (allText.includes(query)) {
              // If match is found in type column, check if it's ALSO found elsewhere
              if (typeText.includes(query)) {
                const textWithoutType = allText.replace(typeText, '');
                searchMatch = textWithoutType.includes(query);
                if (index < 3) console.log(`STAPE: Variable ${index} - Query in type column, found elsewhere:`, searchMatch);
              } else {
                searchMatch = true;
                if (index < 3) console.log(`STAPE: Variable ${index} - Query found outside type column:`, searchMatch);
              }
            }
            
            if (index < 3) console.log(`STAPE: Variable ${index} - Fallback search result:`, searchMatch);
          }
          
          visible = visible && searchMatch;
          if (index < 3) console.log(`STAPE: Variable ${index} - Final search result for "${query}":`, searchMatch);
        }
        
        if (visible) {
          variable.classList.remove('stape-hidden');
          variable.style.removeProperty('display');
          visibleCount++;
        } else {
          variable.classList.add('stape-hidden');
          variable.style.display = 'none';
        }
      });
      
      console.log(`STAPE GTM HELPER: Filtered variables - ${visibleCount} visible out of ${variables.length}`);
      
      // Update variable count in UI
      monitor.updateCount(visibleCount);
    };

    monitor.updateTagCount = function(visibleCount) {
      const container = document.getElementById(containerId);
      if (!container) return;
      
      const titleEl = container.querySelector('.stape-filters-title');
      if (titleEl) {
        const tagData = monitor.getTagData();
        const hasActiveFilters = monitor.searchQuery.trim() !== '' || monitor.selectedFilters.length > 0;
        const countText = hasActiveFilters ? 
          `Tags Filter (${visibleCount}/${tagData.length} types)` : 
          `Tags Filter (${tagData.length} types)`;
        
        titleEl.innerHTML = `
          <img src="https://stape.io/favicon.ico" alt="Stape">
          ${countText}
        `;
      }
    };

    monitor.updateCount = function(visibleCount) {
      const container = document.getElementById(containerId);
      if (!container) return;
      
      const titleEl = container.querySelector('.stape-filters-title');
      if (titleEl) {
        const data = monitor.getData();
        const hasActiveFilters = monitor.searchQuery.trim() !== '' || monitor.selectedFilters.length > 0;
        const pluralType = monitor.currentTab === 'tags' ? 'Tags' : 'Variables';
        const countText = hasActiveFilters ? 
          `${pluralType} Filter (${visibleCount}/${data.length} types)` : 
          `${pluralType} Filter (${data.length} types)`;
        
        titleEl.innerHTML = `
          <img src="https://stape.io/favicon.ico" alt="Stape">
          ${countText}
        `;
      }
    };

    monitor.updateHeaderCount = function(container) {
      const headerText = container.querySelector('.stape-multiselect-header span');
      const data = monitor.getData();
      if (headerText) {
        headerText.textContent = `${monitor.selectedFilters.length} of ${data.length} types selected`;
      }
    };

    monitor.updateTypesDropdown = function() {
      const container = document.getElementById(containerId);
      if (!container) return;

      const multiselectOptions = container.querySelector('.stape-multiselect-options');
      const multiselectHeader = container.querySelector('.stape-multiselect-header span');
      
      if (!multiselectOptions || !multiselectHeader) return;

      const data = monitor.getData();
      const currentTypes = data.map(([type]) => type);
      
      // Remove selected filters that no longer exist in the current types
      const originalFilterCount = monitor.selectedFilters.length;
      monitor.selectedFilters = monitor.selectedFilters.filter(filter => currentTypes.includes(filter));
      
      if (monitor.selectedFilters.length !== originalFilterCount) {
        console.log('STAPE: Removed obsolete filters', {
          before: originalFilterCount,
          after: monitor.selectedFilters.length
        });
      }
      
      console.log(`STAPE: Updating ${monitor.currentTab} types dropdown`, {
        selectedFilters: monitor.selectedFilters,
        availableTypes: currentTypes,
        dataWithCounts: data
      });

      // Update the dropdown options
      multiselectOptions.innerHTML = data.map(([type, count]) => `
        <div class="stape-multiselect-option" data-value="${type}">
          <input type="checkbox" value="${type}" ${monitor.selectedFilters.includes(type) ? 'checked' : ''}>
          <span class="stape-option-label">${type}</span>
          <span class="stape-option-count">(${count})</span>
        </div>
      `).join('');

      // Update header count
      multiselectHeader.textContent = `${monitor.selectedFilters.length} of ${data.length} types selected`;

      // Re-attach event listeners for the new options
      const checkboxes = multiselectOptions.querySelectorAll('input[type="checkbox"]');
      const options = multiselectOptions.querySelectorAll('.stape-multiselect-option');

      // Handle checkbox changes
      checkboxes.forEach(checkbox => {
        checkbox.onchange = (e) => {
          const value = e.target.value;
          if (e.target.checked) {
            if (!monitor.selectedFilters.includes(value)) {
              monitor.selectedFilters.push(value);
            }
          } else {
            monitor.selectedFilters = monitor.selectedFilters.filter(f => f !== value);
          }
          
          monitor.updateHeaderCount(container);
          console.log('STAPE: Selected filters updated:', monitor.selectedFilters);
        };
      });

      // Handle option clicks (entire area clickable)
      options.forEach(option => {
        option.onclick = (e) => {
          e.stopPropagation();
          
          const checkbox = option.querySelector('input[type="checkbox"]');
          const value = option.dataset.value;
          
          // Toggle checkbox
          checkbox.checked = !checkbox.checked;
          
          if (checkbox.checked) {
            if (!monitor.selectedFilters.includes(value)) {
              monitor.selectedFilters.push(value);
            }
          } else {
            monitor.selectedFilters = monitor.selectedFilters.filter(f => f !== value);
          }
          
          monitor.updateHeaderCount(container);
          console.log('STAPE: Filter toggled:', value, checkbox.checked);
        };
      });

      console.log('STAPE: Tag types dropdown updated with', tagData.length, 'types');
    };

    monitor.clearFilters = function() {
      monitor.selectedFilters = [];
      monitor.searchQuery = '';
      
      const elements = document.querySelectorAll('.stape-hidden');
      elements.forEach(el => {
        el.classList.remove('stape-hidden');
        el.style.removeProperty('display');
      });
      
      console.log('STAPE: All filters cleared');
    };

    monitor.selectAllFilters = function() {
      const data = monitor.getData();
      monitor.selectedFilters = data.map(([type]) => type);
      console.log('STAPE: All filters selected:', monitor.selectedFilters);
    };


    monitor.removeFilterUI = function() {
      const existing = document.getElementById(containerId);
      if (existing) existing.remove();
    };

    monitor.processNewComponents = function() {
      if (monitor.debounceTimer) clearTimeout(monitor.debounceTimer);
      monitor.debounceTimer = setTimeout(() => {
        const newTab = monitor.detectActiveTab();
        console.log('STAPE: Processing components, detected tab:', newTab);
        
        if (newTab !== monitor.currentTab) {
          console.log(`STAPE: Tab switching from ${monitor.currentTab} to ${newTab}`);
          // Clear filters when switching tabs
          monitor.selectedFilters = [];
          monitor.searchQuery = '';
          monitor.currentTab = newTab;
          
          if (newTab === 'tags' || newTab === 'variables') {
            console.log(`STAPE: Creating UI for new tab: ${newTab}`);
            monitor.createFilterUI();
          } else {
            console.log(`STAPE: Removing UI for invalid tab: ${newTab}`);
            monitor.removeFilterUI();
          }
        } else if (newTab === 'tags' || newTab === 'variables') {
          // Refresh UI if tab hasn't changed but content might have
          const existing = document.getElementById(containerId);
          if (!existing) {
            console.log(`STAPE: UI missing for ${newTab}, recreating`);
            monitor.createFilterUI();
          } else {
            console.log(`STAPE: Updating existing UI for ${newTab}`);
            // Update types dropdown with new types
            monitor.updateTypesDropdown();
            
            // Update count display
            const currentSelector = newTab === 'tags' ? 
              'tags-tab .gtm-debug-card:not(.stape-hidden), tags-tab__blocked-tags .gtm-debug-card:not(.stape-hidden)' :
              'variables-tab .gtm-debug-variable-table-row:not(.stape-hidden), variables-tab .gtm-debug-table-row:not(.stape-hidden), variables-tab .gtm-debug-card:not(.stape-hidden)';
            const visibleCount = document.querySelectorAll(currentSelector).length;
            monitor.updateCount(visibleCount);
            
            // Re-apply current filters
            if (monitor.searchQuery.trim() !== '' || monitor.selectedFilters.length > 0) {
              console.log(`STAPE: Re-applying filters for ${newTab}`);
              monitor.applyFilters();
            }
          }
        } else if (newTab === 'none') {
          console.log('STAPE: No active tab, removing UI');
          monitor.removeFilterUI();
        }
      }, 200);
    };

    monitor.start = function() {
      // Don't start if already running
      if (monitor.observer) {
        console.log('Preview UI Filters Monitor already running');
        return;
      }

      console.log('Preview UI Filters Monitor starting');
      monitor.injectStyles();
      monitor.processNewComponents();

      monitor.observer = new MutationObserver((mutations) => {
        let shouldProcess = false;
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node;
              if (element.tagName === 'TAGS-TAB' ||
                  element.tagName === 'VARIABLES-TAB' ||
                  element.tagName === 'TAGS-TAB__BLOCKED-TAGS' ||
                  element.classList?.contains('gtm-debug-card') ||
                  element.classList?.contains('gtm-debug-table-row') ||
                  element.classList?.contains('gtm-debug-variable-table-row') ||
                  element.querySelector?.('tags-tab, variables-tab, tags-tab__blocked-tags, .gtm-debug-card, .gtm-debug-table-row, .gtm-debug-variable-table-row')) {
                shouldProcess = true;
              }
            }
          });
          
          if (mutation.type === 'attributes' && 
              (mutation.target.tagName === 'TAGS-TAB' || mutation.target.tagName === 'VARIABLES-TAB') &&
              mutation.attributeName === 'aria-hidden') {
            shouldProcess = true;
          }
        });
        
        if (shouldProcess) {
          monitor.processNewComponents();
        }
      });

      monitor.observer.observe(document.body, { 
        childList: true, 
        subtree: true,
        attributes: true,
        attributeFilter: ['aria-hidden']
      });
    };

    monitor.stop = function() {
      if (monitor.observer) {
        console.log('Preview UI Filters Monitor stopping');
        monitor.observer.disconnect();
        monitor.observer = null;
        if (monitor.debounceTimer) clearTimeout(monitor.debounceTimer);
        
        monitor.removeFilterUI();
        monitor.clearFilters();
        
        const styleEl = document.getElementById(stylesId);
        if (styleEl) styleEl.remove();
        
        console.log('Preview UI Filters Monitor stopped and UI removed');
      } else {
        console.log('Preview UI Filters Monitor was not running');
      }
    };

    return monitor;
  }

  // Initialize and start
  window.__stape_extension.previewUIFilters = PreviewUIFiltersMonitor();

  // Auto-start based on enabled state
  if (isEnabled) {
    console.log('STAPE: Preview UI Filters auto-starting (feature is enabled)');
    window.__stape_extension.previewUIFilters.start();
  } else {
    console.log('STAPE: Preview UI Filters not auto-starting (feature is disabled)');
  }
}