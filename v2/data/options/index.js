'use strict';

const config = {
  'badge': true,
  'color': '#5e5e5e',
  'faqs': true,
  'use-native': true,
  'history': true,
  'history.timeout': 5000,
  'json': [],
  'dd': 0,
  'hh': 0,
  'mm': 5,
  'ss': 0,
  'dynamic.json': false,
  'policy': {},
  'log': false,
  'active': 'single',
  'presets': [{
    hh: 0,
    mm: 0,
    ss: 30
  }, {
    hh: 0,
    mm: 5,
    ss: 0
  }, {
    hh: 0,
    mm: 15,
    ss: 0
  }, {
    hh: 0,
    mm: 30,
    ss: 0
  }, {
    hh: 1,
    mm: 0,
    ss: 0
  }, {
    hh: 5,
    mm: 0,
    ss: 0
  }],
  'pp-current': false,
  'pp-nofocus': false,
  'pp-cache': false,
  'pp-form': false,
  'pp-offline': false,
  'pp-scroll-to-end': false,
  './plugins/badge/core.js': false
};

const restore = () => chrome.storage.local.get(config, prefs => {
  document.getElementById('badge').checked = prefs.badge;
  document.getElementById('log').checked = prefs.log;
  document.getElementById('color').value = prefs.color;
  document.getElementById('use-native').checked = prefs['use-native'];
  document.getElementById('faqs').checked = prefs.faqs;
  document.getElementById('history').checked = prefs.history;
  document.getElementById('history_timeout').value = parseInt(prefs['history.timeout'] / 1000);
  document.getElementById('json').value = JSON.stringify(prefs.json, null, '  ');
  document.getElementById('dd').value = prefs.dd;
  document.getElementById('hh').value = prefs.hh;
  document.getElementById('mm').value = prefs.mm;
  document.getElementById('ss').value = prefs.ss;
  document.getElementById('dynamic.json').checked = prefs['dynamic.json'];
  document.getElementById('policy').value = JSON.stringify(prefs.policy, null, '  ');
  document.getElementById('active').checked = prefs.active === 'multiple';
  document.getElementById('presets').value = prefs.presets.slice(0, 6).map(o => o.hh.toString().padStart(2, '0') + ':' +
    o.mm.toString().padStart(2, '0') + ':' + o.ss.toString().padStart(2, '0')).join(', ');


  document.getElementById('pp-current').checked = prefs['pp-current'];
  document.getElementById('pp-nofocus').checked = prefs['pp-nofocus'];
  document.getElementById('pp-cache').checked = prefs['pp-cache'];
  document.getElementById('pp-form').checked = prefs['pp-form'];
  document.getElementById('pp-offline').checked = prefs['pp-offline'];
  document.getElementById('pp-scroll-to-end').checked = prefs['pp-scroll-to-end'];

  document.getElementById('./plugins/badge/core.js').checked = prefs['./plugins/badge/core.js'];
});
restore();

document.getElementById('save').addEventListener('click', () => {
  const info = document.getElementById('info');
  const badge = document.getElementById('badge').checked;

  let presets;
  if (document.getElementById('presets').value.trim()) {
    presets = document.getElementById('presets').value.split(/\s*,\s*/).map(s => {
      const [hh, mm, ss] = s.split(/\s*:\s*/);

      const o = {
        hh: 0,
        mm: 0,
        ss: 0
      };
      if (isNaN(hh) === false) {
        o.hh = Math.max(0, parseInt(hh || '0'));
      }
      if (isNaN(mm) === false) {
        o.mm = Math.min(59, Math.max(0, parseInt(mm || '0')));
      }
      if (isNaN(ss) === false) {
        o.ss = Math.min(59, Math.max(0, parseInt(ss || '0')));
      }
      if (o.ss === 0 && o.mm === 0 && o.hh === 0) {
        o.ss = 10;
      }

      return o;
    });
  }
  else {
    presets = [{hh: 0, mm: 0, ss: 30}, {hh: 0, mm: 5, ss: 0}, {hh: 0, mm: 15, ss: 0}, {hh: 0, mm: 30, ss: 0},
      {hh: 1, mm: 0, ss: 0}, {hh: 5, mm: 0, ss: 0}];
  }

  try {
    chrome.storage.local.set({
      badge,
      presets,
      'color': document.getElementById('color').value,
      'faqs': document.getElementById('faqs').checked,
      'use-native': document.getElementById('use-native').checked,
      'log': document.getElementById('log').checked,
      'history': document.getElementById('history').checked,
      'history.timeout': Math.max(2, Number(document.getElementById('history_timeout').value)) * 1000,
      'json': JSON.parse(document.getElementById('json').value.trim() || '[]'),
      'dd': Math.max(Number(document.getElementById('dd').value), 0),
      'hh': Math.min(Math.max(Number(document.getElementById('hh').value), 0), 23),
      'mm': Math.min(Math.max(Number(document.getElementById('mm').value), 0), 59),
      'ss': Math.min(Math.max(Number(document.getElementById('ss').value), 0), 59),
      'dynamic.json': document.getElementById('dynamic.json').checked,
      'policy': JSON.parse(document.getElementById('policy').value.trim() || '{}'),
      'active': document.getElementById('active').checked ? 'multiple' : 'single',
      'pp-current': document.getElementById('pp-current').checked,
      'pp-nofocus': document.getElementById('pp-nofocus').checked,
      'pp-cache': document.getElementById('pp-cache').checked,
      'pp-form': document.getElementById('pp-form').checked,
      'pp-offline': document.getElementById('pp-offline').checked,
      'pp-scroll-to-end': document.getElementById('pp-scroll-to-end').checked,

      './plugins/badge/core.js': document.getElementById('./plugins/badge/core.js').checked
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
// open usage instruction
document.getElementById('opv').addEventListener('click', () => chrome.tabs.create({
  url: 'https://www.youtube.com/watch?v=zAhQlorZZTc'
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
// toggle
document.getElementById('keywords').addEventListener('click', () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '#faq27'
}));
document.getElementById('events').addEventListener('click', () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '#faq26'
}));
document.getElementById('desc-1').addEventListener('click', () => {
  document.querySelector('[for="desc-1"]').classList.toggle('hide');
});
document.getElementById('desc-2').addEventListener('click', () => {
  document.querySelector('[for="desc-2"]').classList.toggle('hide');
});
document.getElementById('desc-4').addEventListener('click', () => {
  document.querySelector('[for="desc-4"]').classList.toggle('hide');
});
// permission
document.getElementById('permission').addEventListener('click', () => chrome.permissions.request({
  origins: ['<all_urls>']
}, granted => {
  const info = document.getElementById('info');
  info.textContent = 'Host permission is ' + (granted ? 'granted' : 'denied');
  window.setTimeout(() => info.textContent = '', 3000);
}));

document.addEventListener('DOMContentLoaded', () => {
  for (const a of [...document.querySelectorAll('[data-href]')]) {
    if (a.hasAttribute('href') === false) {
      a.href = chrome.runtime.getManifest().homepage_url + '#' + a.dataset.href;
    }
  }
});
