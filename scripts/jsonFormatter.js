export function jsonFormatter(isEnabled = true) {
  console.log("STAPE GTM HELPER: Starting JSON Formatter", { isEnabled })
  window.__stape_extension = window.__stape_extension || {};
  
  function JsonFormatterMonitor() {
    const stylesId = 'json-formatter-styles';
    
    const monitor = {
      observer: null,
      debounceTimer: null,
      processedElements: new Map(), // Changed to Map to store original content
      inlineFormattingEnabled: false // Default disabled until explicitly enabled
    };

    monitor.injectStyles = function() {
      let styleEl = document.getElementById(stylesId);
      if (styleEl) return;

      const styles = `
        .stape-json-formatted {
          position: relative;
        }
        
        .stape-json-copy-btn {
          position: absolute;
          top: 4px;
          right: 4px;
          background: rgb(40, 167, 69);
          color: white;
          border: none;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          cursor: pointer;
          opacity: 1;
          z-index: 1000;
        }
        
        /* JSON syntax highlighting styles - reused from UrlBlockParser */
        .json-key {
          color: #e91e63 !important;
          font-weight: bold !important;
        }
        .json-string {
          color: #4caf50 !important;
        }
        .json-number {
          color: #ff9800 !important;
          font-weight: 500 !important;
        }
        .json-boolean {
          color: #2196f3 !important;
          font-weight: bold !important;
        }
        .json-null {
          color: #9c27b0 !important;
          font-weight: bold !important;
        }
        .json-brace {
          color: #607d8b !important;
          font-weight: bold !important;
        }
        .json-bracket {
          color: #607d8b !important;
          font-weight: bold !important;
        }
        .json-comma {
          color: #757575 !important;
        }
      `;

      styleEl = document.createElement('style');
      styleEl.id = stylesId;
      styleEl.textContent = styles;
      document.head.appendChild(styleEl);
    };


    monitor.findAndFormatJsonCells = function() {
      // Only process if inline formatting is enabled
      if (!monitor.inlineFormattingEnabled) return;
      
      const httpBodyCells = document.querySelectorAll('.gtm-debug-table-cell--http-body pre[data-ng-bind="ctrl.getBody()"]');
      
      httpBodyCells.forEach(preElement => {
        // Skip if already processed
        if (monitor.processedElements.has(preElement)) return;
        
        const jsonText = preElement.textContent.trim();
        if (!jsonText) return;
        
        try {
          // Try to parse as JSON
          const parsed = JSON.parse(jsonText);
          
          // Store original content before formatting
          monitor.processedElements.set(preElement, {
            originalContent: preElement.innerHTML,
            originalJson: jsonText
          });
          
          // Automatically format the JSON with syntax highlighting
          monitor.autoFormatJsonCell(preElement, jsonText);
          
          console.log('STAPE: Auto-formatted JSON in HTTP body cell:', jsonText.substring(0, 100) + '...');
          
        } catch (error) {
          // Not valid JSON, skip
        }
      });
    };

    // Reuse the JSON syntax highlighting function from UrlBlockParser
    monitor.syntaxHighlightJSON = function(json) {
      // Check if the UrlBlockParser is available to reuse its function
      if (window.__stape_extension && window.__stape_extension.urlBlocksParser) {
        // Try to access the syntax highlighting function - we'll implement our own version
      }
      
      // Escape HTML to prevent XSS
      json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      // Use a single comprehensive regex to tokenize and highlight
      return json.replace(
        /("(?:[^"\\]|\\.)*")\s*:|("(?:[^"\\]|\\.)*")|(\b-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|(\b(?:true|false)\b)|(\bnull\b)|([{}])|(\[|\])|,/g,
        function(match, key, string, number, boolean, nullValue, brace, bracket, comma) {
          if (key) {
            return '<span class="json-key">' + key + ':</span>';
          } else if (string) {
            return '<span class="json-string">' + string + '</span>';
          } else if (number) {
            return '<span class="json-number">' + number + '</span>';
          } else if (boolean) {
            return '<span class="json-boolean">' + boolean + '</span>';
          } else if (nullValue) {
            return '<span class="json-null">' + nullValue + '</span>';
          } else if (brace) {
            return '<span class="json-brace">' + brace + '</span>';
          } else if (bracket) {
            return '<span class="json-bracket">' + bracket + '</span>';
          } else if (comma) {
            return '<span class="json-comma">,</span>';
          }
          return match;
        }
      );
    };

    monitor.autoFormatJsonCell = function(preElement, originalJson) {
      try {
        // Parse and format the JSON
        const parsed = JSON.parse(originalJson);
        const formatted = JSON.stringify(parsed, null, 2);
        const highlighted = monitor.syntaxHighlightJSON(formatted);
        
        // Replace the content with formatted and highlighted JSON
        preElement.innerHTML = highlighted;
        preElement.classList.add('stape-json-formatted');
        
        // Ensure relative positioning for the copy button
        preElement.style.position = 'relative';
        
        // Add copy button
        const elementData = monitor.processedElements.get(preElement);
        if (elementData) {
          monitor.addCopyIcon(preElement, elementData.originalJson);
        }
        
        console.log('STAPE: Auto-formatted JSON cell');
        
      } catch (error) {
        console.error('STAPE: Error auto-formatting JSON:', error);
      }
    };

    monitor.addCopyIcon = function(preElement, originalJson) {
      // Don't add if already exists
      if (preElement.querySelector('.stape-json-copy-btn')) return;
      
      const copyBtn = document.createElement('button');
      copyBtn.className = 'stape-json-copy-btn';
      copyBtn.textContent = 'Copy';
      copyBtn.title = 'Copy JSON to clipboard';
      
      // Copy functionality - replicated from UrlBlockParser
      const copyToClipboard = () => {
        navigator.clipboard.writeText(originalJson).then(() => {
          const originalText = copyBtn.textContent;
          copyBtn.textContent = 'Copied!';
          copyBtn.style.background = '#20c997';
          setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.background = 'rgb(40, 167, 69)';
          }, 1500);
        }).catch(err => {
          console.error('Failed to copy to clipboard:', err);
          copyBtn.textContent = 'Failed';
          copyBtn.style.background = '#dc3545';
          setTimeout(() => {
            copyBtn.textContent = 'Copy';
            copyBtn.style.background = 'rgb(40, 167, 69)';
          }, 1500);
        });
      };
      
      copyBtn.onclick = (e) => {
        e.stopPropagation();
        copyToClipboard();
      };
      
      preElement.appendChild(copyBtn);
    };

    monitor.processNewElements = function() {
      if (monitor.debounceTimer) clearTimeout(monitor.debounceTimer);
      monitor.debounceTimer = setTimeout(() => {
        monitor.findAndFormatJsonCells();
      }, 300);
    };

    monitor.startObserver = function() {
      if (monitor.observer) return;
      
      monitor.observer = new MutationObserver((mutations) => {
        let shouldProcess = false;
        
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if the added node contains HTTP body cells
              if (node.classList?.contains('gtm-debug-table-cell--http-body') ||
                  node.querySelector?.('.gtm-debug-table-cell--http-body')) {
                shouldProcess = true;
              }
            }
          });
        });
        
        if (shouldProcess) {
          monitor.processNewElements();
        }
      });
      
      monitor.observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    };

    monitor.enableFormatting = function() {
      monitor.inlineFormattingEnabled = true;
      monitor.findAndFormatJsonCells();
      if (!monitor.observer) {
        monitor.startObserver();
      }
      console.log('STAPE: JSON formatting enabled');
    };

    monitor.disableFormatting = function() {
      monitor.inlineFormattingEnabled = false;
      
      // Restore original content and remove formatting
      monitor.processedElements.forEach((elementData, element) => {
        try {
          // Check if element still exists in DOM and has required properties
          if (element && element.parentNode && element.classList && element.style) {
            // Restore original HTML content
            element.innerHTML = elementData.originalContent;
            element.classList.remove('stape-json-formatted');
            // Reset any inline styles we added
            element.style.position = '';
          }
        } catch (error) {
          console.warn('STAPE: Error restoring element:', error);
        }
      });
      monitor.processedElements.clear();
      
      console.log('STAPE: JSON formatting disabled');
    };

    monitor.start = function() {
      console.log('JSON Formatter starting');
      monitor.injectStyles();
      // Only start observer, don't auto-format until enabled
      monitor.startObserver();
    };

    monitor.stop = function() {
      console.log('JSON Formatter stopping');
      
      if (monitor.observer) {
        monitor.observer.disconnect();
        monitor.observer = null;
      }
      
      if (monitor.debounceTimer) {
        clearTimeout(monitor.debounceTimer);
      }
      
      // Restore original content and remove formatting
      monitor.processedElements.forEach((elementData, element) => {
        try {
          // Check if element still exists in DOM and has required properties
          if (element && element.parentNode && element.classList && element.style) {
            // Restore original HTML content
            element.innerHTML = elementData.originalContent;
            element.classList.remove('stape-json-formatted');
            // Reset any inline styles we added
            element.style.position = '';
          }
        } catch (error) {
          console.warn('STAPE: Error restoring element:', error);
        }
      });
      monitor.processedElements.clear();
      
      try {
        const styleEl = document.getElementById(stylesId);
        if (styleEl && styleEl.parentNode) {
          styleEl.remove();
        }
      } catch (error) {
        console.warn('STAPE: Error removing styles:', error);
      }
    };

    return monitor;
  }

  // Initialize
  const jsonFormatterMonitor = JsonFormatterMonitor();
  
  // Create the API interface that matches other features
  window.__stape_extension.jsonFormatterInline = {
    start: function() {
      console.log('Inline JSON Formatter starting');
      jsonFormatterMonitor.start();
      jsonFormatterMonitor.enableFormatting();
    },
    stop: function() {
      console.log('Inline JSON Formatter stopping');
      jsonFormatterMonitor.disableFormatting();
      jsonFormatterMonitor.stop();
    }
  };

  // Auto-start based on enabled state
  // Always start the monitor (for observer setup)
  jsonFormatterMonitor.start();
  
  // Only enable formatting if the feature is enabled
  if (isEnabled) {
    console.log('STAPE: JSON Formatter auto-enabling (feature is enabled)');
    jsonFormatterMonitor.enableFormatting();
  } else {
    console.log('STAPE: JSON Formatter not auto-enabling (feature is disabled)');
  }
}