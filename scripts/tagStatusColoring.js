export function tagStatusColoring(isEnabled = true) {
  window.__stape_extension = window.__stape_extension || {};

  function TagStatusColoringMonitor() {
    const vendorStylesId = 'tag-status-coloring-styles';

    const monitor = {
      observer: null,
      detectedComponents: new Set(),
      callbacks: [],
      debounceTimer: null,
      coloredComponents: new Map()
    };

    monitor.onNewTagCards = function (callback) {
      monitor.callbacks.push(callback);
    };

    monitor.injectStyles = function () {
      let styleEl = document.getElementById(vendorStylesId);
      if (styleEl) return;

      const styles = `
        .stape-status-failed {
          /*border-left: 4px solid #dc3545 !important;
          background-color: #fff5f5 !important;
          */
        }
        .stape-status-failed .gtm-debug-card__subtitle::before {
          content: "⚠️";
          display: inline-block;
          font-size: 14px;
        }
        .stape-status-failed .gtm-debug-card__subtitle {
          background-color: #dc354599 !important;
          color: white !important;
        }
      `;

      styleEl = document.createElement('style');
      styleEl.id = vendorStylesId;
      styleEl.textContent = styles;
      document.head.appendChild(styleEl);
    };

    monitor.hasFailedStatus = function (card) {
      const cardText = card.textContent || '';
      return /failed/i.test(cardText);
    };

    monitor.getComponentId = function (component) {
      if (!component.hasAttribute('data-stape-status-coloring-id')) {
        component.setAttribute(
          'data-stape-status-coloring-id',
          `stape-status-coloring-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
        );
      }
      return component.getAttribute('data-stape-status-coloring-id') || '';
    };

    monitor.enhanceCard = function (card) {
      const componentId = monitor.getComponentId(card);
      const isFailedNow = monitor.hasFailedStatus(card);
      const hasStatusFailedClass = card.classList.contains('stape-status-failed');

      // If failed now → ensure class is present and cache reflects "failed"
      if (isFailedNow) {
        if (!hasStatusFailedClass) {
          card.classList.add('stape-status-failed');
        }
        if (!monitor.coloredComponents.has(componentId)) {
          const tagTypeEl = card.querySelector('.gtm-debug-card__subtitle');
          const info = {
            component: card,
            componentId: componentId,
            tagType: tagTypeEl?.textContent || 'Unknown',
            status: 'failed',
            timestamp: new Date().toISOString(),
            enhanced: true
          };
          monitor.coloredComponents.set(componentId, info);
          return info;
        }
        return null;
      }

      if (hasStatusFailedClass) {
        card.classList.remove('stape-status-failed');
      }
      if (monitor.coloredComponents.has(componentId)) {
        monitor.coloredComponents.delete(componentId);
      }
      return null;
    };

    monitor.processNewComponents = function () {
      if (monitor.debounceTimer) clearTimeout(monitor.debounceTimer);
      monitor.debounceTimer = setTimeout(() => {
        const currentComponents = document.querySelectorAll('tags-tab .gtm-debug-card');
        const newComponents = [];

        monitor.cleanupRemovedComponents();

        currentComponents.forEach((card) => {
          const componentId = monitor.getComponentId(card);
          monitor.detectedComponents.add(componentId);
          const enhancedInfo = monitor.enhanceCard(card);
          if (enhancedInfo) {
            newComponents.push(enhancedInfo);
          }
        });

        if (newComponents.length > 0) {
          monitor.executeCallbacks(newComponents);
        }
      }, 100);
    };

    monitor.cleanupRemovedComponents = function () {
      const currentComponentIds = new Set();
      document
        .querySelectorAll('tags-tab .gtm-debug-card[data-stape-status-coloring-id]')
        .forEach((component) => {
          const id = component.getAttribute('data-stape-status-coloring-id');
          if (id) currentComponentIds.add(id);
        });

      for (const [componentId] of monitor.coloredComponents) {
        if (!currentComponentIds.has(componentId)) {
          monitor.coloredComponents.delete(componentId);
          monitor.detectedComponents.delete(componentId);
        }
      }
    };

    monitor.start = function () {
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
              if (
                element.classList?.contains('gtm-debug-card') ||
                element.querySelector?.('.gtm-debug-card')
              ) {
                shouldProcess = true;
              }
            }
          });

          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node;
              if (
                element.classList?.contains('gtm-debug-card') ||
                element.querySelector?.('.gtm-debug-card')
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
        totalColored: monitor.coloredComponents.size,
        currentlyVisible: document.querySelectorAll('tags-tab .gtm-debug-card').length,
        isMonitoring: monitor.observer !== null
      };
    };

    monitor.clearCache = function () {
      monitor.detectedComponents.clear();
      monitor.coloredComponents.clear();
    };

    monitor.restoreAll = function () {
      const cards = document.querySelectorAll('tags-tab .gtm-debug-card');
      for (const card of cards) {
        card.classList.remove('stape-status-failed');
      }

      const styleEl = document.getElementById(vendorStylesId);
      if (styleEl) styleEl.remove();

      monitor.coloredComponents.clear();
    };

    return monitor;
  }

  window.__stape_extension.tagStatusColoring = TagStatusColoringMonitor();

  window.__stape_extension.tagStatusColoring.onNewTagCards((components) => {});

  if (isEnabled) {
    window.__stape_extension.tagStatusColoring.start();
  }
}
