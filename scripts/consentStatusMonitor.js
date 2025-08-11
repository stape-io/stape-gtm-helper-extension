export function consentStatusMonitor(isEnabled = true) {
  window.__stape_extension = window.__stape_extension || {};

  function ConsentStatusMonitor() {
    const stylesId = 'consent-status-monitor-styles';

    const consentCategories = [
      'ad_storage',
      'analytics_storage',
      'ad_user_data',
      'ad_personalization'
    ];

    const monitor = {
      observer: null,
      checkInterval: null,
      consentString: null,
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
        ".message-list__group .message-list__row--child-selected .wd-debug-message-title",
        ".message-list__row--child-selected .wd-debug-message-title",
        ".wd-debug-message-title"
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.title) {
          return element.title;
        }
      }
      return null;
    };

    monitor.extractGcdValue = function (url) {
      if (!url || !url.includes('collect') || !url.includes('v=2')) {
        return null;
      }
      // Table will now genrated on the createTable
      return url.match(/gcd=([^&]+)/i)?.[1]?.toLowerCase() || null;

    };

    monitor.parseConsentBlock = function (pair) {
      const BASE64URL = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";
      const BASE64URL_INDEX = BASE64URL.split('').reduce((acc, char, index) => {
        acc[char] = index;
        return acc;
      }, {});
      const parseValue = (value) => {
        const valueMap = { 1: '-', 2: 'denied', 3: 'granted' };
        return valueMap[value] || '-';
      };
      // First chars defined implicit consent, we look for the explicit part
      const explicitConsentState = BASE64URL_INDEX[pair[1]];
      const defaultVal = (explicitConsentState >> 2) & 3;
      const updateVal = explicitConsentState & 3;
      return {
        default: parseValue(defaultVal),
        update: parseValue(updateVal)
      };
    }
    monitor.createConsentTable = function (consentString) {
      // New consent parser, 
      // Based on https://github.com/analytics-debugger/gtm-template-server-side-google-consent-parser
      const [, ad_storage, analytics_storage, ad_user_data, ad_personalization] = consentString.match(/.(..)(..)(..)(..).*/);
      const consentModel = {
        ad_storage: monitor.parseConsentBlock(ad_storage),
        analytics_storage: monitor.parseConsentBlock(analytics_storage),
        ad_user_data: monitor.parseConsentBlock(ad_user_data),
        ad_personalization: monitor.parseConsentBlock(ad_personalization)
      }
      console.log([ad_storage, analytics_storage, ad_user_data, ad_personalization])
      const statuses = [['denied', 'denied', 'denied', 'denied'], ['denied', 'denied', 'denied', 'denied']];

      const tableRows = consentCategories.map((type, index) => {
        console.log("type", type, consentModel[type])

        const status = statuses[index];
        return `
          <tr class="gtm-debug-table-row gtm-debug-consent-table-row">
            <td class="gtm-debug-table-cell gtm-debug-consent-table-cell">${type}</td>
            <td class="gtm-debug-table-cell gtm-debug-consent-table-cell">
              <div class="consent-value-cell">
                ${consentModel[type].default && consentModel[type].default !== '-' ?
            `<div class="consent ${consentModel[type].default}">${consentModel[type].default}</div>` :
            ''
          }              
                
              </div>
            </td>
            <td class="gtm-debug-table-cell gtm-debug-consent-table-cell">
              <div class="consent-value-cell">
                ${consentModel[type].update && consentModel[type].update !== '-' ?
            `<div class="consent ${consentModel[type].update}">${consentModel[type].update}</div>` :
            ''
          }              
              </div>
            </td>
          </tr>`;
      }).join('');

      return `
        <table class="gtm-debug-consent-table dma-consent-table" style="margin-bottom:1em ">
          <thead>
            <tr class="gtm-debug-table-row">
              <th class="gtm-debug-table-header-cell"><img width="16px" height="16px" src="https://cdn.stape.io/i/688a4bb90eaac838702555.ico" /></th>
              <th class="gtm-debug-table-header-cell">Default</th>
              <th class="gtm-debug-table-header-cell">Update</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      `;
    };

    monitor.showConsentTable = function (consentString) {
      const insertTarget = document.querySelector(".blg-card-tabs");
      if (!insertTarget) {
        return false;
      }

      monitor.hideConsentTable();

      const tableHTML = monitor.createConsentTable(consentString);
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
      const consentString = currentTitle ? monitor.extractGcdValue(currentTitle) : null;

      if (consentString !== monitor.consentString) {
        monitor.consentString = consentString;

        if (consentString) {
          monitor.showConsentTable(consentString);
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
      monitor.consentString = null;

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
      monitor.consentString = null;

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
  } else {
  }
}