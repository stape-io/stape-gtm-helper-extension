window.JSONBeautifier = {
  CONFIG: {
    DEFAULT_INDENTATION: 2,
    JSON_SELECTORS: [
      'pre[data-ng-if="ctrl.message.body"]',
      'div.gtm-debug-console-row__message > div'
    ],
    STYLES: {
      CODE: {
        className: 'language-json'
      }
    }
  },

  beautifyJSON: function(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid input text');
    }

    try {
      const json = JSON.parse(text);
      return JSON.stringify(json, null, this.CONFIG.DEFAULT_INDENTATION);
    } catch (error) {
      throw new Error(`Failed to parse JSON: ${error.message}`);
    }
  },

  createFormattedElement: function(beautifiedText) {
    const preElement = document.createElement('pre');
    Object.assign(preElement.style, this.CONFIG.STYLES.PRE);
    
    const codeElement = document.createElement('code');
    codeElement.className = this.CONFIG.STYLES.CODE.className;
    codeElement.textContent = beautifiedText;
    
    preElement.appendChild(codeElement);
    return { preElement, codeElement };
  }
};