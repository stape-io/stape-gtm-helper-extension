window.JSONBeautifier = {
  CONFIG: {
    DEFAULT_INDENTATION: 2,
    JSON_SELECTORS: [
      'pre[data-ng-if="ctrl.message.body"]', // The request body in HTTP Request Details
      //'div.gtm-debug-console-row__message > div', // Console messages in GTM debugger ### Not working
      'div.gtm-sheet-wrapper.gtm-sheet-with-header > div.sheet-content.sheet-content--padded.content--new-ui > div > http-message-details > div > http-url-details > div > table > tbody > tr > td:nth-child(2) > pre' // The request URL in HTTP Request Details
    ],
    STYLES: {
      PRE: {
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        margin: '0',
        padding: '8px',
        backgroundColor: '#f5f8fa', // Updated background color
        border: '1px solid #e0e0e0',
        borderRadius: '4px',
        fontSize: '13px',
        lineHeight: '1.5',
        fontFamily: 'monospace',
      },
      CODE: {
        className: 'language-json'
      },
      URL: {
        className: 'language-url'
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

   createFormattedElement: function(beautifiedText, type = 'json') {
    const preElement = document.createElement('pre');
    Object.assign(preElement.style, this.CONFIG.STYLES.PRE);
    
    const codeElement = document.createElement('code');
    codeElement.className = type === 'json' ? 
      this.CONFIG.STYLES.CODE.className : 
      this.CONFIG.STYLES.URL.className;
    
    codeElement.style.display = type === 'json' ? 
      this.CONFIG.STYLES.CODE.display : 
      this.CONFIG.STYLES.URL.display;
    
    codeElement.style.overflow = type === 'json' ? 
      this.CONFIG.STYLES.CODE.overflow : 
      this.CONFIG.STYLES.URL.overflow;
    
    codeElement.style.maxHeight = type === 'json' ? 
      this.CONFIG.STYLES.CODE.maxHeight : 
      this.CONFIG.STYLES.URL.maxHeight;
    
    codeElement.textContent = beautifiedText;
    
    preElement.appendChild(codeElement);
    return { preElement, codeElement };
  }
};

// Function to test if variable is a string
function isString(variable) {
  return typeof variable === "string";
}

// Function to test if variable is a JSON string
function isJsonString(str) {
  try {
      JSON.parse(str);
  } catch (e) {
      return false;
  }
  return true;
}