export function jsonStylingHelper() {
  window.__stape_extension = window.__stape_extension || {};
  window.__stape_extension.jsonStylingHelper = window.__stape_extension.jsonStylingHelper || {};

  window.__stape_extension.jsonStylingHelper = {
    cssForContainer: function () {
      return `
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 6px;
        padding: 20px;
        margin: 0;
        font-family: 'Fira Code', 'Monaco', 'Consolas', 'Courier New', monospace;
        font-size: 13px;
        line-height: 1.5;
        color: #495057;
        overflow-x: auto;
        white-space: pre-wrap;
        word-break: break-word;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        position: relative;
      `;
    },

    cssForJsonParts: function (prefix) {
      return `
      .${prefix}-json-key      { color: #e91e63 !important; }
      .${prefix}-json-string   { color: #4caf50 !important; }
      .${prefix}-json-number   { color: #ff9800 !important; font-weight: 500 !important; }
      .${prefix}-json-boolean  { color: #2196f3 !important; }
      .${prefix}-json-null     { color: #9c27b0 !important; }
      .${prefix}-json-brace    { color: #607d8b !important; font-weight: bold !important; }
      .${prefix}-json-bracket  { color: #607d8b !important; font-weight: bold !important; }
      .${prefix}-json-comma    { color: #9e9e9e !important; }
    `;
    },

    syntaxHighlight: function (json, prefix) {
      try {
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(
          /("(?:[^"\\]|\\.)*")\s*:|("(?:[^"\\]|\\.)*")|(\b-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|(\b(?:true|false)\b)|(\bnull\b)|([{}])|(\[|\])|,/g,
          function (match, key, string, number, boolean, nullValue, brace, bracket, comma) {
            if (key) return `<span class="${prefix}-json-key">${key}</span>:`;
            if (string) return `<span class="${prefix}-json-string">${string}</span>`;
            if (number) return `<span class="${prefix}-json-number">${number}</span>`;
            if (boolean) return `<span class="${prefix}-json-boolean">${boolean}</span>`;
            if (nullValue) return `<span class="${prefix}-json-null">${nullValue}</span>`;
            if (brace) return `<span class="${prefix}-json-brace">${brace}</span>`;
            if (bracket) return `<span class="${prefix}-json-bracket">${bracket}</span>`;
            if (comma) return `<span class="${prefix}-json-comma">,</span>`;
            return match;
          }
        );
      } catch (e) {
        return json;
      }
    }
  };
}
