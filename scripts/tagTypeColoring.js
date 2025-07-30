export function tagTypeColoring(isEnabled = true) {
  console.log("STAPE GTM HELPER: Starting Tag Type Coloring", { isEnabled })
  window.__stape_extension = window.__stape_extension || {};
  
  function TagTypeColoringMonitor() {
    const vendorStylesId = 'tag-types-coloring-styles';
    
    // Map regex to vendor info with color and icon URL
    const vendorMap = new Map([   
      [/Google Tag|Google Analytics|Google Analytics 4/i, { vendor: 'google', color: '#EEA849', icon: 'https://cdn.stape.io/i/688a4bc6bbde5900529047.ico' }],
      [/Data Tag|Stape/i, { vendor: 'stape', color: '#FF6D34', icon: 'https://cdn.stape.io/i/688a4bb90eaac838702555.ico' }],
      [/Google Ads|Floodlight|Conversion Linker/i, { vendor: 'google-ads', color: '#3CA55C', icon: 'https://cdn.stape.io/i/688a4bc6bbde5900529047.ico' }],
      [/Microsoft Ads/i, { vendor: 'bing', color: '#3CA55C', icon: 'https://www.bing.com/favicon.ico?toWww=1&redig=A5077B0B51D042998466895B120457AE' }],      
      [/Pinterest/i, { vendor: 'pinterest', color: '#92140C', icon: 'https://cdn.stape.io/i/688a4bc0042a7060906944.png' }],
      [/Facebook|Meta/i, { vendor: 'facebook', color: '#0072FF', icon: 'https://cdn.stape.io/i/688a4ebd43077257734273.ico' }],
      [/TikTok/i, { vendor: 'tiktok', color: '#333333', icon: 'https://cdn.stape.io/i/688a4bb53858e835102417.png' }],
      [/BigQuery/i, { vendor: 'bigquery', color: '#5086EC', icon: 'https://cdn.stape.io/i/688a4bca09d7a787895189.ico' }],
      [/LinkedIn/i, { vendor: 'linkedin', color: '#006699', icon: 'https://cdn.stape.io/i/688a4bcd4d8e5902639725.ico' }],
      [/Snapchat|Snap Pixel/i, { vendor: 'snapchat', color: '#FFD60A', icon: 'https://cdn.stape.io/i/688a4bbcaf65a634350590.ico' }],
      [/Klaviyo/i, { vendor: 'klaviyo', color: '#1D1E20', icon: 'https://cdn.stape.io/i/688a4bc3b2835223698495.png' }]
    ]);

    const monitor = {
      observer: null,
      detectedComponents: new Set(),
      callbacks: [],
      debounceTimer: null,
      coloredComponents: new Map()
    };

    monitor.onNewTagCards = function(callback) {
      monitor.callbacks.push(callback);
    };

    // Inject CSS styles for each vendor class with left border and icon via ::before
    monitor.injectStyles = function() {
      let styleEl = document.getElementById(vendorStylesId);
      if (styleEl) return; // already injected

      const styles = Array.from(vendorMap.values()).map(({ vendor, color, icon }) => `
        .stape-border-${vendor} {
          border-left: 4px solid ${color} !important;
         /* padding-left: 8px; /* make space for the border */
        }
        .stape-border-${vendor} .gtm-debug-card__title::before {
          content: "";
          display: inline-block;
          width: 16px;
          height: 16px;
          margin-right: 6px;
          vertical-align: middle;
          background-image: url(${icon});
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          position: relative;
          top: 1px;
        }
      `).join('\n');

      styleEl = document.createElement('style');
      styleEl.id = vendorStylesId;
      styleEl.textContent = styles;
      document.head.appendChild(styleEl);
    };

    // Detect vendor class from the tag type text
    monitor.getVendorClass = function(tagTypeText) {
      for (const [regex, info] of vendorMap) {
        if (regex.test(tagTypeText)) {
          return `stape-border-${info.vendor}`;
        }
      }
      return null;
    };

    monitor.getComponentId = function(component) {
      if (!component.hasAttribute('data-stape-coloring-id')) {
        component.setAttribute('data-stape-coloring-id', `stape-coloring-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`);
      }
      return component.getAttribute('data-stape-coloring-id') || '';
    };

    monitor.enhanceCard = function(card) {
      const componentId = monitor.getComponentId(card);
      
      if (monitor.coloredComponents.has(componentId)) {
        return null;
      }

      const tagTypeEl = card.querySelector('.gtm-debug-card__subtitle');
      if (!tagTypeEl) return null;

      const vendorClass = monitor.getVendorClass(tagTypeEl.textContent || '');
      if (!vendorClass) return null;
      if (card.classList.contains(vendorClass)) return null;

      card.classList.add(vendorClass);

      const info = {
        component: card,
        componentId: componentId,
        tagType: tagTypeEl.textContent || '',
        vendorClass: vendorClass,
        timestamp: new Date().toISOString(),
        enhanced: true
      };

      monitor.coloredComponents.set(componentId, info);
      return info;
    };

    monitor.processNewComponents = function() {
      if (monitor.debounceTimer) clearTimeout(monitor.debounceTimer);
      monitor.debounceTimer = setTimeout(() => {
        const currentComponents = document.querySelectorAll('tags-tab .gtm-debug-card');
        const newComponents = [];

        monitor.cleanupRemovedComponents();

        currentComponents.forEach((card) => {
          const componentId = monitor.getComponentId(card);
          if (!monitor.detectedComponents.has(componentId)) {
            monitor.detectedComponents.add(componentId);
            const enhancedInfo = monitor.enhanceCard(card);
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

    monitor.cleanupRemovedComponents = function() {
      const currentComponentIds = new Set();
      document.querySelectorAll('tags-tab .gtm-debug-card[data-stape-coloring-id]').forEach(component => {
        const id = component.getAttribute('data-stape-coloring-id');
        if (id) currentComponentIds.add(id);
      });

      for (const [componentId] of monitor.coloredComponents) {
        if (!currentComponentIds.has(componentId)) {
          monitor.coloredComponents.delete(componentId);
          monitor.detectedComponents.delete(componentId);
        }
      }
    };

    monitor.start = function() {
      monitor.detectedComponents.clear();
      monitor.coloredComponents.clear();
      
      monitor.injectStyles();
      monitor.processNewComponents();

      monitor.observer = new MutationObserver((mutations) => {
        let shouldProcess = false;
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node;
              if (element.classList?.contains('gtm-debug-card') || element.querySelector?.('.gtm-debug-card')) {
                shouldProcess = true;
              }
            }
          });
          
          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node;
              if (element.classList?.contains('gtm-debug-card') || element.querySelector?.('.gtm-debug-card')) {
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

    monitor.stop = function() {
      if (monitor.observer) {
        monitor.observer.disconnect();
        monitor.observer = null;
        if (monitor.debounceTimer) clearTimeout(monitor.debounceTimer);
        
        monitor.restoreAll();
        
        console.log('Tag Type Coloring Monitor stopped and all components restored');
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
        totalDetected: monitor.detectedComponents.size,
        totalColored: monitor.coloredComponents.size,
        currentlyVisible: document.querySelectorAll('tags-tab .gtm-debug-card').length,
        isMonitoring: monitor.observer !== null
      };
    };

    monitor.clearCache = function() {
      monitor.detectedComponents.clear();
      monitor.coloredComponents.clear();
      console.log('Cache cleared');
    };

    monitor.restoreAll = function() {
      const cards = document.querySelectorAll('tags-tab .gtm-debug-card');
      for (const card of cards) {
        for (const { vendor } of vendorMap.values()) {
          card.classList.remove(`stape-border-${vendor}`);
        }
      }

      const styleEl = document.getElementById(vendorStylesId);
      if (styleEl) styleEl.remove();
      
      monitor.coloredComponents.clear();
      console.log('All components restored to original state');
    };

    return monitor;
  }

  // Initialize and start
  window.__stape_extension.tagTypeColoring = TagTypeColoringMonitor();

  window.__stape_extension.tagTypeColoring.onNewTagCards((components) => {
    console.log(`Enhanced ${components.length} tag card(s) with vendor coloring`);
    components.forEach((info, index) => {
      console.log(`Card ${index + 1}: ${info.tagType} - ${info.vendorClass}`);
    });
  });

  // Auto-start based on enabled state
  console.log('=============================================================');
  console.log('STAPE: Tag Type Coloring checking isEnabled:', { isEnabled, type: typeof isEnabled, strict: isEnabled === true });
  if (isEnabled === true) {
    console.log('STAPE: Tag Type Coloring auto-starting (feature is enabled)');
    window.__stape_extension.tagTypeColoring.start();
  } else {
    console.log('STAPE: Tag Type Coloring not auto-starting (feature is disabled)');
  }
  console.log('=============================================================');
}
