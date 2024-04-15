/* global api, tab, Behave, startup */

// start or stop a job
document.addEventListener('mousedown', e => {
  document.body.dataset.forced = e.shiftKey;

  // https://bugzilla.mozilla.org/show_bug.cgi?id=812389
  if (api.firefox && e.target.getAttribute('for') === 'enable') {
    document.getElementById('enable').click();
  }
});


const remaining = (o, profile) => {
  let remaining = (o.scheduledTime - Date.now()) / 1000;
  if (remaining < 0 && profile) {
    const period = api.convert.secods(
      api.convert.str2obj(profile.period)
    );
    while (period > 0 && remaining < 0) {
      remaining += period;
    }
  }
  //
  if (remaining < 0) {
    remaining = 0;
  }

  const v = api.convert.sec2obj(remaining);
  return api.convert.obj2str(v);
};

const generate = (forced = false) => {
  const time = api.convert.str2obj(document.getElementById('period').value);
  let period = Math.max(1, api.convert.secods(time));
  if (forced === false) {
    period = Math.max(10, period);
  }
  return {
    'period': api.convert.obj2str(api.convert.sec2obj(period)),
    'variation': Math.min(100, Math.max(0, document.getElementById('variation').value)),
    'current': document.getElementById('current').checked,
    'nofocus': document.getElementById('nofocus').checked,
    'cache': document.getElementById('cache').checked,
    'form': document.getElementById('form').checked,
    'offline': document.getElementById('offline').checked,
    'discarded': document.getElementById('discarded').checked,
    'nodiscard': document.getElementById('nodiscard').checked,
    'randomize': document.getElementById('randomize').checked,
    'scroll-to-end': document.getElementById('scroll-to-end').checked,
    'visual-countdown': document.getElementById('visual-countdown').checked,
    'switch': document.getElementById('switch').checked,
    'sound': document.getElementById('sound').checked,
    'sound-value': document.getElementById('sound-value').value,
    'blocked-words': document.getElementById('blocked-words').value,
    'blocked-period': document.getElementById('blocked-period').value,
    'code': document.getElementById('code').checked,
    'code-value': document.getElementById('code-value').value,
    'pre-code': document.getElementById('pre-code').checked,
    'pre-code-value': document.getElementById('pre-code-value').value
  };
};

document.getElementById('enable').onchange = async e => {
  // register
  if (e.target.checked) {
    api.post.bg({
      method: 'add-jobs',
      profile: generate(document.body.dataset.forced === 'true'),
      tabs: await api.tabs.active()
    }, active);
  }
  // unregister
  else {
    api.post.bg({
      'reason': 'user-request',
      'method': 'remove-jobs',
      'ids': (await api.tabs.active()).map(t => t.id),
      'skip-echo': true
    });
  }
};

// display timer
let timer;
const active = () => {
  document.getElementById('enable').checked = true;
  document.body.dataset.enabled = true;

  const once = () => api.alarms.get(tab.id.toString()).then(o => {
    if (o) {
      document.querySelector('#timer div').textContent = remaining(o, tab.profile);
    }

    clearTimeout(timer);
    timer = setTimeout(once, 1000);
  });
  once();
};

// disable active timer
const disable = () => {
  clearTimeout(timer);
  document.body.dataset.enabled = false;
  document.getElementById('enable').checked = false;
  document.getElementById('enable').dispatchEvent(new Event('change'));
};
document.getElementById('disable').onclick = disable;

// code section
new Behave({
  textarea: document.getElementById('code-value'),
  replaceTab: true,
  softTabs: true,
  tabSize: 2
});
new Behave({
  textarea: document.getElementById('pre-code-value'),
  replaceTab: true,
  softTabs: true,
  tabSize: 2
});

// reload
api.post.fired(request => {
  if (request.method === 'reload-interface') {
    api.alarms.get(tab.id.toString()).then(o => {
      // location.reload();
      for (const c of startup) {
        c(o, false);
      }
    });
  }
});

// save as policy
document.getElementById('save-as-json').onclick = async e => {
  try {
    const {hostname, origin, pathname} = new URL(tab.url);
    if (hostname) {
      const prefs = await api.storage.get({
        'json': []
      });
      const j = generate();
      Object.assign(j, api.convert.str2obj(j.period));
      delete j.period;
      if (j.code && j['code-value']) {
        j.code = j['code-value'];
      }
      else {
        j.code = '';
      }
      delete j['code-value'];
      if (j['pre-code'] && j['pre-code-value']) {
        j['pre-code'] = j['pre-code-value'];
      }
      else {
        j['pre-code'] = '';
      }
      delete j['pre-code-value'];
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        const url = e.shiftKey ? tab.url : (origin + pathname);

        // remove old entries (only match with url)
        prefs.json = prefs.json.filter(o => o.url !== url);
        prefs.json.push({
          url,
          ...j
        });
      }
      else {
        // remove old entries (only match with hostname)
        prefs.json = prefs.json.filter(o => o.hostname !== hostname);
        prefs.json.push({
          hostname,
          ...j
        });
      }
      api.storage.set(prefs);
      e.target.textContent = chrome.i18n.getMessage('popup_saved');
    }
    else {
      throw Error('Tab does not have a valid address');
    }
  }
  catch (e) {
    console.warn(e);
    alert(e.message);
  }
};

// test sounds
document.getElementById('test-sound').onclick = () => {
  const src = document.getElementById('sound-value').value;

  const audio = new Audio();
  audio.src = '/data/sounds/' + src + '.mp3';
  audio.play();
};

// options
document.getElementById('options').addEventListener('toggle', e => api.storage.set({
  'options': e.target.open
}));
api.storage.get({
  'options': false
}).then(prefs => document.getElementById('options').open = prefs.options);

// links
for (const a of [...document.querySelectorAll('[data-href]')]) {
  if (a.hasAttribute('href') === false) {
    a.href = chrome.runtime.getManifest().homepage_url + '#' + a.dataset.href;
  }
}
// pre-code exmaple
document.getElementById('pre-code-inset-example').onchange = e => {
  let code = '';
  if (e.target.value === '1') {
    code = `document.currentScript.dataset.continue = document.body.innerText.includes("hello");`;
  }
  else if (e.target.value === '2') {
    code = `document.currentScript.dataset.continue = Math.random() < 0.5;`;
  }
  else if (e.target.value === '3') {
    code = `document.currentScript.dataset.continue = document.visibilityState === 'visible';`;
  }
  if (code) {
    document.getElementById('pre-code-value').value = code;
  }
  e.target.value = 0;
};
