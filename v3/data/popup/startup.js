/* global api, defaults, active, disable */

let tab;
const startup = [];

/* presets */
api.storage.get({
  'presets': defaults.presets
}).then(({presets}) => {
  const f = document.createDocumentFragment();

  presets.slice(0, 5).forEach((preset, n) => {
    const span = document.createElement('span');
    span.textContent = api.convert.obj2str(preset);
    span.preset = preset;
    span.classList.add('entry');
    span.title = 'Ctrl + ' + (n + 1);
    f.appendChild(span);
  });

  document.getElementById('presets').appendChild(f);
});
document.getElementById('presets').onclick = e => {
  if (e.target.preset) {
    document.getElementById('period').value = api.convert.obj2str(e.target.preset);
  }
};

const profile = prefs => {
  for (const [id, value] of Object.entries(prefs)) {
    const e = document.getElementById(id);
    if (e) {
      e[e.type === 'checkbox' ? 'checked' : 'value'] = value;
    }
  }
};

startup.push(async o => {
  // Do we have a job for this tab
  if (o) {
    const p = await api.storage.get('job-' + o.name);
    tab.profile = p;
    active();

    return profile(p);
  }
  // Do we have a profile for this tab
  const vv = await new Promise(resolve => api.post.bg({
    method: 'search-for-profile',
    url: tab.url
  }, resolve));
  if (vv) {
    return profile(vv);
  }
  // load defaults
  api.storage.get({
    'default-profile': defaults.profile
  }).then(prefs => profile(prefs['default-profile']));
});
startup.push(async (o, firstRun) => {
  if (firstRun === false && !o) {
    disable();
  }
});

/* init */
api.tabs.active().then(async t => {
  tab = t;
  const o = await api.alarms.get(tab.id.toString());

  for (const c of startup) {
    c(o, true);
  }
});
