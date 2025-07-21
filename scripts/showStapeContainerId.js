export function showStapeContainerId() {
  console.log("STAPE GTM HELPER: Stape Container Reporter");
  // The info is only availanle once the it's shown on the ui, meaning users need to click on the request and the expand the details
  // Let's grab from the endpoint responses, not ideal, buuuuut ... 
  function cleanJSONResponse(text) {
    if (text.startsWith(")]}'")) {
      return text.slice(4);
    }
    return text;
  }
  
  function getIdFromUrl(url) {
    const match = url.match(/[?&]id=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }
  
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
    this._url = url;
    this._id = getIdFromUrl(url);
    return originalOpen.apply(this, arguments);
  };
  
  XMLHttpRequest.prototype.send = function(body) {
    // Define the handler function separately so we can remove it
    const loadHandler = function() {
      if (this._url && this._url.includes('get_memo?id=') && this._id) {
        let responseText = cleanJSONResponse(this.responseText);
        
        // Check if response is empty or invalid
        if (!responseText || responseText.trim() === '') {
          this.removeEventListener('load', loadHandler);
          return;
        }
        
        try {
          const jsonResponse = JSON.parse(responseText);
      
          if (jsonResponse.hasOwnProperty(this._id)) {
            jsonResponse[this._id].forEach(e => {
              if (e.messageType === "REQUEST_SUMMARY") {
                const stapeId = e?.request?.headers["x-gtm-identifier"];
                const stapeSubscriptionId = e?.request?.headers["x-gtm-subscription-plan"];
                if(stapeId && document.querySelector('.gtm-debug-header.gtm-debug-header__version') && !document.querySelector('.gtm-debug-header.gtm-debug-header__stape_dbg')){
                  document.querySelector('.gtm-debug-header.gtm-debug-header__version').insertAdjacentHTML('beforebegin', `<div class="gtm-debug-header gtm-debug-header__stape_dbg"> <img width="16px" height="16px" src="https://stape.io/favicon.ico" /> Container ID: ${stapeId} (${stapeSubscriptionId})</div>`);
                  
                  // Restore original XMLHttpRequest methods since we're done
                  XMLHttpRequest.prototype.open = originalOpen;
                  XMLHttpRequest.prototype.send = originalSend;
                }                
              }
            });
          } 
        } catch (e) {
          // Only log errors for non-empty responses to avoid noise
          if (responseText && responseText.trim() !== '') {
            console.log("ERROR parsing JSON:", this._url, e, "Response:", responseText.substring(0, 100));
          }
        }
      }
      
      // Remove the event listener after execution
      this.removeEventListener('load', loadHandler);
    };
    
    this.addEventListener('load', loadHandler);
    return originalSend.apply(this, arguments);
  };  

}