import { onMessage } from "webext-bridge/background";
import { urlBlockParser } from "../scripts/urlBlockParser.js";
import { tagTypeColoring } from "../scripts/tagTypeColoring.js";
import { tagStatusColoring } from "../scripts/tagStatusColoring.js";
import { consentStatusMonitor } from "../scripts/consentStatusMonitor.js";
import { showStapeContainerId } from "../scripts/showStapeContainerId.js";
import { previewUIFilters } from "../scripts/previewUIFilters.js";
import { jsonFormatter } from "../scripts/jsonFormatter.js";
import { storage } from '@wxt-dev/storage';
import { FEATURE_MAPPING_WITH_SCRIPTS } from '../shared/featureMapping.js';

// Add script functions to the mapping
const FEATURE_MAPPING_WITH_SCRIPTS_WITH_SCRIPTS = {
  'urls-formatter': { ...FEATURE_MAPPING_WITH_SCRIPTS['urls-formatter'], scriptFunction: urlBlockParser },
  'tags-status-coloring': { ...FEATURE_MAPPING_WITH_SCRIPTS['tags-status-coloring'], scriptFunction: tagStatusColoring },
  'tags-type-coloring': { ...FEATURE_MAPPING_WITH_SCRIPTS['tags-type-coloring'], scriptFunction: tagTypeColoring },
  'consent-status-monitor': { ...FEATURE_MAPPING_WITH_SCRIPTS['consent-status-monitor'], scriptFunction: consentStatusMonitor },
  'preview-ui-filtering': { ...FEATURE_MAPPING_WITH_SCRIPTS['preview-ui-filtering'], scriptFunction: previewUIFilters },
  'inline-json-formatting': { ...FEATURE_MAPPING_WITH_SCRIPTS['inline-json-formatting'], scriptFunction: jsonFormatter }
};


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
        {id: 'urls-formatter', environments: ["GTMTASS"], enabled: true, order: 0},
        {id: 'tags-status-coloring', environments: ["GTMTA","GTMTASS"], enabled: true, order: 1},
        {id: 'tags-type-coloring', environments: ["GTMTA","GTMTASS"], enabled: true, order: 2},
        {id: 'consent-status-monitor', environments: ["GTMTASS"], enabled: true, order: 3},
        {id: 'preview-ui-filtering', environments: ["GTMTA","GTMTASS"], enabled: true, order: 4},
        {id: 'inline-json-formatting', environments: ["GTMTA","GTMTASS"], enabled: true, order: 5}                        
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
        // Get current feature states from storage
        let settings;
        try {
          settings = await storage.getMeta('local:settingsDEV');
        } catch (error) {
          settings = null;
        }
        
        const featureStates = {};
        
        
        if (settings?.features && Array.isArray(settings.features)) {
          settings.features.forEach(feature => {
            const mapping = FEATURE_MAPPING_WITH_SCRIPTS[feature.id];
            if (mapping) {
              featureStates[mapping.apiCommand] = feature.enabled;
            }
          });
        } else {
          // Fallback: if no settings found, enable all features by default
          Object.values(FEATURE_MAPPING_WITH_SCRIPTS).forEach(mapping => {
            featureStates[mapping.apiCommand] = true;
          });
        }
        

        // Inject scripts based on feature configuration
        if (settings?.features && Array.isArray(settings.features)) {
          for (const feature of settings.features) {
            const mapping = FEATURE_MAPPING_WITH_SCRIPTS[feature.id];
            if (mapping && feature.environments.includes(isGTMEnv.environment)) {
              await injectScript(details.tabId, mapping.scriptFunction, featureStates[mapping.apiCommand]);
            }
          }
        }

        // Always inject showStapeContainerId for GTMTASS (not configurable)
        if (isGTMEnv?.environment === "GTMTASS") {
          await injectScript(details.tabId, showStapeContainerId, true);
        }                
      }
    }
  });

  // Inject script with feature state
  async function injectScript(tabId: number, scriptFunc: Function, isEnabled: boolean) {
    try {
      try {
        await browser.scripting.executeScript({
          target: { tabId },
          func: scriptFunc,
          args: [isEnabled],
          injectImmediately: true,
          world: 'MAIN'
        });
      } catch (error) {
        // Fallback for Firefox
        await browser.scripting.executeScript({
          target: { tabId },
          func: scriptFunc,
          args: [isEnabled]
        });
      }
    } catch (error) {
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
        
        try {
          await browser.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (command, action) => {
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