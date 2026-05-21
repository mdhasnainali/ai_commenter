chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchComment") {
    const { url, options } = request;
    
    fetch(url, options)
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Server error: ${res.status} ${text}`);
        }
        return res.json();
      })
      .then((data) => {
        sendResponse({ success: true, data });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
      
    return true; // Keep message channel open for async response
  }
});
