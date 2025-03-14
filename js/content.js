let FEATURE_STATE = {
  jsonBeautifier: true, // Beautifies JSON elements
  gtmStyling: true, // Styles GTM tags by pattern. E.g. GA4 orange
  gtmTagFailed: true, // Styles failed tags
  urlFormatter: true, // Formats URL parameters
  tagStatusColoring: true, // Colors tag status based on success/failure
  checkConsent: true, // Checks consent status from request URL
};

var count = 0;

// Load initial state
chrome.storage.sync.get(["featureSettings"], (result) => {
  if (result.featureSettings) {
    FEATURE_STATE = result.featureSettings;
  }
});

// Add message listener for feature updates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "updateFeatures") {
    FEATURE_STATE = message.features;
  }
});

// Add custom URL syntax highlighting to Prism
if (typeof Prism !== "undefined") {
  Prism.languages.url = {
    protocol: {
      pattern: /^[a-z]+:\/\//i,
      inside: {
        punctuation: /[:\/]/,
      },
    },
    domain: {
      pattern: /[\w.-]+[a-z]{2,}(?=\/|$)/,
      inside: {
        punctuation: /[.]/,
      },
    },
    path: {
      pattern: /\/[^\?#]*/,
      inside: {
        punctuation: /[\/]/,
      },
    },
    "parameter-name": {
      pattern: /(?:^|&)\s*[^=&\n]+?(?=\s*=)/m,
      lookbehind: true,
      alias: "property",
    },
    "parameter-value": {
      pattern: /=\s*[^=&\n]+/m,
      inside: {
        punctuation: /^=/,
      },
      alias: "string",
    },
    punctuation: /[?&#]/,
  };
}

// Detects if client or server GTM
function detectGTMType() {

  const currentURL = window.location.href;

  // Define the patterns
  const clientGTMPattern = /tagassistant\.google\.com/;
  const serverGTMPattern = /\/gtm\/debug\?id/;

  if (clientGTMPattern.test(currentURL)) {
    console.log("GTM: Client");
    return { type: "client" };
  } else if (serverGTMPattern.test(currentURL)) {
    console.log("GTM: Server");
    return { type: "server" };
  } else {
    console.log(">> Could not recognize client or server GTM debugger <<");
  }
}

class ContentManager {
  constructor() {
    this.gtmType = detectGTMType();
    this.processedElements = new WeakSet();
    this.setupObserver();
    this.setupClickHandlers();
    this.processExistingElements();
  }

  setupObserver() {
    try {
      const observer = new MutationObserver((mutations) => {
        this.processExistingElements();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    } catch (error) {
      console.error("Error setting up observer:", error);
    }
  }

  setupClickHandlers() {
    try {
      // Add click handler for message row and tags tab
      document.addEventListener("click", (event) => {
        const clearGtm = event.target.closest(
          'i[data-ng-if="ctrl.showClearMessagesIcon"]' // The clear icon
        );
        const summary = event.target.closest(
          'div[data-ng-click="ctrl.selectSummary()"]' // The clear icon
        );
        // Load order 'menu'
        const requestRow = event.target.closest(
          "div.message-list__row.message-list__row--group" // The request row (load order of events)
        );
        const messageRow = event.target.closest(
          ".message-list__row.message-list__row--indented" // The message row (load order of events)
        );
        // Tabs
        const tagsTab = event.target.closest(
          'div[data-ng-click="ctrl.selectTab(Tab.TAGS)"]' // The tag tab
        );
        const consoleTab = event.target.closest(
          'div[data-ng-click="ctrl.selectTab(Tab.CONSOLE)"]' // The clear icon
        );

        // if(consoleTab){
        //   console.log("Console tab clicked");
        // }

        if (summary || messageRow || tagsTab || requestRow) {
          // Small delay to allow for any dynamic content to load
          this.processTagStatuses(summary || messageRow || tagsTab || requestRow);
          if (this.gtmType.type === "server") { // Check consent status if server GTM
            this.checkConsent(messageRow || requestRow);
          }
        }

        if (clearGtm) {
          const consentMessageHeader = document.querySelector(".gtm-consent-header");
          const existingMessage = document.querySelectorAll(".consent-status");
          const failedTags = document.querySelectorAll(".failed-tag");
          if (consentMessageHeader) {
            consentMessageHeader.remove();
          }
          if (existingMessage) {
            existingMessage.forEach((el) => el.remove());
          }
          if (failedTags) {
            failedTags.forEach((el) => el.classList.remove("failed-tag"));
          }
        }
      });
    } catch (error) {
      console.error("Error setting up click handlers:", error);
    }
  }

  checkConsent(element) {
    if (!FEATURE_STATE.checkConsent) return;

    // Check consent status and add elements
    try {
      if (element) {
        // Check if element exist
        const blgTitle = document.querySelector(".blg-card-tabs");
        if (!blgTitle) {
          throw new Error("blgTitle element not found.");
        }

        const httpRequestValue = element.parentElement
          .querySelector(".message-list__title.wd-debug-message-title")
          .innerText.toLowerCase();

        // Remove existing consent header if it exists
        const consentHeader = document.querySelector("div.gtm-consent-header.gtm-consent-header");
        if (consentHeader) {
          consentHeader.remove();
        }

        // Remove existing consent statuses
        const existingConsentStatuses = document.querySelectorAll(".consent-status");
        if(existingConsentStatuses){
          existingConsentStatuses.forEach((el) => el.remove());
        }

        // Define consent types and their status mapping
        const consentTypes = [
          "analytics_storage",
          "ad_storage",
          "ad_user_data",
          "ad_personalization",
        ];

        const consentMappings = {
          "gcs=g111": ["granted", "granted", "granted", "granted"],
          "gcs=g100": ["denied", "denied", "denied", "denied"],
          "gcs=g101": ["granted", "denied", "denied", "denied"],
          "gcs=g110": ["denied", "granted", "granted", "granted"],
        };

        // Find matching consent pattern
        const matchingPattern = Object.keys(consentMappings).find((pattern) =>
          httpRequestValue.includes(pattern)
        );

        if(httpRequestValue.includes("collect?")){ // For normal Google Analytics requests
          if (matchingPattern) {
            // Create or get consent header
            let headerElement = document.querySelector(".gtm-consent-header");
            if (!headerElement) {
              headerElement = document.createElement("div");
              headerElement.textContent = "Consent Status";
              headerElement.classList.add(
                "gtm-debug-pane-header",
                "gtm-consent-header"
              );
              blgTitle.after(headerElement);
            }
  
            // Create a container div for status elements
            const statusContainer = document.createElement("div");
            statusContainer.classList.add("consent-status-container");
  
            // Create and append status elements
            const statusElements = consentTypes.map((type, index) => {
              const spanElement = document.createElement("span");
              spanElement.textContent = type;
              spanElement.classList.add(
                "consent-status",
                `consent-${consentMappings[matchingPattern][index]}`
              );
              return spanElement;
            });
  
            // Append all span elements to the container
            statusElements.forEach((spanElement) => {
              statusContainer.appendChild(spanElement);
            });
  
            // Append the container after the header
            headerElement.after(statusContainer);
          }
        } //else if (httpRequestValue.includes("data?")){ // For Data client
        // DATA CLIENT CONSENT STATUS CODE
        //   let headerElement = document.querySelector(".gtm-consent-header");
        //   if (!headerElement) {
        //     headerElement = document.createElement("div");
        //     headerElement.textContent = "Consent Status";
        //     headerElement.classList.add(
        //       "gtm-debug-pane-header",
        //       "gtm-consent-header"
        //     );
        //     blgTitle.after(headerElement);
        //   }

        //   // Create a container div for status elements
        //   const statusContainer = document.createElement("div");
        //   statusContainer.classList.add("consent-status-container");

        //   const eventData = document.querySelectorAll('div.event-data > event-data-table > div > table');
        //   eventData.forEach(data => {
        //     let table = data.closest('table'); // Find the closest table
        //     if (table) {
        //         let consentTd = Array.from(table.querySelectorAll('td')).find(td => 
        //             td.textContent.trim().toLowerCase() === 'consent_state'
        //         );
        //         console.log('Consent State Element:', consentTd);
        //         if (consentTd) {
        //             let valueTd = consentTd.nextElementSibling; // Get the next td (value)
        //             console.log(valueTd);
        //             if (valueTd) {
        //               let consentValue = JSON.parse(valueTd.textContent.trim()); // Parse the object
        //               if (consentValue.analytics_storage === true) {
        //                 console.log('✅ Analytics storage is enabled.');
        //             }
        //                 // console.log('Consent State Value:', valueTd.textContent.trim());
        //                 // console.log('Analytics consent: ', valueTd.textContent.trim().toLowerCase().includes('analytics_storage: true'));
        //             }
        //         }
        //     }
        // });
        //}
      }
    } catch (error) {
      console.error("Error processing consent status:", error);
    }
  }

  processTagStatuses() {
    if (!FEATURE_STATE.tagStatusColoring) return;
    try {      
      const statusElements = document.querySelectorAll(".gtm-debug-card__subtitle");
      const failedStatuses = [
        "Failed", "Ha fallat", "Nezdařilo se", "Aktivering mislykket", "Fehlgeschlagen", "Fallida", 
        "Hindi nagawa", "Échec", "Nije uspjelo", "Gagal", "Non riuscito", "Neizdevās", "Nepavyko", 
        "Sikertelen", "Mislukt", "Mislyktes", "Niepowodzenie", "Falha", "Falhou", "Nereușită", 
        "Neúspešné", "Neuspešna", "Epäonnistui", "Misslyckades", "Không thành công", "Başarısız", 
        "Απέτυχε", "Неуспешно", "Ошибка", "Није успела", "Помилка активації", "ट्रिगर नहीं हुआ", 
        "ไม่สำเร็จ", "실패", "失敗しました", "失败", "失敗", "400", "500"
      ];
      statusElements.forEach((element) => {
        const subtitleText = element.textContent.toLowerCase();
        if (failedStatuses.some(status => subtitleText.includes(status.toLowerCase()))) {
          element.classList.add("failed-tag");
        } else {
          element.classList.remove("failed-tag");
        }
      });
    } catch (error) {
      console.error("Error processing tag statuses:", error);
    }
  }

  processExistingElements() {
    // Process JSON elements if feature is enabled
    if (FEATURE_STATE.jsonBeautifier) {
      JSONBeautifier.CONFIG.JSON_SELECTORS.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element) => {
          if (!this.processedElements.has(element)) {
            // URL Beautifier start
            if (selector.includes("http-url-details")) {
              this.styleURLDetailsElement(element);
            } else {
              // JSON Beautifier start
              this.beautifyElement(element);
            }
            this.processedElements.add(element);
          }
        });
      });
    }

    // Process GTM debug cards if feature is enabled
    if (FEATURE_STATE.gtmStyling) {
      // Style tag names
      const gtmElements = document.querySelectorAll(".gtm-debug-card__subtitle");
      gtmElements.forEach((element) => {
        if (!this.processedElements.has(element)) {
          this.styleGTMElement(element);
          //this.processedElements.add(element);
        }
      });
    }
  }

  formatURL(urlString) {
    try {
      let url;
      let basePath;
      let queryString;

      // Check if the string starts with 'http://' or 'https://' 
      if (urlString.match(/^https?:\/\//)) {
        const questionMarkIndex = urlString.indexOf("?");
        if (questionMarkIndex !== -1) {
          basePath = urlString.substring(0, questionMarkIndex);
          queryString = urlString.substring(questionMarkIndex + 1);
        } else {
          basePath = urlString;
          queryString = "";
        }
      } else {
        // Handle path-only URL
        const [pathPart, queryPart] = urlString.split("?");
        basePath = pathPart;
        queryString = queryPart || "";
      }

      // Start with the base path
      let formatted = basePath;

      // Add parameters section if there are any
      if (queryString) {
        formatted += "\n?\n"; // Parameters start on new line

        // Parse the query string manually to preserve embedded URLs
        let paramString = queryString;
        let params = [];
        let currentParam = "";
        let inUrl = false;

        // Iterate through the string character by character
        for (let i = 0; i < paramString.length; i++) {
          const char = paramString[i];

          // Check for URL protocol in parameter value
          if (char === ":" && paramString.substring(i + 1, i + 3) === "//") {
            inUrl = true;
          }

          // Only split on & if we're not inside a URL
          if (char === "&" && !inUrl) {
            if (currentParam) {
              params.push(currentParam);
              currentParam = "";
            }
          } else {
            currentParam += char;
          }

          // Reset URL flag if we hit a space or end of parameter
          if (inUrl && (char === " " || char === "&")) {
            inUrl = false;
          }
        }

        // Add the last parameter
        if (currentParam) {
          params.push(currentParam);
        }

        // Format each parameter
        params.forEach((param) => {
          formatted += `  ${param}\n`;
        });
      }

      return formatted;
    } catch (error) {
      return urlString;
    }
  }

  styleURLDetailsElement(element) {
    try {
      // Only proceed if URL formatting is enabled
      if (!FEATURE_STATE.urlFormatter) {
        return;
      }

      const originalText = element.textContent.trim();

      // Only apply formatting if URL contains parameters
      if (!originalText.includes("?")) {
        return;
      }

      const formattedURL = this.formatURL(originalText);

      // Create formatted elements
      const { preElement, codeElement } = JSONBeautifier.createFormattedElement(
        formattedURL,
        "url"
      );

      // Apply styles
      Object.assign(preElement.style, {
        ...JSONBeautifier.CONFIG.STYLES.PRE,
      });

      // Replace content
      element.innerHTML = "";
      element.appendChild(preElement);

      // Apply syntax highlighting if Prism is available
      if (typeof Prism !== "undefined") {
        Prism.highlightElement(codeElement);
      }
    } catch (error) {
      console.error("Error styling URL details:", error);
    }
  }

  beautifyElement(element) {
    if (!FEATURE_STATE.jsonBeautifier) return;
  
    if(!isString(element.textContent.trim())) {
      return;
    }

    const text = element.textContent.trim();

    if (!element) {
      return;
    }

    if (!text.startsWith("{")) {
      return;
    }
    
    try {
      if (isJsonString(text)) {
        const beautified = JSONBeautifier.beautifyJSON(text);
        const { preElement, codeElement } = JSONBeautifier.createFormattedElement(
          beautified,
          "json"
        );

        element.innerHTML = "";
        element.replaceWith(preElement);

        if (typeof Prism !== "undefined") {
          Prism.highlightElement(codeElement);
        }
      }
    } catch (error) {
      console.error("Error processing JSON:", error);
    }
  }

  styleGTMElement(element) {
    try {
      if (!FEATURE_STATE.gtmStyling) return;
  
      if (!element || !element.parentElement) { return; }
  
      const tagText = element.innerText;
      let color = "#EEEEEE"; // Default color
  
      const colorRules = [
        { pattern: /.*(Google Tag|Google Analytics|Google Analytics 4).*/, color: '#EEA849' },
        { pattern: /.*(Data Tag|Stape).*/, color: '#FF6D34' },
        { pattern: /.*(Google Ads|Microsoft Ads|Floodlight|Conversion Linker).*/, color: '#3CA55C' }, 
        { pattern: /.*(Pinterest).*/, color: '#92140C' },
        { pattern: /.*(Facebook|Meta).*/, color: '#0072FF' },
        { pattern: /.*(TikTok).*/, color: '#333333' },
        { pattern: /.*(BigQuery).*/, color: '#5086EC' },
        { pattern: /.*(LinkedIn).*/, color: '#006699' },
        { pattern: /.*(TikTok).*/, color: '#35BABE' },
        { pattern: /.*(Snapchat|Snap Pixel).*/, color: '#FFD60A' },
        { pattern: /.*(Klaviyo).*/, color: '#1D1E20' },
      ];
  
      // Find matching rule
      const matchedColorRule = colorRules.find(rule => rule.pattern.test(tagText));
      if (matchedColorRule) {
        color = matchedColorRule.color;
      }
  
      // Apply styles to the parent element
      element.parentElement.style.borderLeft = `4px solid ${color}`;
      element.parentElement.style.transition = "border-left-color 0.3s ease";
    } catch (error) {
      console.error("Error applying GTM styles:", error);
    }
  }
}

// Initialize when the document is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    new ContentManager();
  });
} else {
  new ContentManager();
}
