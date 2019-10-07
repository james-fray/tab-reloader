'use strict';

const config = {
  'badge': true,
  'color': '#5e5e5e',
  'faqs': true,
  'history': true,
  'json': [],
  'dd': 0,
  'hh': 0,
  'mm': 5,
  'ss': 0,
  'dynamic.json': false,
  'policy': {},
  'log': false
};

document.getElementById('time').textContent = (new Date()).toLocaleString();

const restore = () => chrome.storage.local.get(config, prefs => {
  document.getElementById('badge').checked = prefs.badge;
  document.getElementById('color').value = prefs.color;
  document.getElementById('faqs').checked = prefs.faqs;
  document.getElementById('history').checked = prefs.history;
  document.getElementById('json').value = JSON.stringify(prefs.json, null, '  ');
  document.getElementById('dd').value = prefs.dd;
  document.getElementById('hh').value = prefs.hh;
  document.getElementById('mm').value = prefs.mm;
  document.getElementById('ss').value = prefs.ss;
  document.getElementById('dynamic.json').checked = prefs['dynamic.json'];
  document.getElementById('policy').value = JSON.stringify(prefs.policy, null, '  ');
});
restore();

document.getElementById('save').addEventListener('click', () => {
  const info = document.getElementById('info');
  const badge = document.getElementById('badge').checked;

  try {
    chrome.storage.local.set({
      badge,
      'color': document.getElementById('color').value,
      'faqs': document.getElementById('faqs').checked,
      'history': document.getElementById('history').checked,
      'json': JSON.parse(document.getElementById('json').value.trim() || '[]'),
      'dd': Math.max(Number(document.getElementById('dd').value), 0),
      'hh': Math.min(Math.max(Number(document.getElementById('hh').value), 0), 23),
      'mm': Math.min(Math.max(Number(document.getElementById('mm').value), 0), 59),
      'ss': Math.min(Math.max(Number(document.getElementById('ss').value), 0), 59),
      'dynamic.json': document.getElementById('dynamic.json').checked,
      'policy': JSON.parse(document.getElementById('policy').value.trim() || '{}')
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
// reset
document.getElementById('reset').addEventListener('click', () => chrome.storage.local.set(config, restore));
// support
document.getElementById('support').addEventListener('click', () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '?rd=donate'
}));
// open FAQs page
document.getElementById('ofq').addEventListener('click', () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url
}));
// example
document.getElementById('example').addEventListener('click', () => {
  document.getElementById('json').value = JSON.stringify([{
    'hostname': '*.google.com',
    'dd': 0,
    'hh': 0,
    'mm': 1,
    'ss': 0
  }, {
    'hostname':
    'www.bing.com',
    'dd': 0,
    'hh': 0,
    'mm': 1,
    'ss': 30
  }], null, 2);
});
// export
document.getElementById('export').addEventListener('click', () => {
  chrome.storage.local.get(null, prefs => {
    const text = JSON.stringify(prefs, null, 2);
    const blob = new Blob([text], {type: 'application/json'});
    const objectURL = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), {
      href: objectURL,
      type: 'application/json',
      download: 'tab-reloader-preferences.json'
    }).dispatchEvent(new MouseEvent('click'));
    setTimeout(() => URL.revokeObjectURL(objectURL));
  });
});
// import
document.getElementById('import').addEventListener('click', () => {
  const fileInput = document.createElement('input');
  fileInput.style.display = 'none';
  fileInput.type = 'file';
  fileInput.accept = '.json';
  fileInput.acceptCharset = 'utf-8';

  document.body.appendChild(fileInput);
  fileInput.initialValue = fileInput.value;
  fileInput.onchange = readFile;
  fileInput.click();

  function readFile() {
    if (fileInput.value !== fileInput.initialValue) {
      const file = fileInput.files[0];
      if (file.size > 100e6) {
        console.warn('100MB backup? I don\'t believe you.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = event => {
        fileInput.remove();
        const json = JSON.parse(event.target.result);
        chrome.storage.local.clear(() => {
          chrome.storage.local.set(json, () => chrome.runtime.reload());
        });
      };
      reader.readAsText(file, 'utf-8');
    }
  }
});
