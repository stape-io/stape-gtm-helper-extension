document.addEventListener('DOMContentLoaded', function() {
  // Get status element
  const statusElement = document.getElementById('status');
  if (!statusElement) {
    console.error('Status element not found');
    return;
  }

  // Define features and their default states
  const featureDefaults = {
    jsonBeautifier: { default: true, label: 'JSON Beautifier' },
    gtmStyling: { default: true, label: 'GTM Tag Styling' },
    urlFormatter: { default: true, label: 'URL Formatter' },
    tagStatusColoring: { default: true, label: 'Tag Status Coloring' },
    checkConsent: { default: true, label: 'Check Consent'}
  };

  // Verify all checkboxes exist
  const features = Object.keys(featureDefaults);
  const missingElements = features.filter(feature => !document.getElementById(feature));
  
  if (missingElements.length > 0) {
    console.error('Missing checkbox elements:', missingElements);
    showStatus('Error loading settings', 'error');
    return;
  }

  // Load saved settings
  chrome.storage.sync.get(['featureSettings'], function(result) {
    try {
      // Create settings object using defaults for any missing values
      const settings = result.featureSettings || {};
      features.forEach(feature => {
        const checkbox = document.getElementById(feature);
        if (checkbox) {
          checkbox.checked = settings[feature] ?? featureDefaults[feature].default;
          checkbox.addEventListener('change', updateFeatures);
        }
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      showStatus('Error loading settings', 'error');
    }
  });

  function updateFeatures() {
    try {
      // Get current state of all features
      const newSettings = {};
      features.forEach(feature => {
        const checkbox = document.getElementById(feature);
        if (checkbox) {
          newSettings[feature] = checkbox.checked;
        }
      });

      // Save to storage
      chrome.storage.sync.set({ featureSettings: newSettings }, function() {
        if (chrome.runtime.lastError) {
          console.error('Error saving settings:', chrome.runtime.lastError);
          showStatus('Error saving settings', 'error');
          return;
        }

        // Show success message
        showStatus('Settings saved!', 'success');

        // Notify content script
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'updateFeatures',
              features: newSettings
            });
          }
        });
      });
    } catch (error) {
      console.error('Error updating features:', error);
      showStatus('Error saving settings', 'error');
    }
  }

  function showStatus(message, type) {
    if (!statusElement) return;
    
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    statusElement.style.display = 'block';
    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 2000);
  }
});