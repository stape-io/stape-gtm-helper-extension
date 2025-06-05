import floatingButton from '/scripts/floatingButton'
import stapeFunctions from '/scripts/stapeFunctions'



export default defineBackground(async () => {
  // Detect GTM/GTM PREVIEW/SSGTM PREVIEW
  /*
  const environments = {
    "GTMUI": "GTM ADMIN UI",
    "GTMTA": "GTM TAG ASSISTANT, PREVIEW MODE",
    "GTMTASS": "GTM TAG ASSISTANT, SERVER SIDE"
  }
  */

  const settings = {

    features: {
      jsonFormatter: {
        description: 'Show beautified JSON of incoming/outgoing requests in server GTM preview',
        enabled: true,
        activableOn: ["GTMTASS"]
      },
      urlFormatter: {
        description: 'Show beautified URL parameters of incoming/outgoing requests in server GTM preview',
        enabled: true,
        activableOn: ["GTMTASS"]
      },
      tagTypesColouring: {
        description: 'Add color indication for different tag types e.g. orange for GA4, blue for Meta etc.',
        enabled: true,
        activableOn: ["GTMUI", "GTMTA", "GTMTASS"]
      },
      tagStatusColouring: {
        description: 'Highlight failed tag statuses in red for web & server GTM preview',
        enabled: true,
        activableOn: ["GTMUI", "GTMTA", "GTMTASS"]
      },
      consentStatusReporting: {
        description: 'Display consent parameters in server GTM preview based on GA4/Data Tag payloads',
        enabled: true,
        activableOn: ["GTMTASS"]
      },
      entitiesFilteringPreview: {
        description: 'Option to filter Tags and variableks on preview mode',
        enabled: true,
        activableOn: ["GTMTA", "GTMTASS"]
      },
      entitiesFiltering: {
        description: 'Option to filter Tags and variableks on UI',
        enabled: true,
        activableOn: ["GTMUI"]
      }
    }
  }

  browser.webNavigation.onDOMContentLoaded.addListener(async (details) => {

    /**
     * Checks if GTM Debug Bootstrap is available in the page
     * @param {number} tabId - The ID of the tab to check
     * @returns {Promise<boolean>} - Whether GTM Debug Bootstrap is available
     */
    const hasGtmDebugBootstrap = async (tabId) => {
      try {
        const results = await browser.scripting.executeScript({
          target: { tabId },
          func: () => Boolean(window._gtmDebugBootstrap),
          world: 'MAIN'
        });
        return results[0]?.result || false;
      } catch (error) {
        return false;
      }
    };

    const isMainFrame = (details) => {
      return details.frameId === 0 && details.frameType === "outermost_frame";
    };

    // Only process main frame navigations
    if (!isMainFrame(details)) {
      return;
    }

    const { tabId, url } = details;
    let currentEnvironment;
    const isTagAssistant = (url) => {
      return url.startsWith('https://tagassistant.google.com/');
    };
    const isGoogleTagManager = (url) => {
      return url.startsWith('https://tagmanager.google.com/');
    };

    if (isGoogleTagManager(url)) currentEnvironment = "GTMUI"
    if (isTagAssistant(url)) currentEnvironment = "GTMTA"
    if (!currentEnvironment) {
      try {
        // Since on SS users may be using their own domains and paths, let's detect if the SSUI is loaded
        if (!currentEnvironment) {
          const hasGtmDebug = await hasGtmDebugBootstrap(tabId);
          if (hasGtmDebug) {
            currentEnvironment = "GTMTASS"
          }
        }
      } catch (error) {
      }
    }

    if (currentEnvironment !== null) {
      if (settings.floatingButton.activableOn.includes(currentEnvironment)) {
        browser.scripting.executeScript({
          target: { tabId },
          func: stapeFunctions,
          world: 'MAIN'
        })        
      }
    }
  });
});
