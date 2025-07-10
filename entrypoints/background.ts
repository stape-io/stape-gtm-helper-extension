import { onMessage, sendMessage } from "webext-bridge/background";



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

  browser.webNavigation.onDOMContentLoaded.addListener(async(details) => {
    if (details.parentFrameId === -1 && details.frameType === "outermost_frame" && details.frameId === 0) {
      if (details.frameId === 0) {
        const isGTMEnv = tabStatus.get(details.tabId);
        if(isGTMEnv){
          await browser.scripting.executeScript({
            target: { tabId: details.tabId },
            injectImmediately: true,
            world: 'MAIN',
            func: ()=>{
              console.log("LOADING STAPE HELPER")
            }
          });
        }
        
      }
    }
  });

  browser.webRequest.onHeadersReceived.addListener(
    (details: any) => {
      if (details.frameId !== 0 || details.type !== "main_frame") return;
      console.log(`REQ`, details);
      const environment = detectGTMEnvironment(details.url);
      if (environment) {
        console.log(`GTM environment detected: ${environment} on tab ${details.tabId}`);
        tabStatus.set(details.tabId, { environment, url: details.url });
      } else {
        tabStatus.delete(details.tabId);
      }

      if (details.responseHeaders) {

        const setCookieHeaders = details.responseHeaders
          .filter((header: any) => header.name.toLowerCase() === 'set-cookie')
          .map((header: any) => header.value);

        // I don't like the first approach of injecting code in all navigated pages.
        // Check for GTM debug cookie headers instead
        // Note. Firefox and Safari won't expose set-cookie headers, 
        // a Failback for checking a global variable will be needed here.
        const hasGTMCookies = setCookieHeaders.some((cookie: string) =>
          cookie.includes('gtm_auth=') ||
          cookie.includes('gtm_debug=') ||
          cookie.includes('gtm_preview=')
        );

        if (hasGTMCookies) {
          tabStatus.set(details.tabId, { environment: 'GTMTASS', url: details.url });
        }

      }
    },
    { urls: ['<all_urls>'] },
    listenerOptions
  );

  onMessage("GET_CURRENT_TAB_STATUS", () => {
    return browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0]) {
        const status = tabStatus.get(tabs[0].id);
        console.log("CURRENT TAB STATUS FROM BG", status);
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

  onMessage("INJECT_SCRIPT_TO_CURRENT_TAB", async ({ data }: { data: any }) => {
    const tab = await getCurrentTab();
    if (!tab?.id) return { success: false, error: "No active tab found" };

    try {
      const result = await sendMessage("INJECT_SCRIPT", data, `content-script@${tab.id}`);
      return result;
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  onMessage("INJECT_STYLE_TO_CURRENT_TAB", async ({ data }: { data: any }) => {
    const tab = await getCurrentTab();
    if (!tab?.id) return { success: false, error: "No active tab found" };

    try {
      const result = await sendMessage("INJECT_STYLE", data, `content-script@${tab.id}`);
      return result;
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  onMessage("INJECT_EXTERNAL_SCRIPT_TO_CURRENT_TAB", async ({ data }: { data: any }) => {
    const tab = await getCurrentTab();
    if (!tab?.id) return { success: false, error: "No active tab found" };

    try {
      const result = await sendMessage("INJECT_EXTERNAL_SCRIPT", data, `content-script@${tab.id}`);
      return result;
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  onMessage("INJECT_EXTERNAL_STYLE_TO_CURRENT_TAB", async ({ data }: { data: any }) => {
    const tab = await getCurrentTab();
    if (!tab?.id) return { success: false, error: "No active tab found" };

    try {
      const result = await sendMessage("INJECT_EXTERNAL_STYLE", data, `content-script@${tab.id}`);
      return result;
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  onMessage("REMOVE_INJECTED_FROM_CURRENT_TAB", async ({ data }: { data: any }) => {
    const tab = await getCurrentTab();
    if (!tab?.id) return { success: false, error: "No active tab found" };

    try {
      const result = await sendMessage("REMOVE_INJECTED", data, `content-script@${tab.id}`);
      return result;
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
});