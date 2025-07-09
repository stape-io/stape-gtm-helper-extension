import { onMessage } from "webext-bridge/background";


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

  browser.webRequest.onHeadersReceived.addListener(
    (details: any) => {
      if (details.frameId !== 0 || details.type !== "main_frame") return;
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
});