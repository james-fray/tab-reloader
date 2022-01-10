/* global api, messaging */

const custom = (tab, json) => {
  for (const o of json) {
    if (api.match('ht:' + o.hostname, tab.url)) {
      const profile = o;
      profile.period = api.convert.obj2str({
        hh: o.dd * 24 + o.hh,
        mm: o.mm,
        ss: o.ss
      });
      if (o.code) {
        profile['code-value'] = o.code;
        profile.code = true;
      }
      delete o.dd;
      delete o.hh;
      delete o.mm;
      delete o.ss;
      delete o.hostname;
      delete o.url;

      messaging({
        method: 'add-job',
        profile,
        tab
      });
      return true;
    }
  }
  return false;
};

api.alarms.fired(async o => {
  const tabId = Number(o.name);
  const tab = await api.tabs.get(tabId);
  // only set new alarm if tab still exists
  if (tab) {
    const profile = await api.storage.get('job-' + o.name);

    const time = api.convert.str2obj(profile.period);
    const period = Math.max(1, api.convert.secods(time));

    api.alarms.add(o.name, {
      when: Date.now() + period * 1000
    });

    const skip = reason => {
      api.button.icon('skipped', tabId);
      api.button.tooltip('Reloading skipped: ' + reason, tabId);
    };

    // reload
    const options = {};

    if (navigator.onLine === false && profile.offline) {
      return skip('browser is offline');
    }

    if (tab.active && profile.current) {
      if (profile.nofocus) {
        const w = await api.tabs.window(tab.windowId);
        if (w.focused) {
          return skip('window is focused');
        }
      }
      else {
        return skip('tab is active');
      }
    }

    for (const key of profile['blocked-words'].split(/\s*,\s*/)) {
      if (tab.url && api.match(key, tab.url)) {
        return skip('blocked word in URL');
      }
      if (tab.title && api.match(key, tab.title)) {
        return skip('blocked word in title');
      }
    }

    const prefs = await api.storage.get({
      'schedule-offset': 0,
      'policy': {} // reloading policy
    });

    // schedule
    const [sstart = '', send = ''] = profile['blocked-period'].split(/\s*-\s*/);

    const start = new Date();
    const ofsb = start.getTimezoneOffset();
    // apply offset
    start.setTime(
      start.getTime() + prefs['schedule-offset'] * 60 * 1000
    );
    const [sh, sm, ss] = sstart.split(':');
    start.setSeconds(Number(ss || '0'));
    start.setMinutes(Number(sm || '0'));
    start.setHours(Number(sh || '0'));
    start.setTime(
      start.getTime() - prefs['schedule-offset'] * 60 * 1000
    );
    // consider timezone changes
    const ofsa = start.getTimezoneOffset();
    start.setTime(start.getTime() + (ofsb - ofsa) * 60 * 1000);

    const end = new Date();
    // apply offset
    end.setTime(
      end.getTime() + prefs['schedule-offset'] * 60 * 1000
    );
    const [eh, em, es] = send.split(':');
    end.setSeconds(Number(es || '59'));
    end.setMinutes(Number(em || '59'));
    end.setHours(Number(eh || '23'));
    end.setTime(
      end.getTime() - prefs['schedule-offset'] * 60 * 1000
    );
    // consider timezone changes
    const ofea = end.getTimezoneOffset();
    end.setTime(end.getTime() + (ofsb - ofea) * 60 * 1000);

    if (start.getTime() >= end.getTime()) {
      end.setTime(end.getTime() + 24 * 60 * 60 * 1000);
    }

    const now = Date.now();
    if (now < start.getTime() || now > end.getTime()) {
      return skip('schedule mismatch');
    }

    if (profile.cache) {
      options.bypassCache = true;
    }

    // skip on reloading policy
    for (const [key, o] of Object.entries(prefs.policy)) {
      if (api.match(key, tab.url)) {
        if (o.url) {
          try {
            const r = new RegExp(o.url);
            if (r.test(tab.url) === false) {
              return skip('URL policy violation');
            }
          }
          catch (e) {
            console.warn('URL policy violation', e);
          }
        }
        if (o.date) {
          try {
            const r = new RegExp(o.date);
            if (r.test((new Date()).toLocaleString()) === false) {
              return skip('DATE policy violation');
            }
          }
          catch (e) {
            console.warn('DATE policy violation', e);
          }
        }
      }
    }

    api.tabs.reload(tab, options, profile.form);
  }
  else {
    console.warn('cannot find tab with id', o.name);
  }
});

// when tab is loaded, restart the timer
api.tabs.loaded(d => {
  api.alarms.get(d.tabId.toString()).then(async o => {
    if (o) {
      const tabId = Number(o.name);
      const profile = await api.storage.get('job-' + o.name);

      const time = api.convert.str2obj(profile.period);
      let period = Math.max(1, api.convert.secods(time));
      // variation
      if (profile.variation) {
        const delta = Math.random() * (profile.variation / 100) * period;
        period = period + (Math.random() > 0.5 ? 1 : -1) * delta;
        period = Math.max(period, 5); // make sure time is in valid range
      }

      api.button.icon('active', tabId);
      api.alarms.add(o.name, {
        when: Date.now() + period * 1000
      });

      if (profile['scroll-to-end']) {
        api.inject(tabId, {
          files: ['/data/scripts/ste.js']
        }).catch(e => console.warn('Cannot run ste.js', e));
      }
      if (profile.switch) {
        api.inject(tabId, {
          func: () => window.switch = true
        }).catch(e => console.warn('cannot run switch', e));
      }
      if (profile.sound) {
        api.inject(tabId, {
          func: src => window.src = src,
          args: [chrome.runtime.getURL('/data/sounds/' + profile['sound-value'] + '.wav')]
        });
      }
      if (profile.switch || profile.sound) {
        api.inject(tabId, {
          files: ['/data/scripts/sha.js']
        }).catch(e => console.warn('cannot calculate SHA256', e));
      }
      if (profile.code && profile['code-value'].trim()) {
        Promise.all([
          api.inject(tabId, {
            files: ['/data/scripts/interpreter/acorn.js']
          }),
          api.inject(tabId, {
            files: ['/data/scripts/interpreter/sval.js']
          })
        ]).then(() => api.inject(tabId, {
          func: code => {
            const interpreter = new window.Sval({
              ecmaVer: 10,
              sandBox: true
            });
            interpreter.import('post', e => {
              const method = e.type || e;
              if (method === 'toggle-requested' || method === 'activate-tab') {
                chrome.runtime.sendMessage({method});
              }
              else if (method === 'delay-for') {
                chrome.runtime.sendMessage({
                  method,
                  delay: Number(e.detail)
                });
              }
              else if (method === 'play-sound') {
                chrome.runtime.sendMessage({
                  method,
                  src: e.detail
                });
              }
            });
            interpreter.run(code);
          },
          // temporary convert "script.dispatchEvent" with "post" so that examples run
          args: [profile['code-value'].replaceAll('script.dispatchEvent', 'post')]
        }));
      }
    }
    // custom jobs is only applied if there is no ongoing job (after initialization is done)
    else {
      if (api.tabs.ready !== false) {
        const prefs = await api.storage.get({
          'dynamic.json': false,
          'json': []
        });
        if (prefs['dynamic.json']) {
          custom({
            url: d.url,
            id: d.tabId
          }, prefs.json);
        }
      }
    }
  });
});

/* startup -> restore a job, find a job for matching tab, run custom jobs */
api.runtime.started(async () => {
  // make sure a custom policy is not being applied before initialization
  api.tabs.ready = false;

  await api.alarms.forEach(async o => {
    const tabId = Number(o.name);
    const tab = await api.tabs.get(tabId);

    if (tab) {
      api.button.icon('active', tabId);
    }
    else {
      // see if we can find an identical tab for the missed profile
      const profile = await api.storage.get('job-' + o.name);
      if (profile.href) {
        const [tab] = await api.tabs.query({
          url: profile.href
        });
        if (tab) {
          // make sure this tab does not have an active job
          const o = await api.alarms.get(tab.id.toString());
          if (!o) {
            messaging({
              method: 'add-job',
              profile,
              tab
            });
          }
        }
      }
      messaging({
        method: 'remove-job',
        id: o.name
      });
    }
  });

  // check custom jobs
  const prefs = await api.storage.get({
    'json': []
  });
  if (prefs.json.length) {
    const tabs = await api.tabs.query({});
    for (const tab of tabs) {
      // do we have an alarm for this tab
      const o = await api.alarms.get(tab.id.toString());
      if (!o) {
        custom(tab, prefs.json);
      }
    }
  }

  // done
  api.tabs.ready = true;
  api.alarms.count().then(c => api.button.badge(c));
});
