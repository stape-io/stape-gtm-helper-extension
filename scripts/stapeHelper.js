// Import features
import GTMCardHighlighting from './features/GTMCardHighlighting.js';

export default class StapeHelper {
  constructor(config = {}) {
    this.config = config;
    this.features = {};
    
    // Initialize shared utilities
    this.initSharedUtilities();
    
    // Initialize features based on config
    this.initializeFeatures();
  }

  // Initialize shared utilities
  initSharedUtilities() {
    this.styleManager = this.createStyleManager();
    this.mutationObserver = this.createMutationObserver();
  }

  // Style management utility
  createStyleManager() {
    return {
      inject(id, cssContent) {
        const existing = document.getElementById(id);
        if (existing) existing.remove();
        
        const style = document.createElement('style');
        style.id = id;
        style.textContent = cssContent;
        document.head.appendChild(style);
        return style;
      },
      
      remove(id) {
        const style = document.getElementById(id);
        if (style) style.remove();
      }
    };
  }

  // Mutation observer utility
  createMutationObserver() {
    const callbacks = new Set();
    
    const observer = new MutationObserver((mutations) => {
      callbacks.forEach(callback => {
        try {
          callback(mutations);
        } catch (error) {
          console.warn('StapeHelper: Observer error:', error);
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    return {
      addCallback(callback) {
        callbacks.add(callback);
      },
      removeCallback(callback) {
        callbacks.delete(callback);
      }
    };
  }

  // Initialize features based on configuration
  initializeFeatures() {
    // GTM Card Highlighting
    if (this.config.GTMCardHighlighting) {
      this.features.GTMCardHighlighting = new GTMCardHighlighting(this);
      this.features.GTMCardHighlighting.enable();
    }
    
    // Future features can be added here following the same pattern
    // if (this.config.OtherFeature) {
    //   this.features.OtherFeature = new OtherFeature(this);
    //   this.features.OtherFeature.enable();
    // }
  }

  // Get a feature
  getFeature(name) {
    return this.features[name];
  }
}