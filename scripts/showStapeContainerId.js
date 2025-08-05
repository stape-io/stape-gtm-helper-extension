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
                //const stapeSubscriptionId = e?.request?.headers["x-gtm-subscription-plan"];
                if(stapeId && document.querySelector('.gtm-debug-header.gtm-debug-header__version') && !document.querySelector('.gtm-debug-header.gtm-debug-header__stape_dbg')){
                  document.querySelector('.gtm-debug-header.gtm-debug-header__version').insertAdjacentHTML('beforebegin', `<div class="gtm-debug-header gtm-debug-header__stape_dbg" style="display: flex; align-items: center; gap: 6px; height: auto; min-height: auto; padding: 2px 8px; font-size: 12px; line-height: 1.2; border-bottom: 1px solid #e0e0e0;"> <img width="14px" height="14px" src="https://cdn.stape.io/i/688a4bb90eaac838702555.ico" style="flex-shrink: 0;" /> <span style="color: #374151; font-weight: 500; margin-right: 4px;">Container ID:</span> <span style="background: #ff6d34; color: white; padding: 4px 6px; border-radius: 4px; font-size: 12px; font-weight: 300; letter-spacing: 0.5px; cursor: pointer; display: flex; align-items: center; gap: 4px;" onclick="navigator.clipboard.writeText('${stapeId}').then(() => { this.querySelector('.container-id-text').innerHTML = '✓ Copied!'; setTimeout(() => { this.querySelector('.container-id-text').innerHTML = '${stapeId}'; }, 1500); }).catch(() => { this.querySelector('.container-id-text').innerHTML = 'Copy failed'; setTimeout(() => { this.querySelector('.container-id-text').innerHTML = '${stapeId}'; }, 1500); });" title="Click to copy Container ID"><span class="container-id-text">${stapeId}</span><svg style="width: 10px; height: 10px; color: white; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></span></div>`);
                  
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
            //console.log("ERROR parsing JSON:", this._url, e, "Response:", responseText.substring(0, 100));
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