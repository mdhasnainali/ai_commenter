function saveOptions() {
  const backendUrl = document.getElementById('backendUrl').value;
  const apiKey = document.getElementById('apiKey').value;
  
  chrome.storage.local.set({
    backendUrl: backendUrl,
    apiKey: apiKey
  }, function() {
    const status = document.getElementById('status');
    status.textContent = 'Settings saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
  });
}

function restoreOptions() {
  chrome.storage.local.get({
    backendUrl: 'http://localhost:34567/generate',
    apiKey: 'your-very-long-random-secret-key-change-this'
  }, function(items) {
    document.getElementById('backendUrl').value = items.backendUrl;
    document.getElementById('apiKey').value = items.apiKey;
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
