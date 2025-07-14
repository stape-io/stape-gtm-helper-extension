import { onMessage } from "webext-bridge/background";
import { urlBlockParser } from "../scripts/urlBlockParser.js";

// GTM environment detection rules
const GTM_RULES = {
  GTMUI: /^https:\/\/tagmanager\.google\.com/,
  GTMTA: /^https:\/\/tagassistant\.google\.com/,
  // GTMTASS requires window variable check, not just URL
};

export default defineBackground(() => {

  const tabStatus = new Map();

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
    
    if (details.parentFrameId === -1 && details.frameId === 0) {
      console.log("NAVIGATING INJECT IN", details)
      const isGTMEnv = tabStatus.get(details.tabId);
      if (isGTMEnv) {
        if (isGTMEnv?.environment === "GTMTASS") {
          await injectMonitorToTab(details.tabId, isGTMEnv.environment);
        }
      }
    }
  });

  // Inject monitor function
  async function injectMonitorToTab(tabId: number, environment: string) {
    try {
      console.log(`Injecting HTTP monitor for ${environment} on tab ${tabId}`);

      const scriptOptions: browser.scripting.ScriptInjection = {
        target: { tabId },
        func: urlBlockParser
      };

      try {
        await browser.scripting.executeScript({
          ...scriptOptions,
          injectImmediately: true,
          world: 'MAIN'
        });
      } catch (error) {
        // Fallback for Firefox
        console.log('Falling back to basic injection');
        await browser.scripting.executeScript(scriptOptions);
      }
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
            console.log(`GTM debug cookies detected (GTMTASS) on tab ${details.tabId}`);
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

});