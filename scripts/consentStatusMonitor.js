export function consentStatusMonitor() {
  console.log("STAPE GTM HELPER: Starting Consent Status Monitor")
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
      detectedComponents: new Set(),
      callbacks: [],
      debounceTimer: null,
      lastTitle: null
    };

    monitor.onConsentStatusUpdate = function(callback) {
      monitor.callbacks.push(callback);
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

    monitor.checkAndUpdate = function() {
      console.log('Consent Monitor - checkAndUpdate called');
      const targetElement = document.querySelector(".message-list__group .message-list__row--child-selected .wd-debug-message-title");
      console.log('Consent Monitor - Target element found:', !!targetElement);
      
      if (targetElement) {
        const currentTitle = targetElement.title;
        console.log('Consent Monitor - Current title:', currentTitle);
        
        if (currentTitle !== monitor.lastTitle) {
          console.log('Consent Monitor - Title changed from', monitor.lastTitle, 'to', currentTitle);
          
          if (currentTitle && currentTitle.startsWith('collect') && currentTitle.includes('v=2')) {
            console.log('Consent Monitor - Title matches collect pattern');
            const gcsMatch = currentTitle.match(/gcs=([^&]+)/i);
            
            if (gcsMatch) {
              const gcsValue = gcsMatch[1].toLowerCase();
              console.log('Consent Monitor - GCS value found:', gcsValue);
              console.log('Consent Monitor - Available mappings:', Object.keys(consentMappings));
              
              if (consentMappings[gcsValue]) {
                console.log('Consent Monitor - Injecting consent status for:', gcsValue);
                monitor.injectConsentStatus(gcsValue);
                monitor.executeCallbacks([{
                  gcsValue: gcsValue,
                  consentStates: consentMappings[gcsValue],
                  timestamp: new Date().toISOString()
                }]);
              } else {
                console.log('Consent Monitor - No mapping found for GCS:', gcsValue);
              }
            } else {
              console.log('Consent Monitor - No GCS match found in title');
            }
          } else {
            console.log('Consent Monitor - Title does not match collect pattern, removing status');
            monitor.removeConsentStatus();
          }
          monitor.lastTitle = currentTitle;
        } else {
          console.log('Consent Monitor - Title unchanged');
        }
      } else {
        console.log('Consent Monitor - No target element found');
        if (monitor.lastTitle !== null) {
          monitor.lastTitle = null;
        }
      }
    };

    monitor.injectConsentStatus = function(gcsValue) {
      console.log('Consent Monitor - injectConsentStatus called with:', gcsValue);
      const insertTarget = document.querySelector(".blg-card-tabs");
      console.log('Consent Monitor - Insert target found:', !!insertTarget);
      if (!insertTarget) return;

      monitor.removeConsentStatus();

      const statuses = consentMappings[gcsValue];
      console.log('Consent Monitor - Consent types:', consentTypes);
      console.log('Consent Monitor - Status mapping:', statuses);
      
      // Generate table rows matching GTM's exact structure
      const tableRows = consentTypes.map((type, index) => {
        const status = statuses[index];
        const statusDisplay = status === 'granted' ? 'Granted' : status === 'denied' ? 'Denied' : '-';
        const statusClass = status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undefined';
        
        console.log(`Consent Monitor - Generating row for ${type}: ${status} -> ${statusDisplay}`);
        
        return `
          <tr class="gtm-debug-table-row gtm-debug-consent-table-row">
            <td class="gtm-debug-table-cell gtm-debug-consent-table-cell">${type}</td>
            <td class="gtm-debug-table-cell gtm-debug-consent-table-cell" data-ng-if="!ctrl.isContainerConsentConfigEnabled">
              <div class="consent-value-cell">
                <div data-ng-class="{'consent granted': ctrl.getConsentState(consent.consentEntry.default) === ctrl.ConsentState.GRANTED, 'consent denied': ctrl.getConsentState(consent.consentEntry.default) === ctrl.ConsentState.DENIED}" class="consent ${statusClass}">${statusDisplay}</div>
              </div>
            </td>
            <td class="gtm-debug-table-cell gtm-debug-consent-table-cell">
              <div class="consent-value-cell">
                <div data-ng-class="{'consent granted': ctrl.getConsentState(consent.consentEntry.update) === ctrl.ConsentState.GRANTED, 'consent denied': ctrl.getConsentState(consent.consentEntry.update) === ctrl.ConsentState.DENIED}" class="consent ${statusClass}">${statusDisplay}</div>
              </div>
            </td>
          </tr>`;
      }).join('');
      
      console.log('Consent Monitor - Generated table rows:', tableRows);
      
      const consentTableHTML = `
        <table class="gtm-debug-consent-table dma-consent-table" data-ng-if="ctrl.isUpdatedConsentTabEnabled">
          <thead>
            <tr class="gtm-debug-table-row">
              <th class="gtm-debug-table-header-cell">Type</th>
              <th class="gtm-debug-table-header-cell" data-ng-if="!ctrl.isContainerConsentConfigEnabled">On-page Default</th>
              <th class="gtm-debug-table-header-cell">On-page Update</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      `;
      
      console.log('Consent Monitor - Final HTML:', consentTableHTML);
      insertTarget.insertAdjacentHTML('afterend', consentTableHTML);

      console.log(`Consent Monitor - Injected consent table for GCS: ${gcsValue}`);
    };

    monitor.removeConsentStatus = function() {
      const existingTable = document.querySelector('.gtm-debug-consent-table');
      if (existingTable) existingTable.remove();
    };

    monitor.processNewComponents = function() {
      if (monitor.debounceTimer) clearTimeout(monitor.debounceTimer);
      monitor.debounceTimer = setTimeout(() => {
        monitor.checkAndUpdate();
      }, 100);
    };

    monitor.start = function() {
      monitor.injectStyles();
      monitor.processNewComponents();

      monitor.observer = new MutationObserver((mutations) => {
        let shouldProcess = false;
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node;
              if (element.classList?.contains('message-list__row--child-selected') || 
                  element.querySelector?.('.message-list__row--child-selected') ||
                  element.classList?.contains('wd-debug-message-title') ||
                  element.querySelector?.('.wd-debug-message-title')) {
                shouldProcess = true;
              }
            }
          });
          
          // Also check for attribute changes on existing elements
          if (mutation.type === 'attributes' && 
              (mutation.target.classList?.contains('message-list__row') ||
               mutation.target.classList?.contains('wd-debug-message-title'))) {
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
        attributeFilter: ['class', 'title']
      });
    };

    monitor.stop = function() {
      if (monitor.observer) {
        monitor.observer.disconnect();
        monitor.observer = null;
        if (monitor.debounceTimer) clearTimeout(monitor.debounceTimer);
        
        monitor.removeConsentStatus();
        
        console.log('Consent Status Monitor stopped and consent status removed');
      }
    };

    monitor.executeCallbacks = function(components) {
      monitor.callbacks.forEach(callback => {
        try { callback(components); } catch (error) {
          console.error('Error in callback:', error);
        }
      });
    };

    monitor.getStats = function() {
      return {
        isMonitoring: monitor.observer !== null,
        lastTitle: monitor.lastTitle,
        hasConsentTable: !!document.querySelector('.gtm-debug-consent-table')
      };
    };

    monitor.clearCache = function() {
      monitor.lastTitle = null;
      console.log('Cache cleared');
    };

    return monitor;
  }

  // Initialize and start
  window.__stape_extension.consentStatusMonitor = ConsentStatusMonitor();
  
  // Add manual test function for debugging
  window.__stape_extension.consentStatusMonitor.testInject = function(gcsValue = 'g100') {
    console.log('Manual test injection with GCS:', gcsValue);
    window.__stape_extension.consentStatusMonitor.injectConsentStatus(gcsValue);
  };

  window.__stape_extension.consentStatusMonitor.onConsentStatusUpdate((components) => {
    console.log(`Consent status updated for ${components.length} component(s)`);
    components.forEach((info, index) => {
      console.log(`Update ${index + 1}: GCS=${info.gcsValue}, States=${info.consentStates.join(',')}`);
    });
  });

  // Auto-start the monitor
  setTimeout(() => {
      window.__stape_extension.consentStatusMonitor.start();
  }, 500);
}