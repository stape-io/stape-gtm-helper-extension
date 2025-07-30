export function consentStatusMonitor(isEnabled = true) {
  console.log("STAPE GTM HELPER: Starting Consent Status Monitor", { isEnabled })
  window.__stape_extension = window.__stape_extension || {};
  
  function ConsentStatusMonitor() {
    const stylesId = 'consent-status-monitor-styles';
    
    // Consent mappings for different gcs values (ad_storage, analytics_storage, ad_user_data, ad_personalization)
    const consentMappings = {
      'g100': ['granted', 'granted', 'granted', 'granted'],
      'g111': ['granted', 'granted', 'denied', 'denied'],
      'g110': ['granted', 'granted', 'granted', 'denied'],
      'g101': ['granted', 'granted', 'denied', 'granted'],
      'g011': ['denied', 'denied', 'denied', 'denied'],
      'g010': ['denied', 'denied', 'granted', 'denied'],
      'g001': ['denied', 'denied', 'denied', 'granted'],
      'g000': ['denied', 'denied', 'denied', 'denied']
    };

    const consentTypes = [
      'ad_storage',
      'analytics_storage',
      'ad_user_data',
      'ad_personalization'
    ];

    const monitor = {
      observer: null,
      checkInterval: null,
      currentGcsValue: null,
      isActive: false
    };

    monitor.injectStyles = function() {
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

    monitor.findSelectedRequest = function() {
      // Try multiple selectors to find the selected request
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

    monitor.extractGcsValue = function(url) {
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

    monitor.createConsentTable = function(gcsValue) {
      const statuses = consentMappings[gcsValue];
      
      const tableRows = consentTypes.map((type, index) => {
        const status = statuses[index];
        const statusDisplay = status === 'granted' ? 'Granted' : status === 'denied' ? 'Denied' : '-';
        const statusClass = status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undefined';
        
        return `
          <tr class="gtm-debug-table-row gtm-debug-consent-table-row">
            <td class="gtm-debug-table-cell gtm-debug-consent-table-cell">${type}</td>
            <td class="gtm-debug-table-cell gtm-debug-consent-table-cell">
              <div class="consent-value-cell">
                <div class="consent ${statusClass}">${statusDisplay}</div>
              </div>
            </td>
            <td class="gtm-debug-table-cell gtm-debug-consent-table-cell">
              <div class="consent-value-cell">
                <div class="consent ${statusClass}">${statusDisplay}</div>
              </div>
            </td>
          </tr>`;
      }).join('');
      
      return `
        <table class="gtm-debug-consent-table dma-consent-table" style="margin-bottom:1em ">
          <thead>
            <tr class="gtm-debug-table-row">
              <th class="gtm-debug-table-header-cell"><img width="16px" height="16px" src="https://stape.io/favicon.ico" /></th>
              <th class="gtm-debug-table-header-cell">On-page Default</th>
              <th class="gtm-debug-table-header-cell">On-page Update</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      `;
    };

    monitor.showConsentTable = function(gcsValue) {
      const insertTarget = document.querySelector(".blg-card-tabs");
      if (!insertTarget) {
        console.log('Consent Monitor - No insertion target found');
        return false;
      }

      // Remove existing table
      monitor.hideConsentTable();

      const tableHTML = monitor.createConsentTable(gcsValue);
      insertTarget.insertAdjacentHTML('afterend', tableHTML);
      
      console.log(`Consent Monitor - Showed consent table for GCS: ${gcsValue}`);
      return true;
    };

    monitor.hideConsentTable = function() {
      const existingTable = document.querySelector('.gtm-debug-consent-table');
      if (existingTable) {
        existingTable.remove();
        console.log('Consent Monitor - Removed consent table');
      }
    };

    monitor.checkCurrentState = function() {
      if (!monitor.isActive) return;
      
      const currentTitle = monitor.findSelectedRequest();
      const gcsValue = currentTitle ? monitor.extractGcsValue(currentTitle) : null;
      
      // Only update if GCS value changed
      if (gcsValue !== monitor.currentGcsValue) {
        console.log(`Consent Monitor - GCS changed from ${monitor.currentGcsValue} to ${gcsValue}`);
        monitor.currentGcsValue = gcsValue;
        
        if (gcsValue) {
          monitor.showConsentTable(gcsValue);
        } else {
          monitor.hideConsentTable();
        }
      }
    };

    monitor.start = function() {
      if (monitor.isActive) {
        console.log('Consent Monitor - Already active');
        return;
      }
      
      console.log('Consent Monitor - Starting');
      monitor.isActive = true;
      monitor.currentGcsValue = null;
      
      monitor.injectStyles();
      
      // Check immediately
      monitor.checkCurrentState();
      
      // Set up periodic checking
      monitor.checkInterval = setInterval(() => {
        monitor.checkCurrentState();
      }, 500);
      
      // Set up DOM observer for changes
      monitor.observer = new MutationObserver(() => {
        // Debounced check
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
      
      console.log('Consent Monitor - Started with periodic checking');
    };

    monitor.stop = function() {
      if (!monitor.isActive) {
        console.log('Consent Monitor - Not active');
        return;
      }
      
      console.log('Consent Monitor - Stopping');
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
      
      // Remove styles
      const styleEl = document.getElementById(stylesId);
      if (styleEl) styleEl.remove();
      
      console.log('Consent Monitor - Stopped');
    };

    return monitor;
  }

  // Initialize
  window.__stape_extension.consentStatusMonitor = ConsentStatusMonitor();

  // Auto-start based on enabled state
  if (isEnabled) {
    console.log('STAPE: Consent Status Monitor auto-starting (feature is enabled)');
    window.__stape_extension.consentStatusMonitor.start();
  } else {
    console.log('STAPE: Consent Status Monitor not auto-starting (feature is disabled)');
  }
}