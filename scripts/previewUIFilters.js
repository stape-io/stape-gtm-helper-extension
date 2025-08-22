export function previewUIFilters(isEnabled = true, environment = null) {
  window.__stape_extension = window.__stape_extension || {};

  let selectedTypes = [];
  let searchQuery = '';
  let isCollapsed = true;
  let filtersEnabled = true;
  let observer = null;

  const findGTMDoc = () => {
    if (document.querySelector('tags-tab') || document.querySelector('variables-tab')) {
      return document;
    }

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

  const detectCurrentTab = () => {
    const currentGtmDoc = findGTMDoc();
    if (!currentGtmDoc) return null;

    let tagsTabSelected =
      currentGtmDoc.querySelector(
        '.blg-card-tabs .header__tab--selected[data-ng-click="ctrl.selectTab(Tab.TAGS)"]'
      ) || currentGtmDoc.querySelector('.header__tab--selected[data-ng-click*="TAGS"]');

    let variablesTabSelected =
      currentGtmDoc.querySelector(
        '.blg-card-tabs .header__tab--selected[data-ng-click="ctrl.selectTab(Tab.VARIABLES)"]'
      ) || currentGtmDoc.querySelector('.header__tab--selected[data-ng-click*="VARIABLES"]');

    if (!tagsTabSelected && !variablesTabSelected) {
      const selectedTabs = currentGtmDoc.querySelectorAll('.header__tab--selected');
      selectedTabs.forEach((tab) => {
        const text = tab.textContent.toLowerCase();
        if (text.includes('tag') && !text.includes('variable')) {
          tagsTabSelected = tab;
        } else if (text.includes('variable')) {
          variablesTabSelected = tab;
        }
      });
    }

    if (tagsTabSelected) {
      return 'tags';
    }

    if (variablesTabSelected) {
      return 'variables';
    }

    return null;
  };

  const getItems = () => {
    const currentGtmDoc = findGTMDoc();
    if (!currentGtmDoc) return [];

    const currentTab = detectCurrentTab();

    if (currentTab === 'tags') {
      return currentGtmDoc.querySelectorAll('.tags-tab__tag.gtm-debug-card');
    } else if (currentTab === 'variables') {
      return currentGtmDoc.querySelectorAll(
        '.gtm-debug-variable-pane-content .gtm-debug-variable-table .gtm-debug-variable-table-row'
      );
    }
    return [];
  };

  const getTypes = () => {
    const currentTab = detectCurrentTab();
    const typeCount = new Map();

    getItems().forEach((item) => {
      let type = '';

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
          // Extract from Variable Type column (index 1)
          type = typeCells[1].textContent.trim();
        }
      }

      if (type) {
        typeCount.set(type, (typeCount.get(type) || 0) + 1);
      }
    });

    const result = Array.from(typeCount.entries()).sort((a, b) => b[1] - a[1]);
    return result;
  };

  const createUI = () => {
    try {
      const currentGtmDoc = findGTMDoc();
      if (!currentGtmDoc) return;

      const existingFilters = currentGtmDoc.querySelectorAll('[id^="stape-filter"]');
      existingFilters.forEach((filter) => filter.remove());

      const currentTab = detectCurrentTab();
      if (!currentTab) return;

      const types = getTypes();

      const positionTop = environment === 'GTMTA' ? 130 : 80;
      const zIndex = environment === 'GTMTA' ? 45 : 5;

      const tabLabel = currentTab === 'tags' ? 'Tags' : 'Variables';
      const itemLabel = currentTab === 'tags' ? 'tags' : 'variables';

      selectedTypes = types.map(([type, count]) => type);

      const container = currentGtmDoc.createElement('div');
      container.id = `stape-filter-${currentTab}`;
      container.innerHTML = `
        <style>
          [id^="stape-filter"] {
            --drag-width: 28px;
            position: fixed; top: ${positionTop}px; right: 20px; width: 320px;
            background: white; border: 1px solid #dadce0; border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.15); font-family: 'Google Sans', Roboto, Arial, sans-serif;
            font-size: 14px; z-index: ${zIndex}; overflow: hidden; transition: all 0.3s ease;
            padding-left: var(--drag-width); /* ← make room for the drag area */
            box-sizing: border-box;
            will-change: transform; /* smoother drag */
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
          .stape-buttons {
            padding: 16px; background: #f8f9fa;
            border-top: 1px solid #e8eaed;
            display: flex; gap: 12px; justify-content: center;
          }
          .stape-btn {
            padding: 8px 16px; border: none; border-radius: 6px;
            font-size: 13px; cursor: pointer; font-weight: 500;
            transition: all 0.2s ease; min-width: 80px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          }
          .stape-btn#stape-select-all {
            background: #1a73e8; color: white;
          }
          .stape-btn#stape-select-all:hover {
            background: #1557b0; box-shadow: 0 2px 4px rgba(0,0,0,0.15);
          }
          .stape-btn#stape-clear-all {
            background: white; color: #5f6368; border: 1px solid #dadce0;
          }
          .stape-btn#stape-clear-all:hover {
            background: #f8f9fa; border-color: #5f6368;
            box-shadow: 0 2px 4px rgba(0,0,0,0.15);
          }
          .stape-btn:active {
            transform: translateY(1px);
          }
          .stape-btn:disabled {
            opacity: 0.4; cursor: not-allowed; pointer-events: none;
            box-shadow: none; transform: none;
          }

          /* Left drag area outside the header */
          .stape-drag-area {
            position: absolute;
            left: 0; top: 0; bottom: 0;
            width: var(--drag-width);
            display: flex; align-items: center; justify-content: center;
            background: #f8f9fa;
            border-right: 1px solid #dadce0;
            cursor: grab;
            user-select: none;
            touch-action: none;
          }
          .stape-drag-dots {
            display: flex;
            align-items: center;
            justify-content: center;
            color: #5f6368;   /* match other icons/text */
            opacity: 0.5;
          }
          .stape-drag-dots svg {
            width: 24px;
            height: 24px;
          }

          /* NEW - last one for lag */
          .stape-dragging { transition: none !important; }

          /* Optional hover affordance */
          .stape-drag-area:hover { background: #dee0e0ff; }
        </style>
        <div class="stape-drag-area" aria-hidden="true" title="Drag">
          <span class="stape-drag-dots" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
          </span>
        </div>
        <div class="stape-header">
          <div class="stape-title"><img width="16px" style="margin-right: 1em" src="https://cdn.stape.io/i/688a4bb90eaac838702555.ico"/>${tabLabel} Filter</div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="stape-toggle ${isCollapsed ? 'collapsed' : ''}">▲</div>
          </div>
        </div>
        <div class="stape-content ${isCollapsed ? 'collapsed' : ''}">
          <div class="stape-section">
            <div class="stape-label">Search ${tabLabel}</div>
            <input type="text" class="stape-input" id="stape-search" placeholder="Search ${itemLabel}...">
          </div>
          <div class="stape-section">
            <div class="stape-label">Filter by Type</div>
            <div class="stape-types" id="stape-types">
              ${
                types.length > 0
                  ? types
                      .map(
                        ([type, count]) => `
                <div class="stape-type">
                  <input type="checkbox" value="${type}" id="type-${type.replace(/\s+/g, '-')}" checked>
                  <label for="type-${type.replace(/\s+/g, '-')}">${type}</label>
                  <span class="stape-count">${count}</span>
                </div>
              `
                      )
                      .join('')
                  : `
                <div style="padding: 16px; text-align: center; color: #5f6368; font-style: italic;">
                  No ${itemLabel} available to filter
                </div>
              `
              }
            </div>
          </div>
          <div class="stape-buttons">
            <button class="stape-btn" id="stape-select-all" ${types.length === 0 ? 'disabled' : ''}>Select All</button>
            <button class="stape-btn" id="stape-clear-all" ${types.length === 0 ? 'disabled' : ''}>Clear All</button>
          </div>
        </div>
      `;

      currentGtmDoc.body.appendChild(container);

      // Drag-and-drop wiring
      const dragHandle = container.querySelector('.stape-drag-area'); // ← only this area is draggable
      makeDraggable(container, dragHandle, currentGtmDoc);

      const header = container.querySelector('.stape-header');
      if (header) {
        header.addEventListener('click', (e) => {
          isCollapsed = !isCollapsed;
          const content = container.querySelector('.stape-content');
          const toggle = container.querySelector('.stape-toggle');

          if (content) content.classList.toggle('collapsed', isCollapsed);
          if (toggle) toggle.classList.toggle('collapsed', isCollapsed);
        });
      }

      const searchInput = currentGtmDoc.getElementById('stape-search');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          searchQuery = e.target.value.toLowerCase();
          applyFilters();
        });
      }

      container.querySelectorAll('.stape-type').forEach((typeDiv) => {
        const checkbox = typeDiv.querySelector('input[type="checkbox"]');
        typeDiv.addEventListener('click', (e) => {
          if (!['INPUT', 'LABEL'].includes(e.target.tagName)) {
            checkbox.checked = !checkbox.checked;
          }
          selectedTypes = Array.from(
            container.querySelectorAll('input[type="checkbox"]:checked')
          ).map((cb) => cb.value);
          applyFilters();
        });
      });

      const selectAllBtn = currentGtmDoc.getElementById('stape-select-all');
      const clearAllBtn = currentGtmDoc.getElementById('stape-clear-all');

      if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
          const checkboxes = container.querySelectorAll('input[type="checkbox"]');
          checkboxes.forEach((cb) => (cb.checked = true));
          selectedTypes = types.map(([type, count]) => type);
          applyFilters();
        });
      }

      if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
          const checkboxes = container.querySelectorAll('input[type="checkbox"]');
          checkboxes.forEach((cb) => (cb.checked = false));
          selectedTypes = [];
          applyFilters();
        });
      }

      resetAllFilters();
    } catch (error) {
      resetAllFilters();
    }
  };

  function makeDraggable(filterElement, handle, doc) {
    if (!filterElement || !handle || !doc) return;

    const win = doc.defaultView || window;
    const STORAGE_POSITION_KEY = 'stape-filter-pos';

    handle.style.cursor = 'grab';
    handle.style.touchAction = 'none';
    handle.style.userSelect = 'none';

    filterElement.style.position = filterElement.style.position || 'fixed';
    if (!filterElement.style.left && !filterElement.style.right) filterElement.style.right = '20px';

    try {
      const saved = JSON.parse(win.localStorage.getItem(STORAGE_POSITION_KEY) || 'null');
      if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
        filterElement.style.left = `${saved.x}px`;
        filterElement.style.top = `${saved.y}px`;
        filterElement.style.right = 'auto';
      }
    } catch {}

    const dragState = {
      isDragging: false,
      initialX: 0,
      initialY: 0,
      offsetX: 0,
      offsetY: 0
    };

    const beginDrag = (clientX, clientY) => {
      dragState.isDragging = true;
      filterElement.classList.add('stape-dragging');
      handle.style.cursor = 'grabbing';

      dragState.initialX = clientX;
      dragState.initialY = clientY;

      dragState.offsetX = filterElement.offsetLeft;
      dragState.offsetY = filterElement.offsetTop;
    };

    const doDrag = (clientX, clientY) => {
      if (!dragState.isDragging) return;

      const viewportWidth = win.innerWidth;
      const viewportHeight = win.innerHeight;
      const elementWidth = filterElement.offsetWidth;
      const elementHeight = filterElement.offsetHeight;

      const maxX = viewportWidth - elementWidth;
      const maxY = viewportHeight - elementHeight;

      const deltaX = clientX - dragState.initialX;
      const deltaY = clientY - dragState.initialY;

      let newX = dragState.offsetX + deltaX;
      let newY = dragState.offsetY + deltaY;

      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      filterElement.style.left = `${newX}px`;
      filterElement.style.top = `${newY}px`;
    };

    const endDrag = () => {
      if (!dragState.isDragging) return;

      dragState.isDragging = false;
      filterElement.classList.remove('stape-dragging');
      handle.style.cursor = 'grab';

      try {
        win.localStorage.setItem(
          STORAGE_POSITION_KEY,
          JSON.stringify({
            x: filterElement.offsetLeft,
            y: filterElement.offsetTop
          })
        );
      } catch {}
    };

    // Pointer events (primary)
    const onPointerDown = (e) => {
      if (e.button !== 0) return;

      handle.setPointerCapture?.(e.pointerId);
      beginDrag(e.clientX, e.clientY);
      e.preventDefault();

      doc.addEventListener('pointermove', onPointerMove, { passive: true });
      doc.addEventListener('pointerup', onPointerUp, { passive: true });
    };
    const onPointerMove = (e) => {
      const list = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
      const last = list && list.length ? list[list.length - 1] : e;
      doDrag(last.clientX, last.clientY);
    };
    const onPointerUp = (e) => {
      handle.releasePointerCapture?.(e.pointerId);
      endDrag();

      doc.removeEventListener('pointermove', onPointerMove, { passive: true });
      doc.removeEventListener('pointerup', onPointerUp, { passive: true });
    };

    // Mouse/touch fallbacks
    const onMouseDown = (e) => {
      if (e.button !== 0) return;

      beginDrag(e.clientX, e.clientY);
      e.preventDefault();

      doc.addEventListener('mousemove', onMouseMove);
      doc.addEventListener('mouseup', onMouseUp);
    };
    const onMouseMove = (e) => {
      doDrag(e.clientX, e.clientY);
    };
    const onMouseUp = (e) => {
      endDrag();

      doc.removeEventListener('mousemove', onMouseMove);
      doc.removeEventListener('mouseup', onMouseUp);
    };

    const onTouchStart = (e) => {
      const t = e.touches[0];
      if (!t) return;

      beginDrag(t.clientX, t.clientY);

      doc.addEventListener('touchmove', onTouchMove, { passive: false });
      doc.addEventListener('touchend', onTouchEnd);
    };
    const onTouchMove = (e) => {
      const t = e.touches[0];
      if (!t) return;

      doDrag(t.clientX, t.clientY);
    };
    const onTouchEnd = () => {
      endDrag();

      doc.removeEventListener('touchmove', onTouchMove, { passive: false });
      doc.removeEventListener('touchend', onTouchEnd);
    };

    const ensureInViewport = () => {
      const viewportWidth = win.innerWidth;
      const viewportHeight = win.innerHeight;
      const elementWidth = filterElement.offsetWidth;
      const elementHeight = filterElement.offsetHeight;

      const maxX = viewportWidth - elementWidth;
      const maxY = viewportHeight - elementHeight;

      const currentX = filterElement.offsetLeft;
      const currentY = filterElement.offsetTop;

      // Clamp the current position to the new viewport dimensions
      const newX = Math.max(0, Math.min(currentX, maxX));
      const newY = Math.max(0, Math.min(currentY, maxY));

      // Apply the new position if it has changed
      if (newX !== currentX) filterElement.style.left = `${newX}px`;
      if (newY !== currentY) filterElement.style.top = `${newY}px`;

      try {
        win.localStorage.setItem(STORAGE_POSITION_KEY, JSON.stringify({ x: newX, y: newY }));
      } catch {}
    };

    handle.addEventListener('pointerdown', onPointerDown);
    handle.addEventListener('mousedown', onMouseDown);
    handle.addEventListener('touchstart', onTouchStart, { passive: true });

    win.addEventListener('resize', ensureInViewport);
  }

  const resetAllFilters = () => {
    searchQuery = '';
    getItems().forEach((item) => {
      item.style.display = '';
    });
  };

  const applyFilters = () => {
    const currentTab = detectCurrentTab();
    const items = getItems();

    items.forEach((item) => {
      let visible = true;
      let type = '';

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

      if (selectedTypes.length > 0) {
        visible = selectedTypes.includes(type);
      } else {
        visible = false;
      }

      if (searchQuery && visible) {
        if (currentTab === 'variables') {
          const typeCells = item.querySelectorAll('.gtm-debug-table-cell');
          let searchText = '';

          if (typeCells.length > 0) {
            searchText += typeCells[0].textContent.toLowerCase();
          }

          if (typeCells.length > 3) {
            const valueCell = typeCells[3];
            const valueDiv = valueCell.querySelector('.gtm-debug-variable-table-value');
            if (valueDiv) {
              searchText += ' ' + valueDiv.textContent.toLowerCase();
            }
          }

          visible = searchText.includes(searchQuery);
        } else {
          const text = item.textContent.toLowerCase();
          visible = text.includes(searchQuery);
        }
      }

      item.style.display = visible ? '' : 'none';
    });
  };

  const checkAndUpdateFilter = () => {
    try {
      const currentGtmDoc = findGTMDoc();
      if (!currentGtmDoc) return;

      const currentTab = detectCurrentTab();
      const existingFilters = currentGtmDoc.querySelectorAll('[id^="stape-filter"]');
      const currentTabFilter = currentGtmDoc.getElementById(`stape-filter-${currentTab}`);

      if (!filtersEnabled) {
        existingFilters.forEach((filter) => filter.remove());
        return;
      }

      if (currentTab && !currentTabFilter) {
        createUI();
      } else if (currentTab && currentTabFilter) {
        const currentTypes = getTypes();
        const existingTypes = Array.from(
          currentTabFilter.querySelectorAll('input[type="checkbox"]')
        ).map((cb) => cb.value);

        const typesChanged =
          currentTypes.length !== existingTypes.length ||
          !currentTypes.every(([type]) => existingTypes.includes(type));

        if (typesChanged) {
          currentTabFilter.remove();
          createUI();
        }
      } else if (!currentTab && existingFilters.length > 0) {
        existingFilters.forEach((filter) => filter.remove());
      }
    } catch (error) {}
  };

  const startMonitoring = () => {
    if (observer) return;

    observer = new MutationObserver(() => {
      checkAndUpdateFilter();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  };

  const stopMonitoring = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }

    const currentGtmDoc = findGTMDoc();
    if (currentGtmDoc) {
      resetAllFilters();
      const existingFilters = currentGtmDoc.querySelectorAll('[id^="stape-filter"]');
      existingFilters.forEach((filter) => filter.remove());
    }
  };

  window.__stape_extension.previewUIFilters = {
    start: function () {
      filtersEnabled = true;
      createUI();
      startMonitoring();
      checkAndUpdateFilter();
    },
    stop: function () {
      filtersEnabled = false;
      stopMonitoring();
    }
  };

  if (isEnabled) {
    startMonitoring();
  }
}
