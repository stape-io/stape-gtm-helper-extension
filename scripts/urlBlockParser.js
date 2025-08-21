export function urlBlockParser(isEnabled = true) {
  window.__stape_extension = window.__stape_extension || {};
  function HTTPUrlDetailsMonitor() {
    const monitor = {
      observer: null,
      detectedComponents: new Set(),
      callbacks: [],
      debounceTimer: null,
      parsedComponents: new Map()
    };

    monitor.onNewHttpUrlDetails = function (callback) {
      monitor.callbacks.push(callback);
    };

    monitor.getProtocol = function (url) {
      if (url.includes('://')) {
        return url.split('://')[0] + ':';
      }
      return window.location.protocol;
    };

    monitor.getHostname = function (url) {
      if (url.includes('://')) {
        const urlObj = new URL(url);
        return urlObj.hostname;
      }
      return window.location.hostname;
    };

    monitor.parseUrlParameters = function (url) {
      if (!url || !url.includes('?')) return null;

      try {
        const queryString = url.split('?')[1].split('#')[0];
        const params = new URLSearchParams(queryString);
        return Object.fromEntries(params);
      } catch (error) {
        console.warn('Error parsing URL parameters:', error);
        return null;
      }
    };

    monitor.syntaxHighlightJSON = function (json) {
      return window.__stape_extension.jsonStylingHelper.syntaxHighlight(json, 'ubp');
    };

    monitor.createTableDisplay = function (method, url, params, _originalPre, _originalMethodCell) {
      const container = document.createElement('div');
      container.className = 'parsed-request-container';
      container.style.cssText = `
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 6px;
        padding: 12px;
        margin: 4px 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
      `;

      const header = document.createElement('div');
      header.style.cssText =
        'display: flex; gap: 6px; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #dee2e6;';

      const methodSpan = document.createElement('span');

      let parsedUrl;
      if (url.startsWith('http')) {
        parsedUrl = url.replace(/^https?:\/\//, '').split('?')[0];
      } else {
        parsedUrl = document.location.hostname + url.replace(/^https?:\/\//, '').split('?')[0];
      }
      methodSpan.innerHTML = `<img src="https://i.postimg.cc/W3FfTVMx/stapeio.png" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 8px;">${method} ${parsedUrl}`;
      methodSpan.style.cssText =
        'font-weight: bold; color: #495057; display: flex; align-items: center;';

      const buttonGroup = document.createElement('div');
      buttonGroup.style.cssText = 'display: flex; gap: 6px;';

      const toggleBtn = document.createElement('button');
      toggleBtn.textContent = 'View as JSON';
      toggleBtn.style.cssText = `
        background: #17a2b8;
        color: white;
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        cursor: pointer;
      `;

      const copyBtn = document.createElement('button');
      copyBtn.textContent = 'Copy';
      copyBtn.style.cssText = `
        background: #28a745;
        color: white;
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        cursor: pointer;
      `;

      buttonGroup.appendChild(toggleBtn);
      buttonGroup.appendChild(copyBtn);
      header.appendChild(methodSpan);
      header.appendChild(buttonGroup);

      const tableContainer = document.createElement('div');
      tableContainer.className = 'table-content';

      if (params && Object.keys(params).length > 0) {
        const table = document.createElement('table');
        table.style.cssText = `
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          background: white;
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        `;

        const thead = document.createElement('thead');
        thead.innerHTML = `
          <tr style="background: #e9ecef;">
            <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #495057; border-bottom: 1px solid #dee2e6;">Parameter</th>
            <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #495057; border-bottom: 1px solid #dee2e6;">Value</th>
          </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        Object.entries(params).forEach(([key, value], index) => {
          const row = document.createElement('tr');
          row.style.cssText = `
            ${index % 2 === 0 ? 'background: #f8f9fa;' : 'background: white;'}
            border-bottom: 1px solid #dee2e6;
          `;

          let displayValue = String(value);
          if (String(value).length > 80) {
            displayValue = String(value).substring(0, 80) + '...';
          }

          row.innerHTML = `
            <td style="padding: 8px 12px; font-family: monospace; color: #d73a49; font-weight: 500; vertical-align: top; word-break: break-word;">${key}</td>
            <td style="padding: 8px 12px; font-family: monospace; color: #032f62; vertical-align: top; word-break: break-word;" title="${String(value).length > 80 ? String(value) : ''}">${displayValue}</td>
          `;

          tbody.appendChild(row);
        });
        table.appendChild(tbody);
        tableContainer.appendChild(table);
      } else {
        tableContainer.innerHTML =
          '<div style="color: #6c757d; text-align: center; padding: 20px;">No parameters found</div>';
      }

      const objectContainer = document.createElement('div');
      objectContainer.className = 'object-content';
      objectContainer.style.cssText = 'display: none;';

      const objectPre = document.createElement('pre');
      objectPre.style.cssText = window.__stape_extension.jsonStylingHelper.cssForContainer();

      const objectData = {
        method: method,
        protocol: monitor.getProtocol(url),
        hostname: monitor.getHostname(url),
        pathname: url.split('?')[0],
        searchParams: params || {}
      };

      const jsonString = JSON.stringify(objectData, null, 2);
      objectPre.innerHTML = monitor.syntaxHighlightJSON(jsonString);
      objectContainer.appendChild(objectPre);

      let currentView = 'table';

      const stylesId = 'stape-url-block-parser-json-formatter-styles';
      if (!document.getElementById(stylesId)) {
        const style = document.createElement('style');
        style.id = stylesId;
        style.textContent = window.__stape_extension.jsonStylingHelper.cssForJsonParts('ubp');
        document.head.appendChild(style);
      }

      const copyToClipboard = () => {
        const objectData = {
          method: method,
          protocol: monitor.getProtocol(url),
          hostname: monitor.getHostname(url),
          pathname: url.split('?')[0],
          searchParams: params || {}
        };

        const jsonText = JSON.stringify(objectData, null, 2);

        navigator.clipboard
          .writeText(jsonText)
          .then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            copyBtn.style.background = '#20c997';
            setTimeout(() => {
              copyBtn.textContent = originalText;
              copyBtn.style.background = '#28a745';
            }, 1500);
          })
          .catch((err) => {
            console.error('Failed to copy to clipboard:', err);
            copyBtn.textContent = 'Failed';
            copyBtn.style.background = '#dc3545';
            setTimeout(() => {
              copyBtn.textContent = 'Copy';
              copyBtn.style.background = '#28a745';
            }, 1500);
          });
      };

      toggleBtn.onclick = () => {
        if (currentView === 'table') {
          tableContainer.style.display = 'none';
          objectContainer.style.display = 'block';
          toggleBtn.textContent = 'View as Table';
          toggleBtn.style.background = '#6c757d';
          currentView = 'json';
        } else {
          tableContainer.style.display = 'block';
          objectContainer.style.display = 'none';
          toggleBtn.textContent = 'View as JSON';
          toggleBtn.style.background = '#17a2b8';
          currentView = 'table';
        }
      };

      copyBtn.onclick = copyToClipboard;

      container.appendChild(header);
      container.appendChild(tableContainer);
      container.appendChild(objectContainer);

      return container;
    };

    monitor.enhanceComponent = function (component) {
      const componentId = monitor.getComponentId(component);

      if (monitor.parsedComponents.has(componentId)) {
        return null;
      }

      const info = monitor.extractHttpUrlInfo(component);

      const methodCell = component.querySelector('.gtm-debug-table-cell--query-param');
      const urlCell = component.querySelector(
        '.gtm-debug-table-cell--query-param + .gtm-debug-table-cell'
      );
      const urlPre = urlCell?.querySelector('pre');

      if (urlPre && info.url) {
        const params = monitor.parseUrlParameters(info.url);

        if (methodCell) methodCell.style.display = 'none';
        urlPre.style.display = 'none';

        const tableDisplay = monitor.createTableDisplay(
          info.method || '',
          info.url || '',
          params,
          urlPre,
          methodCell
        );
        urlCell?.appendChild(tableDisplay);

        monitor.parsedComponents.set(componentId, {
          component,
          params,
          originalPre: urlPre,
          originalMethodCell: methodCell,
          tableDisplay
        });

        info.params = params;
        info.enhanced = true;
      }

      return info;
    };

    monitor.extractHttpUrlInfo = function (component) {
      const info = {
        component: component,
        timestamp: new Date().toISOString(),
        method: null,
        url: null,
        enhanced: false
      };

      const methodCell = component.querySelector('.gtm-debug-table-cell--query-param pre');
      if (methodCell) {
        info.method = methodCell.textContent?.trim() || null;
      }

      const urlCell = component.querySelector(
        '.gtm-debug-table-cell--query-param + .gtm-debug-table-cell pre'
      );
      if (urlCell) {
        info.url = urlCell.textContent?.trim() || null;
      }

      return info;
    };

    monitor.getComponentId = function (component) {
      if (!component.hasAttribute('data-stape-id')) {
        component.setAttribute(
          'data-stape-id',
          `stape-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
        );
      }
      return component.getAttribute('data-stape-id') || '';
    };

    monitor.processNewComponents = function () {
      if (monitor.debounceTimer) clearTimeout(monitor.debounceTimer);
      monitor.debounceTimer = setTimeout(() => {
        const currentComponents = document.querySelectorAll('http-url-details');
        const newComponents = [];

        monitor.cleanupRemovedComponents();

        currentComponents.forEach((component) => {
          const componentId = monitor.getComponentId(component);
          if (!monitor.detectedComponents.has(componentId)) {
            monitor.detectedComponents.add(componentId);
            const enhancedInfo = monitor.enhanceComponent(component);
            if (enhancedInfo) {
              newComponents.push(enhancedInfo);
            }
          }
        });

        if (newComponents.length > 0) {
          monitor.executeCallbacks(newComponents);
        }
      }, 100);
    };

    monitor.cleanupRemovedComponents = function () {
      const currentComponentIds = new Set();
      document.querySelectorAll('http-url-details[data-stape-id]').forEach((component) => {
        const id = component.getAttribute('data-stape-id');
        if (id) currentComponentIds.add(id);
      });

      for (const [componentId] of monitor.parsedComponents) {
        if (!currentComponentIds.has(componentId)) {
          monitor.parsedComponents.delete(componentId);
          monitor.detectedComponents.delete(componentId);
        }
      }
    };

    monitor.start = function () {
      monitor.detectedComponents.clear();
      monitor.parsedComponents.clear();

      monitor.processNewComponents();

      monitor.observer = new MutationObserver((mutations) => {
        let shouldProcess = false;
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node;
              if (
                element.tagName === 'HTTP-URL-DETAILS' ||
                element.querySelector?.('http-url-details')
              ) {
                shouldProcess = true;
              }
            }
          });

          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node;
              if (
                element.tagName === 'HTTP-URL-DETAILS' ||
                element.querySelector?.('http-url-details')
              ) {
                shouldProcess = true;
              }
            }
          });
        });
        if (shouldProcess) {
          monitor.processNewComponents();
        }
      });

      monitor.observer.observe(document.body, { childList: true, subtree: true });
    };

    monitor.stop = function () {
      if (monitor.observer) {
        monitor.observer.disconnect();
        monitor.observer = null;
        if (monitor.debounceTimer) clearTimeout(monitor.debounceTimer);

        monitor.restoreAll();
      }
    };

    monitor.executeCallbacks = function (components) {
      monitor.callbacks.forEach((callback) => {
        try {
          callback(components);
        } catch (error) {
          console.error('Error in callback:', error);
        }
      });
    };

    monitor.getStats = function () {
      return {
        totalDetected: monitor.detectedComponents.size,
        totalParsed: monitor.parsedComponents.size,
        currentlyVisible: document.querySelectorAll('http-url-details').length,
        isMonitoring: monitor.observer !== null
      };
    };

    monitor.clearCache = function () {
      monitor.detectedComponents.clear();
      monitor.parsedComponents.clear();
    };

    monitor.restoreAll = function () {
      monitor.parsedComponents.forEach(({ originalPre, originalMethodCell, tableDisplay }) => {
        originalPre.style.display = 'block';
        if (originalMethodCell) originalMethodCell.style.display = 'table-cell';

        if (tableDisplay?.parentNode) {
          tableDisplay.parentNode.removeChild(tableDisplay);
        }
      });

      monitor.parsedComponents.clear();
    };

    return monitor;
  }

  window.__stape_extension.urlBlocksParser = HTTPUrlDetailsMonitor();

  window.__stape_extension.urlBlocksParser.onNewHttpUrlDetails((components) => {});

  if (isEnabled) {
    window.__stape_extension.urlBlocksParser.start();
  }
}
