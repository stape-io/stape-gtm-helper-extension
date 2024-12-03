class JSONBeautifierContent {
  constructor() {
    this.processedElements = new WeakSet();
    this.setupObserver();
    this.processExistingElements();
  }

  setupObserver() {
    const observer = new MutationObserver(() => this.processExistingElements());
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  processExistingElements() {
    JSONBeautifier.CONFIG.JSON_SELECTORS.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        if (!this.processedElements.has(element)) {
          this.beautifyElement(element);
          this.processedElements.add(element);
        }
      });
    });
  }

  beautifyElement(element) {
    const text = element.textContent.trim();
    
    if (!text.startsWith('{') && !text.startsWith('[')) {
      return;
    }

    try {
      const beautified = JSONBeautifier.beautifyJSON(text);
      const { preElement, codeElement } = JSONBeautifier.createFormattedElement(beautified);
      
      element.innerHTML = '';
      element.appendChild(preElement);
      
      if (typeof Prism !== 'undefined') {
        Prism.highlightElement(codeElement);
      }
    } catch (error) {
      console.debug('Not valid JSON, skipping beautification:', error.message);
    }
  }
}

// Initialize the beautifier when the document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new JSONBeautifierContent());
} else {
  new JSONBeautifierContent();
}