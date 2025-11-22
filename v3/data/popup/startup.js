/* global api, defaults, active, disable */

let tab;
const startup = [];

/* presets */
api.storage.get({
  'presets': defaults.presets
}).then(({presets}) => {
  const f = document.createDocumentFragment();

  presets.forEach((preset, n) => {
    const span = document.createElement('span');
    span.textContent = api.convert.obj2str(preset);
    span.preset = preset;
    span.classList.add('entry');
    if (n < 10) {
      span.title = 'Ctrl/Command + ' + (n + 1);
    }
    f.appendChild(span);
  });

  document.getElementById('presets-body').appendChild(f);
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

startup.push(alarm => {
  api.post.bg({
    method: 'search-for-profile-anyway',
    alarm,
    url: tab.url
  }, r => {
    if (r.active) {
      tab.profile = r.profile;
      active();
    }

    profile(r.profile);
  });
});
startup.push((o, firstRun) => {
  if (firstRun === false && !o) {
    disable();
  }
});

/* init */
api.tabs.active().then(async tabs => {
  tab = tabs.filter(t => t.active).shift();
  const o = await api.alarms.get(tab.id.toString());

  for (const c of startup) {
    c(o, true);
  }
});
