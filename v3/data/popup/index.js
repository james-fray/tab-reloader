/* global api, tab, Behave, startup */

// start or stop a job
document.getElementById('enable').onclick = e => {
  e.target.dataset.forced = e.shiftKey;
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
    'scroll-to-end': document.getElementById('scroll-to-end').checked,
    'switch': document.getElementById('switch').checked,
    'sound': document.getElementById('sound').checked,
    'sound-value': document.getElementById('sound-value').value,
    'blocked-words': document.getElementById('blocked-words').value,
    'blocked-period': document.getElementById('blocked-period').value,
    'code': document.getElementById('code').checked,
    'code-value': document.getElementById('code-value').value
  };
};

document.getElementById('enable').onchange = e => {
  // register
  if (e.target.checked) {
    api.post.bg({
      method: 'add-job',
      profile: generate(e.target.dataset.forced === 'true'),
      tab
    }, active);
  }
  // unregister
  else {
    api.post.bg({
      'method': 'remove-job',
      'id': tab.id,
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
      let remaining = (o.scheduledTime - Date.now()) / 1000;
      if (remaining < 0 && tab.profile) {
        const period = api.convert.secods(
          api.convert.str2obj(tab.profile.period)
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
      document.querySelector('#timer div').textContent = api.convert.obj2str(v);
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

// reload
api.post.fired(async request => {
  if (request.method === 'reload-interface') {
    const o = await api.alarms.get(tab.id.toString());
    // location.reload();
    for (const c of startup) {
      c(o, false);
    }
  }
});

// save as policy
document.getElementById('save-as-json').onclick = async e => {
  try {
    const {hostname} = new URL(tab.url);
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
      // remove old entries
      prefs.json = prefs.json.filter(o => o.hostname !== hostname);
      prefs.json.push({
        hostname,
        ...j
      });
      api.storage.set(prefs);
      e.target.textContent = 'Saved!';
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
