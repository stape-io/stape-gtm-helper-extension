export function previewUIFilters(isEnabled = true) {
  return;
  if (!isEnabled) return;

  // Find GTM preview document
  const findGTMDoc = () => {
    // Check if we're already in GTM preview
    if (document.querySelector('tags-tab') || document.querySelector('variables-tab')) {
      return document;
    }
    
    // Look in iframes
    const frames = document.querySelectorAll('iframe');
    for (const frame of frames) {
      try {
        const doc = frame.contentDocument;
        if (doc && (doc.querySelector('tags-tab') || doc.querySelector('variables-tab'))) {
          return doc;
        }
      } catch (e) {
        continue;
      }
    }
    return null;
  };

  const gtmDoc = findGTMDoc();
  if (!gtmDoc) {
    setTimeout(() => previewUIFilters(isEnabled), 1000);
    return;
  }

  let selectedTypes = [];
  let searchQuery = '';
  let isCollapsed = true;

  // Detect current tab type
  const detectCurrentTab = () => {
    // Debug: Show all tab-related elements
    const allTabs = gtmDoc.querySelectorAll('.blg-card-tabs *');
    const selectedTabs = gtmDoc.querySelectorAll('.header__tab--selected');
    const allTabElements = gtmDoc.querySelectorAll('[class*="tab"]');
    
    console.log('STAPE: Debug DOM:', {
      allTabsCount: allTabs.length,
      selectedTabsCount: selectedTabs.length,
      allTabElementsCount: allTabElements.length,
      bodyHTML: gtmDoc.body.innerHTML.substring(0, 500)
    });
    
    // Show first 5 selected tabs
    selectedTabs.forEach((tab, i) => {
      if (i < 5) {
        console.log(`STAPE: Selected tab ${i}:`, {
          className: tab.className,
          innerHTML: tab.innerHTML.substring(0, 100),
          onclick: tab.getAttribute('data-ng-click')
        });
      }
    });
    
    // Only show tag filters when Tags tab is selected
    const tagsTabSelected = gtmDoc.querySelector('.blg-card-tabs .header__tab--selected[data-ng-click="ctrl.selectTab(Tab.TAGS)"]');
    
    // Only show variable filters when Variables tab is selected  
    const variablesTabSelected = gtmDoc.querySelector('.blg-card-tabs .header__tab--selected[data-ng-click="ctrl.selectTab(Tab.VARIABLES)"]');
    
    console.log('STAPE: Tab detection:', {
      tagsTabSelected: !!tagsTabSelected,
      variablesTabSelected: !!variablesTabSelected
    });
    
    if (tagsTabSelected && gtmDoc.querySelector('.tags-tab__tag.gtm-debug-card')) {
      console.log('STAPE: Showing tags filter');
      return 'tags';
    }
    
    if (variablesTabSelected && gtmDoc.querySelector('.gtm-debug-variable-table-row')) {
      console.log('STAPE: Showing variables filter');
      return 'variables';
    }
    
    console.log('STAPE: No active tab detected');
    return null;
  };

  // Get items based on current tab
  const getItems = () => {
    const currentTab = detectCurrentTab();
    if (currentTab === 'tags') {
      return gtmDoc.querySelectorAll('.tags-tab__tag.gtm-debug-card');
    } else if (currentTab === 'variables') {
      return gtmDoc.querySelectorAll('.gtm-debug-variable-table-row');
    }
    return [];
  };
  
  const getTypes = () => {
    const currentTab = detectCurrentTab();
    const typeCount = new Map();
    
    getItems().forEach(item => {
      let type = '';
      
      if (currentTab === 'tags') {
        const subtitleEl = item.querySelector('.gtm-debug-card__subtitle');
        if (subtitleEl) {
          type = subtitleEl.textContent.trim();
          // Remove " - Paused" suffix if present
          const dashIndex = type.indexOf(' - ');
          if (dashIndex !== -1) type = type.substring(0, dashIndex).trim();
        }
      } else if (currentTab === 'variables') {
        // For variables, get type from the second column
        const typeCells = item.querySelectorAll('.gtm-debug-table-cell');
        if (typeCells.length > 1) {
          type = typeCells[1].textContent.trim();
        }
      }
      
      if (type) {
        typeCount.set(type, (typeCount.get(type) || 0) + 1);
      }
    });
    
    const result = Array.from(typeCount.entries()).sort((a, b) => b[1] - a[1]);
    console.log(`STAPE: ${currentTab} types found:`, result);
    return result;
  };

  // Create simple UI
  const createUI = () => {
    if (gtmDoc.getElementById('stape-filter')) return;

    const currentTab = detectCurrentTab();
    if (!currentTab) return;

    const types = getTypes();
    if (types.length === 0) return;

    const tabLabel = currentTab === 'tags' ? 'Tag' : 'Variable';
    const itemLabel = currentTab === 'tags' ? 'tags' : 'variables';

    const container = gtmDoc.createElement('div');
    container.id = 'stape-filter';
    container.innerHTML = `
      <style>
        #stape-filter {
          position: fixed; top: 80px; right: 20px; width: 320px;
          background: white; border: 1px solid #dadce0; border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.15); font-family: 'Google Sans', Roboto, Arial, sans-serif;
          font-size: 14px; z-index: 5; overflow: hidden; transition: all 0.3s ease;
        }
        .stape-header {
          padding: 12px 16px; background: #f8f9fa; border-bottom: 1px solid #dadce0;
          color: #202124; font-weight: 500; display: flex; justify-content: space-between; 
          align-items: center; cursor: pointer; user-select: none;
        }
        .stape-title { display: flex; align-items: center; }

        .stape-toggle {
          font-size: 14px; transition: transform 0.2s ease; font-weight: bold;
        }
        .stape-toggle.collapsed { transform: rotate(180deg); }
        .stape-content { 
          padding: 16px; transition: all 0.3s ease; max-height: 400px; overflow: hidden;
        }
        .stape-content.collapsed { max-height: 0; padding: 0 16px; opacity: 0; }
        .stape-section { margin-bottom: 16px; }
        .stape-section:last-child { margin-bottom: 0; }
        .stape-label { 
          font-weight: 500; margin-bottom: 8px; color: #202124; 
          display: flex; align-items: center;
        }
        .stape-label::before { 
          content: ''; width: 3px; height: 14px; background: #5f6368; 
          margin-right: 8px; border-radius: 2px;
        }
        .stape-input {
          width: 100%; padding: 10px 12px; border: 1px solid #dadce0; border-radius: 6px;
          box-sizing: border-box; font-size: 14px; transition: border-color 0.2s ease;
        }
        .stape-input:focus { 
          border-color: #1a73e8; outline: none; 
          box-shadow: 0 0 0 1px #1a73e8;
        }
        .stape-types { 
          max-height: 200px; overflow-y: auto; border: 1px solid #dadce0; 
          border-radius: 6px; background: #fafafa;
        }
        .stape-type {
          display: flex; align-items: center; padding: 10px 12px; cursor: pointer;
          border-bottom: 1px solid #e8eaed; transition: background-color 0.2s ease;
          background: white;
        }
        .stape-type:last-child { border-bottom: none; }
        .stape-type:hover { background: #f1f3f4; }
        .stape-type input { margin-right: 10px; }
        .stape-type label { cursor: pointer; flex: 1; }
        .stape-count { 
          margin-left: auto; color: #5f6368; font-size: 12px; 
          background: #f1f3f4; padding: 2px 6px; border-radius: 4px;
        }
        .stape-close { 
          cursor: pointer; font-size: 18px; color: #5f6368; 
          padding: 4px; border-radius: 4px; transition: all 0.2s ease;
        }
        .stape-close:hover { 
          color: #202124; background: #f1f3f4; 
        }
      </style>
      <div class="stape-header">
        <div class="stape-title"><img width="16px" style="margin-right: 1em" src="https://cdn.stape.io/i/688a4bb90eaac838702555.ico"/>${tabLabel} Filters</div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="stape-toggle ${isCollapsed ? 'collapsed' : ''}">▲</div>
        </div>
      </div>
      <div class="stape-content ${isCollapsed ? 'collapsed' : ''}">
        <div class="stape-section">
          <div class="stape-label">Search ${tabLabel}s</div>
          <input type="text" class="stape-input" id="stape-search" placeholder="Search ${itemLabel}...">
        </div>
        <div class="stape-section">
          <div class="stape-label">Filter by Type</div>
          <div class="stape-types" id="stape-types">
            ${types.map(([type, count]) => `
              <div class="stape-type">
                <input type="checkbox" value="${type}" id="type-${type.replace(/\s+/g, '-')}">
                <label for="type-${type.replace(/\s+/g, '-')}">${type}</label>
                <span class="stape-count">${count}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    gtmDoc.body.appendChild(container);

    // Event listeners
    const header = container.querySelector('.stape-header');
    const closeBtn = container.querySelector('.stape-close');
    
    // Toggle collapse on header click
    header.addEventListener('click', (e) => {
      // Don't collapse if clicking the close button
      if (e.target === closeBtn) return;
      
      isCollapsed = !isCollapsed;
      const content = container.querySelector('.stape-content');
      const toggle = container.querySelector('.stape-toggle');
      
      content.classList.toggle('collapsed', isCollapsed);
      toggle.classList.toggle('collapsed', isCollapsed);
    });

    // Close button
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      container.remove();
    });

    // Search input
    gtmDoc.getElementById('stape-search').addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase();
      applyFilters();
    });

    // Checkboxes
    container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        selectedTypes = Array.from(container.querySelectorAll('input[type="checkbox"]:checked'))
          .map(cb => cb.value);
        applyFilters();
      });
    });
  };

  // Apply filters 
  const applyFilters = () => {
    const currentTab = detectCurrentTab();
    
    getItems().forEach(item => {
      let visible = true;
      let type = '';

      // Get type based on tab
      if (currentTab === 'tags') {
        const subtitleEl = item.querySelector('.gtm-debug-card__subtitle');
        if (subtitleEl) {
          type = subtitleEl.textContent.trim();
          const dashIndex = type.indexOf(' - ');
          if (dashIndex !== -1) type = type.substring(0, dashIndex).trim();
        }
      } else if (currentTab === 'variables') {
        const typeCells = item.querySelectorAll('.gtm-debug-table-cell');
        if (typeCells.length > 1) {
          type = typeCells[1].textContent.trim();
        }
      }

      // Type filter
      if (selectedTypes.length > 0) {
        visible = selectedTypes.includes(type);
      }

      // Search filter
      if (searchQuery && visible) {
        const text = item.textContent.toLowerCase();
        visible = text.includes(searchQuery);
      }

      item.style.display = visible ? '' : 'none';
    });
  };

  // Initialize
  createUI();

  // Check and update filter visibility
  const checkAndUpdateFilter = () => {
    const currentTab = detectCurrentTab();
    const existingFilter = gtmDoc.getElementById('stape-filter');
    
    console.log('STAPE: checkAndUpdateFilter - currentTab:', currentTab, 'existingFilter:', !!existingFilter);
    
    if (currentTab && getItems().length > 0 && !existingFilter) {
      console.log('STAPE: Creating filter for tab:', currentTab);
      createUI();
    } else if (!currentTab && existingFilter) {
      console.log('STAPE: Removing filter - no active tab');
      existingFilter.remove();
    }
  };

  // Auto-refresh when DOM changes
  const observer = new MutationObserver(() => {
    checkAndUpdateFilter();
  });
  
  observer.observe(gtmDoc.body, { 
    childList: true, 
    subtree: true, 
    attributes: true, 
    attributeFilter: ['class'] 
  });

  // Also check every second as backup
  setInterval(() => {
    console.log('STAPE: Manual check triggered');
    checkAndUpdateFilter();
  }, 1000);
}