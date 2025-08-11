export function consentStatusMonitor(isEnabled = true) {
  window.__stape_extension = window.__stape_extension || {};

  function ConsentStatusMonitor() {
    const stylesId = 'consent-status-monitor-styles';

    const consentMappings = {
      'g1--': ['-', '-'],
      'g10-': ['denied', '-'],
      'g11-': ['granted', '-'],
      'g1-0': ['-', 'denied'],
      'g1-1': ['-', 'granted'],
      g100: ['denied', 'denied'],
      g110: ['granted', 'denied'],
      g101: ['denied', 'granted'],
      g111: ['granted', 'granted']
    };

    const consentTypes = ['ad_storage', 'analytics_storage'];

    const monitor = {
      observer: null,
      checkInterval: null,
      currentGcsValue: null,
      isActive: false
    };

    monitor.injectStyles = function () {
      let styleEl = document.getElementById(stylesId);
      if (styleEl) return;

      const styles = `
        .gtm-debug-consent-table {
          border: 1px solid #e0e0e0 !important;
          border-collapse: collapse !important;
        }
        .gtm-debug-consent-table th,
        .gtm-debug-consent-table td {
          border: 1px solid #e0e0e0 !important;
        }
      `;

      styleEl = document.createElement('style');
      styleEl.id = stylesId;
      styleEl.textContent = styles;
      document.head.appendChild(styleEl);
    };

    monitor.findSelectedRequest = function () {
      const selectors = [
        '.message-list__group .message-list__row--child-selected .wd-debug-message-title',
        '.message-list__row--child-selected .wd-debug-message-title',
        '.wd-debug-message-title'
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.title) {
          return element.title;
        }
      }
      return null;
    };

    monitor.extractGcsValue = function (url) {
      if (!url || !url.includes('collect') || !url.includes('v=2')) {
        return null;
      }

      const gcsMatch = url.match(/gcs=([^&]+)/i);
      if (gcsMatch) {
        const gcsValue = gcsMatch[1].toLowerCase();
        return consentMappings[gcsValue] ? gcsValue : null;
      }
      return null;
    };

    monitor.createConsentTable = function (gcsValue) {
      const statuses = consentMappings[gcsValue];

      const tableRows = consentTypes
        .map((type, index) => {
          const status = statuses[index];
          const statusDisplay =
            status === 'granted' ? 'Granted' : status === 'denied' ? 'Denied' : '-';
          const statusClass =
            status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undefined';

          return `
          <tr class="gtm-debug-table-row gtm-debug-consent-table-row">
            <td class="gtm-debug-table-cell gtm-debug-consent-table-cell">${type}</td>
            <td class="gtm-debug-table-cell gtm-debug-consent-table-cell">
              <div class="consent-value-cell">
                <div class="consent ${statusClass}">${statusDisplay}</div>
              </div>
            </td>
          </tr>`;
        })
        .join('');

      return `
        <table class="gtm-debug-consent-table dma-consent-table" style="margin-bottom:1em ">
          <thead>
            <tr class="gtm-debug-table-row">
              <th class="gtm-debug-table-header-cell"><img width="16px" height="16px" src="https://cdn.stape.io/i/688a4bb90eaac838702555.ico" /></th>
              <th class="gtm-debug-table-header-cell">Consent Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      `;
    };

    monitor.showConsentTable = function (gcsValue) {
      const insertTarget = document.querySelector('.blg-card-tabs');
      if (!insertTarget) {
        return false;
      }

      monitor.hideConsentTable();

      const tableHTML = monitor.createConsentTable(gcsValue);
      insertTarget.insertAdjacentHTML('afterend', tableHTML);

      return true;
    };

    monitor.hideConsentTable = function () {
      const existingTable = document.querySelector('.gtm-debug-consent-table');
      if (existingTable) {
        existingTable.remove();
      }
    };

    monitor.checkCurrentState = function () {
      if (!monitor.isActive) return;

      const currentTitle = monitor.findSelectedRequest();
      const gcsValue = currentTitle ? monitor.extractGcsValue(currentTitle) : null;

      if (gcsValue !== monitor.currentGcsValue) {
        monitor.currentGcsValue = gcsValue;

        if (gcsValue) {
          monitor.showConsentTable(gcsValue);
        } else {
          monitor.hideConsentTable();
        }
      }
    };

    monitor.start = function () {
      if (monitor.isActive) {
        return;
      }

      monitor.isActive = true;
      monitor.currentGcsValue = null;

      monitor.injectStyles();

      monitor.checkCurrentState();

      monitor.checkInterval = setInterval(() => {
        monitor.checkCurrentState();
      }, 500);

      monitor.observer = new MutationObserver(() => {
        clearTimeout(monitor.debounceTimer);
        monitor.debounceTimer = setTimeout(() => {
          monitor.checkCurrentState();
        }, 100);
      });

      monitor.observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'title']
      });
    };

    monitor.stop = function () {
      if (!monitor.isActive) {
        return;
      }

      monitor.isActive = false;
      monitor.currentGcsValue = null;

      if (monitor.checkInterval) {
        clearInterval(monitor.checkInterval);
        monitor.checkInterval = null;
      }

      if (monitor.observer) {
        monitor.observer.disconnect();
        monitor.observer = null;
      }

      if (monitor.debounceTimer) {
        clearTimeout(monitor.debounceTimer);
        monitor.debounceTimer = null;
      }

      monitor.hideConsentTable();

      const styleEl = document.getElementById(stylesId);
      if (styleEl) styleEl.remove();
    };

    return monitor;
  }

  window.__stape_extension.consentStatusMonitor = ConsentStatusMonitor();

  if (isEnabled) {
    window.__stape_extension.consentStatusMonitor.start();
  }
}
