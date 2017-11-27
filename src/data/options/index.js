'use strict';

var config = {
  badge: true,
  faqs: true,
  history: true,
  json: [],
  'dd': 0,
  'hh': 0,
  'mm': 5,
  'ss': 0
};

var restore = () => chrome.storage.local.get(config, prefs => {
  document.getElementById('badge').checked = prefs.badge;
  document.getElementById('faqs').checked = prefs.faqs;
  document.getElementById('history').checked = prefs.history;
  document.getElementById('json').value = JSON.stringify(prefs.json, null, '  ');
  document.getElementById('dd').value = prefs.dd;
  document.getElementById('hh').value = prefs.hh;
  document.getElementById('mm').value = prefs.mm;
  document.getElementById('ss').value = prefs.ss;
});
restore();

document.getElementById('save').addEventListener('click', () => {
  const info = document.getElementById('info');
  const badge = document.getElementById('badge').checked;

  try {
    chrome.storage.local.set({
      badge,
      faqs: document.getElementById('faqs').checked,
      history: document.getElementById('history').checked,
      json: JSON.parse(document.getElementById('json').value.trim() || '[]'),
      dd: Math.max(Number(document.getElementById('dd').value), 0),
      hh: Math.min(Math.max(Number(document.getElementById('hh').value), 0), 23),
      mm: Math.min(Math.max(Number(document.getElementById('mm').value), 0), 59),
      ss: Math.min(Math.max(Number(document.getElementById('ss').value), 0), 59)
    }, () => {
      info.textContent = 'Options saved';
      restore();

      if (badge) {
        chrome.runtime.sendMessage({
          method: 'count'
        });
      }
      else {
        chrome.browserAction.setBadgeText({
          text: ''
        });
      }
    });
  }
  catch (e) {
    info.textContent = e.message;
  }
  window.setTimeout(() => info.textContent = '', 3000);
});
document.getElementById('reset').addEventListener('click', () => chrome.storage.local.set(config, restore));
