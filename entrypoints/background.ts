import { onMessage } from "webext-bridge/background";
import { urlBlockParser } from "../scripts/urlBlockParser.js";
import { tagTypeColoring } from "../scripts/tagTypeColoring.js";
import { tagStatusColoring } from "../scripts/tagStatusColoring.js";
import { consentStatusMonitor } from "../scripts/consentStatusMonitor.js";
import { showStapeContainerId } from "../scripts/showStapeContainerId.js";
import { previewUIFilters } from "../scripts/previewUIFilters.js";
import { storage } from '@wxt-dev/storage';


// GTM environment detection rules
const GTM_RULES = {
  GTMUI: /^https:\/\/tagmanager\.google\.com/,
  GTMTA: /^https:\/\/tagassistant\.google\.com/,
  // GTMTASS requires window variable check, not just URL
};

export default defineBackground(() => {
  (async () => {
    const settings = await storage.getMeta('local:settingsDEV')
    if(!settings.features){
      settings.features = [
        {id: 'urls-formatter', name: 'URLs Formatter Mode', description: 'Pretty Prints Requests URLs', environments: ["GTMTASS"], enabled: true, order: 0, apiCommand: 'urlBlocksParser'},
        {id: 'tags-status-coloring', name: 'Tags Status Coloring', description: 'Highlight Tags By State', environments: ["GTMTA","GTMTASS"], enabled: true, order: 1, apiCommand: 'tagStatusColoring'},
        {id: 'tags-type-coloring', name: 'Tags Type Coloring', description: 'Highlight Tags By Type', environments: ["GTMTA","GTMTASS"], enabled: true, order: 2 , apiCommand: 'tagTypeColoring'},
        {id: 'consent-status-monitor', name: 'Consent Mode Server Side', description: 'Highlights the current consent mode on SS Requests', environments: ["GTMTASS"], enabled: true, order: 3 , apiCommand: 'consentStatusMonitor'},
        {id: 'preview-ui-filtering', name: 'Entities Filters', description: 'Find and filter tags and variables', environments: ["GTMTA","GTMTASS"], enabled: true, order: 4 , apiCommand: 'previewUIFilters'}                        
      ];      
      await storage.setMeta('local:settingsDEV', settings)
    }    
  })();
   

  const tabStatus = new Map();
  const injectedTabs = new Set();

  function detectGTMEnvironment(url: string) {
    if (GTM_RULES.GTMUI.test(url)) return 'GTMUI';
    if (GTM_RULES.GTMTA.test(url)) return 'GTMTA';
    return null;
  }

  const isChrome = typeof chrome !== "undefined" && (
    typeof browser === "undefined" ||
    !browser.runtime || // polyfill usually defines browser.runtime
    !browser.runtime.getBrowserInfo // Chrome polyfill might lack this method
  );

  const listenerOptions = ['responseHeaders'];
  if (isChrome) {
    listenerOptions.push('extraHeaders'); // Only add in Chrome
  }

  browser.webNavigation.onDOMContentLoaded.addListener(async (details) => {
   
    // This is where the decide to inject the code     
    if (details.parentFrameId === -1 && details.frameId === 0) {
      const isGTMEnv = tabStatus.get(details.tabId);

      if (isGTMEnv) {
        // TO-DO Inject only when Enabled. Quitar el autoload y hace el init de manera manual
        if (isGTMEnv?.environment === "GTMTASS") {
          await injectScriptToTab(details.tabId, urlBlockParser);
          await injectScriptToTab(details.tabId, tagTypeColoring);
          await injectScriptToTab(details.tabId, tagStatusColoring);
          await injectScriptToTab(details.tabId, consentStatusMonitor);
          await injectScriptToTab(details.tabId, showStapeContainerId);
          await injectScriptToTab(details.tabId, previewUIFilters);
        }
        if (isGTMEnv?.environment === "GTMTA") {
          await injectScriptToTab(details.tabId, tagTypeColoring);
          await injectScriptToTab(details.tabId, tagStatusColoring);
          await injectScriptToTab(details.tabId, consentStatusMonitor);
          await injectScriptToTab(details.tabId, previewUIFilters);

        }                
      }
    }
  });

  // Inject monitor function
  async function injectScriptToTab(tabId: number, scriptFunc: Function) {
    try {
      try {
        await browser.scripting.executeScript({
          target: { tabId },
          func: scriptFunc,
          injectImmediately: true,
          world: 'MAIN'
        });
      } catch (error) {
        // Fallback for Firefox
        console.log('Falling back to basic injection for urlBlockParser');
        await browser.scripting.executeScript({
          target: { tabId },
          func: scriptFunc
        });
      }


    } catch (error) {
      console.log(`STAPE:ERROR Failed to inject monitor on tab ${tabId}:`, error);
    }
  }

  browser.webRequest.onHeadersReceived.addListener(
    async (details: any) => {
      if (details.frameId !== 0 || details.type !== "main_frame") return;

      const environment = detectGTMEnvironment(details.url);
      if (environment) {
        tabStatus.set(details.tabId, { environment, url: details.url });
      } else {
        if (details.responseHeaders) {
          const setCookieHeaders = details.responseHeaders
            .filter((header: any) => header.name.toLowerCase() === 'set-cookie')
            .map((header: any) => header.value);

          const hasGTMCookies = setCookieHeaders.some((cookie: string) =>
            cookie.includes('gtm_auth=') ||
            cookie.includes('gtm_debug=') ||
            cookie.includes('gtm_preview=')
          );

          if (hasGTMCookies) {
            tabStatus.set(details.tabId, { environment: 'GTMTASS', url: details.url });
          } else {
            tabStatus.delete(details.tabId);
          }
        } else {
          tabStatus.delete(details.tabId);
        }
      }
    },
    { urls: ['<all_urls>'] },
    listenerOptions
  );

  browser.tabs.onRemoved.addListener((tabId) => {
    if (tabStatus.has(tabId)) {
      console.log(`Tab ${tabId} closed, removing from tracking`);
      tabStatus.delete(tabId);
      injectedTabs.delete(tabId);
    }
  });

  // This is used to pass the current tabs status to the popup
  onMessage("GET_CURRENT_TAB_STATUS", () => {
    return browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0]) {
        const status = tabStatus.get(tabs[0].id);
        return status; // Send status back
      }
      return null; // No active tab
    });
  });

  onMessage("EXECUTE_SCRIPT", (details) => {
  
    return browser.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
      
      if (tabs[0]) {
        const { command, action } = details.data;
        console.log("TOGGLE FEATURE", details.data);        
        try {
          await browser.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (command, action) => {
              console.log("DAVID", command, action)
              if (window.__stape_extension && window.__stape_extension[command]) {
                window.__stape_extension[command][action]();
              }
            },
            args: [command, action],
            world: 'MAIN'
          });
          return { success: true };
        } catch (error) {
          console.error('Failed to execute script command:', error);
          return { success: false, error: error.message };
        }
      }
      return { success: false, error: 'No active tab' };
    });
  });  

});