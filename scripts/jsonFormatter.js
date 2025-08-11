export function jsonFormatter(isEnabled = true) {
  window.__stape_extension = window.__stape_extension || {};

  function JsonFormatterMonitor() {
    const stylesId = 'json-formatter-styles';

    const monitor = {
      observer: null,
      debounceTimer: null,
      processedElements: new Map(),
      inlineFormattingEnabled: false
    };

    monitor.injectStyles = function () {
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

    monitor.findAndFormatJsonCells = function () {
      if (!monitor.inlineFormattingEnabled) return;

      const httpBodyCells = document.querySelectorAll(
        '.gtm-debug-table-cell--http-body pre[data-ng-bind="ctrl.getBody()"]'
      );

      httpBodyCells.forEach((preElement) => {
        if (monitor.processedElements.has(preElement)) return;

        const jsonText = preElement.textContent.trim();
        if (!jsonText) return;

        try {
          const parsed = JSON.parse(jsonText);

          monitor.processedElements.set(preElement, {
            originalContent: preElement.innerHTML,
            originalJson: jsonText
          });

          monitor.autoFormatJsonCell(preElement, jsonText);
        } catch (error) {}
      });
    };

    monitor.syntaxHighlightJSON = function (json) {
      if (window.__stape_extension && window.__stape_extension.urlBlocksParser) {
      }

      json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      return json.replace(
        /("(?:[^"\\]|\\.)*")\s*:|("(?:[^"\\]|\\.)*")|(\b-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|(\b(?:true|false)\b)|(\bnull\b)|([{}])|(\[|\])|,/g,
        function (match, key, string, number, boolean, nullValue, brace, bracket, comma) {
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

    monitor.autoFormatJsonCell = function (preElement, originalJson) {
      try {
        const parsed = JSON.parse(originalJson);
        const formatted = JSON.stringify(parsed, null, 2);
        const highlighted = monitor.syntaxHighlightJSON(formatted);

        preElement.innerHTML = highlighted;
        preElement.classList.add('stape-json-formatted');

        preElement.style.position = 'relative';

        const elementData = monitor.processedElements.get(preElement);
        if (elementData) {
          monitor.addCopyIcon(preElement, elementData.originalJson);
        }
      } catch (error) {
        console.error('STAPE: Error auto-formatting JSON:', error);
      }
    };

    monitor.addCopyIcon = function (preElement, originalJson) {
      if (preElement.querySelector('.stape-json-copy-btn')) return;

      const copyBtn = document.createElement('button');
      copyBtn.className = 'stape-json-copy-btn';
      copyBtn.textContent = 'Copy';
      copyBtn.title = 'Copy JSON to clipboard';

      const copyToClipboard = () => {
        navigator.clipboard
          .writeText(originalJson)
          .then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            copyBtn.style.background = '#20c997';
            setTimeout(() => {
              copyBtn.textContent = originalText;
              copyBtn.style.background = 'rgb(40, 167, 69)';
            }, 1500);
          })
          .catch((err) => {
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

    monitor.processNewElements = function () {
      if (monitor.debounceTimer) clearTimeout(monitor.debounceTimer);
      monitor.debounceTimer = setTimeout(() => {
        monitor.findAndFormatJsonCells();
      }, 300);
    };

    monitor.startObserver = function () {
      if (monitor.observer) return;

      monitor.observer = new MutationObserver((mutations) => {
        let shouldProcess = false;

        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (
                node.classList?.contains('gtm-debug-table-cell--http-body') ||
                node.querySelector?.('.gtm-debug-table-cell--http-body')
              ) {
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

    monitor.enableFormatting = function () {
      monitor.inlineFormattingEnabled = true;
      monitor.findAndFormatJsonCells();
      if (!monitor.observer) {
        monitor.startObserver();
      }
    };

    monitor.disableFormatting = function () {
      monitor.inlineFormattingEnabled = false;

      monitor.processedElements.forEach((elementData, element) => {
        try {
          if (element && element.parentNode && element.classList && element.style) {
            element.innerHTML = elementData.originalContent;
            element.classList.remove('stape-json-formatted');
            element.style.position = '';
          }
        } catch (error) {
          console.warn('STAPE: Error restoring element:', error);
        }
      });
      monitor.processedElements.clear();
    };

    monitor.start = function () {
      monitor.injectStyles();
      monitor.startObserver();
    };

    monitor.stop = function () {
      if (monitor.observer) {
        monitor.observer.disconnect();
        monitor.observer = null;
      }

      if (monitor.debounceTimer) {
        clearTimeout(monitor.debounceTimer);
      }

      monitor.processedElements.forEach((elementData, element) => {
        try {
          if (element && element.parentNode && element.classList && element.style) {
            element.innerHTML = elementData.originalContent;
            element.classList.remove('stape-json-formatted');
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

  const jsonFormatterMonitor = JsonFormatterMonitor();

  window.__stape_extension.jsonFormatterInline = {
    start: function () {
      jsonFormatterMonitor.start();
      jsonFormatterMonitor.enableFormatting();
    },
    stop: function () {
      jsonFormatterMonitor.disableFormatting();
      jsonFormatterMonitor.stop();
    }
  };

  jsonFormatterMonitor.start();

  if (isEnabled) {
    jsonFormatterMonitor.enableFormatting();
  }
}
