'use strict';

var restore = () => chrome.storage.local.get({
  badge: true,
  faqs: true,
  json: []
}, prefs => {
  document.getElementById('badge').checked = prefs.badge;
  document.getElementById('faqs').checked = prefs.faqs;
  document.getElementById('json').value = JSON.stringify(prefs.json, null, '  ');
});
restore();

document.getElementById('save').addEventListener('click', () => {
  const info = document.getElementById('info');
  try {
    chrome.storage.local.set({
      badge: document.getElementById('badge').checked,
      faqs: document.getElementById('faqs').checked,
      json: JSON.parse(document.getElementById('json').value.trim())
    }, () => {
      info.textContent = 'Options saved';
      restore();
    });
  }
  catch (e) {
    info.textContent = e.message;
  }
  window.setTimeout(() => info.textContent = '', 3000);
});
document.getElementById('reset').addEventListener('click', () => {
  chrome.storage.local.set({
    badge: true,
    faqs: true,
    json: []
  }, restore);
});
