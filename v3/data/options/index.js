/* global defaults, api */

'use strict';

const config = {
  'badge': true,
  'color': defaults['badge-color'],
  'faqs': true,
  'removed.jobs.enabled': true,
  'json': [],
  'dynamic.json': false,
  'policy': {},
  'presets': defaults.presets,
  'default-profile': defaults.profile
};

const restore = () => chrome.storage.local.get(config, prefs => {
  document.getElementById('badge').checked = prefs.badge;
  document.getElementById('color').value = prefs.color;
  document.getElementById('faqs').checked = prefs.faqs;
  document.getElementById('removed.jobs.enabled').checked = prefs['removed.jobs.enabled'];
  document.getElementById('json').value = JSON.stringify(prefs.json, null, '  ');
  document.getElementById('dynamic.json').checked = prefs['dynamic.json'];
  document.getElementById('policy').value = JSON.stringify(prefs.policy, null, '  ');
  document.getElementById('presets').value = prefs.presets.slice(0, 6).map(o => api.convert.obj2str(o)).join(', ');
  document.getElementById('pp-period').value = prefs['default-profile'].period;
  document.getElementById('pp-variation').value = prefs['default-profile'].variation;
  document.getElementById('pp-current').checked = prefs['default-profile'].current;
  document.getElementById('pp-nofocus').checked = prefs['default-profile'].nofocus;
  document.getElementById('pp-cache').checked = prefs['default-profile'].cache;
  document.getElementById('pp-form').checked = prefs['default-profile'].form;
  document.getElementById('pp-offline').checked = prefs['default-profile'].offline;
  document.getElementById('pp-discarded').checked = prefs['default-profile'].discarded;
  document.getElementById('pp-nodiscard').checked = prefs['default-profile'].nodiscard;
  document.getElementById('pp-randomize').checked = prefs['default-profile'].randomize;
  document.getElementById('pp-scroll-to-end').checked = prefs['default-profile']['scroll-to-end'];
  document.getElementById('pp-visual-countdown').checked = prefs['default-profile']['visual-countdown'];
});
restore();

document.getElementById('save').addEventListener('click', () => {
  const info = document.getElementById('info');
  const badge = document.getElementById('badge').checked;

  let presets;
  if (document.getElementById('presets').value.trim()) {
    presets = document.getElementById('presets').value.split(/\s*,\s*/).map(s => {
      const o = api.convert.str2obj(s);
      const p = Math.max(10, api.convert.secods(o));

      return api.convert.sec2obj(p);
    });
  }
  else {
    presets = [{hh: 0, mm: 0, ss: 30}, {hh: 0, mm: 5, ss: 0}, {hh: 0, mm: 15, ss: 0}, {hh: 0, mm: 30, ss: 0},
      {hh: 1, mm: 0, ss: 0}, {hh: 5, mm: 0, ss: 0}];
  }

  const o = api.convert.str2obj(document.getElementById('pp-period').value);
  const period = Math.max(10, api.convert.secods(o));

  const profile = Object.assign({}, defaults.profile, {
    'period': api.convert.obj2str(api.convert.sec2obj(period)),
    'variation': Math.min(100, Math.max(0, document.getElementById('pp-variation').valueAsNumber)),
    'current': document.getElementById('pp-current').checked,
    'nofocus': document.getElementById('pp-nofocus').checked,
    'cache': document.getElementById('pp-cache').checked,
    'form': document.getElementById('pp-form').checked,
    'offline': document.getElementById('pp-offline').checked,
    'discarded': document.getElementById('pp-discarded').checked,
    'nodiscard': document.getElementById('pp-nodiscard').checked,
    'randomize': document.getElementById('pp-randomize').checked,
    ['scroll-to-end']: document.getElementById('pp-scroll-to-end').checked,
    ['visual-countdown']: document.getElementById('pp-visual-countdown').checked
  });

  if (badge === false) {
    api.button.badge('');
  }
  try {
    chrome.storage.local.set({
      badge,
      presets,
      'default-profile': profile,
      'color': document.getElementById('color').value,
      'faqs': document.getElementById('faqs').checked,
      'removed.jobs.enabled': document.getElementById('removed.jobs.enabled').checked,
      'json': JSON.parse(document.getElementById('json').value.trim() || '[]'),
      'dynamic.json': document.getElementById('dynamic.json').checked,
      'policy': JSON.parse(document.getElementById('policy').value.trim() || '{}')
    }, () => {
      info.textContent = chrome.i18n.getMessage("options_saved");
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
    'hostname': 'www.google.com',
    'dd': 0,
    'hh': 0,
    'mm': 1,
    'ss': 0
  }, {
    'dd': 0,
    'hh': 0,
    'mm': 2,
    'ss': 0,
    'url': 're:.*\\.wikipedia\\.org\\/wiki\\/Book'
  }, {
    'dd': 0,
    'hh': 0,
    'mm': 3,
    'ss': 0,
    'url': 'pt:*.wikipedia.org/wiki/Cat'
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
