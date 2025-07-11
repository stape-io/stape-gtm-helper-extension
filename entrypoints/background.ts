import { onMessage } from "webext-bridge/background";
import { urlBlockParser } from "../scripts/urlBlockParser.js";

// GTM environment detection rules
const GTM_RULES = {
  GTMUI: /^https:\/\/tagmanager\.google\.com/,
  GTMTA: /^https:\/\/tagassistant\.google\.com/,
  // GTMTASS requires window variable check, not just URL
};

export default defineBackground(() => {

  // Store current page status per tab
  const tabStatus = new Map();

  // Check if URL matches GTM rules (basic check)
  function detectGTMEnvironment(url: string) {
    if (GTM_RULES.GTMUI.test(url)) return 'GTMUI';
    if (GTM_RULES.GTMTA.test(url)) return 'GTMTA';
    return null;
  }

  // Listen for response headers to detect server-side GTM
  const isChrome = typeof chrome !== "undefined" && (
    typeof browser === "undefined" ||
    !browser.runtime || // polyfill usually defines browser.runtime
    !browser.runtime.getBrowserInfo // Chrome polyfill might lack this method
  );

  const listenerOptions = ['responseHeaders'];
  if (isChrome) {
    listenerOptions.push('extraHeaders'); // Only add in Chrome
  }

  // Inject monitor when DOM is loaded for known GTM environments
  browser.webNavigation.onDOMContentLoaded.addListener(async(details) => {
    if (details.parentFrameId === -1 && details.frameType === "outermost_frame" && details.frameId === 0) {
      const isGTMEnv = tabStatus.get(details.tabId);
      if(isGTMEnv){
        if(isGTMEnv?.environment === "GTMTASS"){
          await injectMonitorToTab(details.tabId, isGTMEnv.environment);
        }
      }
    }
  });

  // Inject monitor function
  async function injectMonitorToTab(tabId: number, environment: string) {
    try {
      console.log(`Injecting HTTP monitor for ${environment} on tab ${tabId}`);
      await browser.scripting.executeScript({
        target: { tabId },
        injectImmediately: true,
        world: 'MAIN',
        func: urlBlockParser
      });
    } catch (error) {
      console.error(`Failed to inject monitor on tab ${tabId}:`, error);
    }
  }

  browser.webRequest.onHeadersReceived.addListener(
    async (details: any) => {
      if (details.frameId !== 0 || details.type !== "main_frame") return;
      
      const environment = detectGTMEnvironment(details.url);
      if (environment) {
        console.log(`GTM environment detected: ${environment} on tab ${details.tabId}`);
        tabStatus.set(details.tabId, { environment, url: details.url });
        // Inject immediately when we detect GTM environment
      } else {
        // Check for GTM debug cookies even if URL doesn't match
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
            console.log(`GTM debug cookies detected (GTMTASS) on tab ${details.tabId}`);
            tabStatus.set(details.tabId, { environment: 'GTMTASS', url: details.url });
            // Inject immediately when we detect GTM cookies
          } else {
            // No GTM detected, remove from tracking
            tabStatus.delete(details.tabId);
          }
        } else {
          // No response headers, remove from tracking
          tabStatus.delete(details.tabId);
        }
      }
    },
    { urls: ['<all_urls>'] },
    listenerOptions
  );


  // Clean up when tabs are closed
  browser.tabs.onRemoved.addListener((tabId) => {
    if (tabStatus.has(tabId)) {
      console.log(`Tab ${tabId} closed, removing from tracking`);
      tabStatus.delete(tabId);
    }
  });

  onMessage("GET_CURRENT_TAB_STATUS", () => {
    return browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0]) {
        const status = tabStatus.get(tabs[0].id);
        return status; // Send status back
      }
      return null; // No active tab
    });
  });

  // Helper functions for injecting JS and CSS
  async function getCurrentTab() {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }

});