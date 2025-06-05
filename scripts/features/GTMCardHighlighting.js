export default class GTMCardHighlighting {
  constructor(stapeHelper) {
    this.stapeHelper = stapeHelper;
    this.vendorMap = new Map([
      [/Google Tag|Google Analytics|Google Analytics 4/i, { 
        vendor: 'google',
        color: '#EEA849', 
        icon: 'https://www.google.com/favicon.ico' 
      }],
      [/Data Tag|Stape/i, { 
        vendor: 'stape',
        color: '#FF6D34', 
        icon: 'https://stape.io/favicon.ico' 
      }],
      [/Google Ads|Microsoft Ads|Floodlight|Conversion Linker/i, { 
        vendor: 'google-ads',
        color: '#3CA55C', 
        icon: 'https://ads.google.com/favicon.ico' 
      }],
      [/Pinterest/i, { 
        vendor: 'pinterest',
        color: '#92140C', 
        icon: 'https://pinterest.com/favicon.ico' 
      }],
      [/Facebook|Meta/i, { 
        vendor: 'facebook',
        color: '#0072FF', 
        icon: 'https://facebook.com/favicon.ico' 
      }],
      [/TikTok/i, { 
        vendor: 'tiktok',
        color: '#333333', 
        icon: 'https://tiktok.com/favicon.ico' 
      }],
      [/BigQuery/i, { 
        vendor: 'bigquery',
        color: '#5086EC', 
        icon: 'https://cloud.google.com/favicon.ico' 
      }],
      [/LinkedIn/i, { 
        vendor: 'linkedin',
        color: '#006699', 
        icon: 'https://linkedin.com/favicon.ico' 
      }],
      [/Snapchat|Snap Pixel/i, { 
        vendor: 'snapchat',
        color: '#FFD60A', 
        icon: 'https://snapchat.com/favicon.ico' 
      }],
      [/Klaviyo/i, { 
        vendor: 'klaviyo',
        color: '#1D1E20', 
        icon: 'https://klaviyo.com/favicon.ico' 
      }]
    ]);
    
    this.mutationCallback = null;
    this.initialized = false;
    
    // Initialize the feature
    this.init();
  }

  // Initialize the feature
  init() {
    if (this.initialized) return;
    
    // Inject styles
    this.injectStyles();
    
    // Process existing cards
    this.processExistingCards();
    
    // Setup mutation observer
    this.mutationCallback = (mutations) => this.onMutation(mutations);
    this.stapeHelper.mutationObserver.addCallback(this.mutationCallback);
    
    this.initialized = true;
    console.log('GTM Card Highlighting initialized');
  }

  // Generate and inject CSS styles
  injectStyles() {
    let cssRules = `
      /* Base styles for GTM card highlighting */
      .stape-card-type-hl-enabled .gtm-debug-card[data-vendor] {
        transition: border-left-color 0.3s ease;
      }
      
      /* Base styles for vendor icons */
      .gtm-debug-card .stape-card-type-hl-vendor-icon {
        width: 16px;
        height: 16px;
        margin-right: 8px;
        vertical-align: middle;
        display: none;
        transition: opacity 0.3s ease;
      }
      
      .stape-card-type-hl-enabled .gtm-debug-card .stape-card-type-hl-vendor-icon {
        display: inline-block;
      }
      
      /* Vendor-specific styles */
    `;
    
    // Generate CSS rules for each vendor
    this.vendorMap.forEach((config) => {
      const { vendor, color, icon } = config;
      cssRules += `
      .stape-card-type-hl-enabled .gtm-debug-card[data-vendor="${vendor}"] {
        border-left: 4px solid ${color};
      }
      
      .gtm-debug-card[data-vendor="${vendor}"] .stape-card-type-hl-vendor-icon {
        content: url('${icon}');
      }
      `;
    });
    
    this.stapeHelper.styleManager.inject('stape-gtm-card-highlighting', cssRules);
  }

  // Process a single GTM debug card
  processCard(card) {
    // Skip if already processed
    if (card.hasAttribute('data-vendor')) {
      return;
    }
    
    const tagText = card.innerText;
    
    // Find matching vendor configuration
    for (const [pattern, config] of this.vendorMap) {
      if (pattern.test(tagText)) {
        const { vendor } = config;
        
        // Set vendor data attribute
        card.setAttribute('data-vendor', vendor);
        
        // Add icon placeholder to title
        const titleElement = card.querySelector('.gtm-debug-card__title');
        if (titleElement && !titleElement.querySelector('.stape-card-type-hl-vendor-icon')) {
          const iconElement = document.createElement('span');
          iconElement.className = 'stape-card-type-hl-vendor-icon';
          iconElement.setAttribute('data-vendor', vendor);
          
          titleElement.insertBefore(iconElement, titleElement.firstChild);
        }
        
        break;
      }
    }
  }

  // Process existing cards
  processExistingCards() {
    const cards = document.querySelectorAll(
      '.tags-tab__fired-tags .gtm-debug-card, .tags-tab__blocked-tags .gtm-debug-card'
    );
    
    cards.forEach(card => this.processCard(card));
  }

  // Mutation observer callback
  onMutation(mutations) {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if the added node is a GTM debug card
          if (node.classList && node.classList.contains('gtm-debug-card')) {
            this.processCard(node);
          }
          
          // Check if any descendants are GTM debug cards
          const nestedCards = node.querySelectorAll && node.querySelectorAll('.gtm-debug-card');
          if (nestedCards) {
            nestedCards.forEach(card => this.processCard(card));
          }
        }
      });
    });
  }

  // Enable highlighting
  enable() {
    document.body.classList.add('stape-card-type-hl-enabled');
    console.log('GTM card highlighting enabled');
  }

  // Disable highlighting
  disable() {
    document.body.classList.remove('stape-card-type-hl-enabled');
    console.log('GTM card highlighting disabled');
  }

  // Destroy the feature
  destroy() {
    if (!this.initialized) return;
    
    // Remove styles
    this.stapeHelper.styleManager.remove('stape-gtm-card-highlighting');
    
    // Disable highlighting
    this.disable();
    
    // Remove mutation observer callback
    if (this.mutationCallback) {
      this.stapeHelper.mutationObserver.removeCallback(this.mutationCallback);
    }
    
    // Remove data attributes and icons
    const cards = document.querySelectorAll('.gtm-debug-card[data-vendor]');
    cards.forEach(card => {
      card.removeAttribute('data-vendor');
      const icon = card.querySelector('.stape-card-type-hl-vendor-icon');
      if (icon) icon.remove();
    });
    
    this.initialized = false;
    console.log('GTM Card Highlighting destroyed');
  }
}