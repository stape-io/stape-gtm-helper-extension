import { onMessage } from "webext-bridge/background";
import { urlBlockParser } from "../scripts/urlBlockParser.js";
import { tagTypeColoring } from "../scripts/tagTypeColoring.js";
import { tagStatusColoring } from "../scripts/tagStatusColoring.js";
import { showStapeContainerId } from "../scripts/showStapeContainerId.js";
// GTM environment detection rules
const GTM_RULES = {
  GTMUI: /^https:\/\/tagmanager\.google\.com/,
  GTMTA: /^https:\/\/tagassistant\.google\.com/,
  // GTMTASS requires window variable check, not just URL
};

export default defineBackground(() => {

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
          await injectScriptToTab(details.tabId, showStapeContainerId);
        }
        if (isGTMEnv?.environment === "GTMTA") {
          await injectScriptToTab(details.tabId, tagTypeColoring);
          console.log("INEDCT tagStatusColoring");
          await injectScriptToTab(details.tabId, tagStatusColoring);
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

});