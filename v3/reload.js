/* global api, messaging */

const custom = (tab, json) => {
  for (const o of json) {
    let match = false;
    if (o.url) {
      match = api.match(o.url, tab.url);
    }
    else if (o.hostname) {
      match = api.match('ht:' + o.hostname, tab.url);
    }
    if (match) {
      const profile = o;
      profile.period = api.convert.obj2str({
        hh: (o.dd || 0) * 24 + (o.hh || 0),
        mm: (o.mm || 0),
        ss: (o.ss || 0)
      });
      if (o.code) {
        profile['code-value'] = o.code;
        profile.code = true;
      }
      if (o['pre-code']) {
        profile['pre-code-value'] = o['pre-code'];
        profile['pre-code'] = true;
      }

      delete o.dd;
      delete o.hh;
      delete o.mm;
      delete o.ss;
      delete o.hostname;
      delete o.url;

      messaging({
        method: 'add-jobs',
        profile,
        tabs: [tab]
      });
      return true;
    }
  }
  return false;
};

// time: 00:00:00 - 00:30:59, 01:00:00 - 01:30:59
const schedule = (time, prefs) => {
  const match = time => {
    const [sstart = '', send = ''] = time.split(/\s*-\s*/);

    if (sstart === '' || send === '') {
      console.error('Time is invalid', 'start', sstart, 'end', send);
      return;
    }

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

    if (isNaN(start) || isNaN(end)) {
      console.error('Time is invalid', start, end);
      return;
    }
    else {
      if (start.getTime() >= end.getTime()) {
        end.setTime(end.getTime() + 24 * 60 * 60 * 1000);
      }

      const now = Date.now();
      if (now >= start.getTime() && now <= end.getTime()) {
        return true;
      }
    }
  };

  const rs = time.split(/\s*,\s*/).filter(a => a).map(match);
  return rs.some(a => a) === false;
};

// custom countdown for a tab
api.tabs.countdown = async (tabId, period, mode) => {
  if (mode !== 'page' && mode !== 'badge') {
    throw Error(`"${mode}" is not supported`);
  }

  await api.inject(tabId, {
    func: (tabId, period) => {
      self.tabId = tabId;
      self.period = period;
    },
    args: [tabId, period]
  });
  if (mode === 'page') {
    await api.inject(tabId, {
      files: ['/data/scripts/vcd.js']
    });
  }
  else if (mode === 'badge') {
    await api.inject(tabId, {
      files: ['/data/scripts/bcd.js']
    });
  }
};

api.alarms.fired(async o => {
  const tabId = Number(o.name);
  if (isNaN(tabId)) {
    return;
  }
  const tab = await api.tabs.get(tabId);
  // only set new alarm if tab still exists
  if (tab) {
    const profile = await api.storage.get('job-' + o.name);

    const time = api.convert.str2obj(profile.period);
    const period = Math.max(1, api.convert.secods(time));

    api.alarms.add(o.name, {
      when: Date.now() + period * 1000,
      // only used as backup. The extension sets a new alarm
      periodInMinutes: Math.max(1, period / 60)
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

    if (tab.discarded && profile.discarded) {
      return skip('tab is discarded');
    }

    if (tab.active && profile.current) {
      return skip('tab is active');
    }
    if (profile.nofocus) {
      const w = await api.tabs.window(tab.windowId);
      if (w.focused) {
        return skip('window is focused');
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
    if (profile['blocked-period'] && schedule(profile['blocked-period'], prefs)) {
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

    if (profile['pre-code']) {
      const code = profile['pre-code-value'];

      try {
        const [{result}] = await api.inject(tabId, {
          world: 'MAIN',
          func: code => {
            const s = document.createElement('script');
            s.textContent = code;
            document.body.append(s);
            s.remove();

            return s.dataset.continue;
          },
          args: [code]
        });

        if (result !== 'true') {
          return skip(`Policy Code return "${result}"`);
        }
      }
      catch (e) {
        console.warn(e);

        // if tab is discarded and we have a policy code, skip the check
        // https://github.com/james-fray/tab-reloader/issues/204
        if (tab.discarded === false) {
          return skip(`Policy Code Failed "${e.message}"`);
        }
      }
    }

    // before reloading do we need to remove CSP?
    if (profile['remove-csp']) {
      await api.csp.remove(tabId);
    }

    api.tabs.reload(tab, options, profile.form);
  }
  else {
    // is this tab discarded (https://github.com/james-fray/tab-reloader/issues/110)
    // if so the id might have changed

    const profile = await api.storage.get('job-' + o.name);

    const tabs = await api.tabs.query({
      url: profile.href,
      discarded: true
    });

    if (tabs.length) {
      console.warn('replacing tab with id', o.name, 'with a new job');
    }
    else {
      console.warn('cannot find tab with id', o.name);
    }

    messaging({
      reason: tabs.length ? 'alarm-replace' : 'tab-not-found-on-alarm',
      method: 'remove-jobs',
      ids: [tabId]
    });
    if (tabs.length) {
      messaging({
        method: 'add-jobs',
        profile,
        tabs: [tabs[0]],
        now: true
      });
    }
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

      // if URL is updated, add as a new job so we can restore after a restart
      if (profile.href === d.url) {
        api.alarms.add(o.name, {
          when: Date.now() + period * 1000
        });
      }
      else {
        if (profile['stop-on-address-change']) {
          messaging({
            reason: 'address-changed',
            method: 'remove-jobs',
            ids: [tabId]
          });
          return;
        }

        profile.href = d.url;
        messaging({
          method: 'add-jobs',
          profile,
          tabs: [await api.tabs.get(tabId)]
        });
      }

      const error = e => {
        api.button.icon('error', tabId);
        api.button.badge('E', tabId);
        api.button.tooltip(e.message, tabId);
      };

      // print the last updated time
      api.button.tooltip(chrome.i18n.getMessage('bg_msg_4', [new Date().toLocaleString()]), tabId);

      if (profile['scroll-to-end']) {
        api.inject(tabId, {
          files: ['/data/scripts/ste.js']
        }).catch(error);
      }
      if (profile['visual-countdown']) {
        api.tabs.countdown(tabId, profile.period, 'page').catch(error);
      }
      if (profile['badge-countdown']) {
        api.tabs.countdown(tabId, profile.period, 'badge').catch(error);
      }
      if (profile.switch) {
        api.inject(tabId, {
          func: () => self.switch = true
        }).catch(error);
      }
      if (profile.sound) {
        api.inject(tabId, {
          func: src => self.src = src,
          args: [chrome.runtime.getURL('/data/sounds/' + profile['sound-value'] + '.mp3')]
        }).catch(error);
      }
      if (profile.switch || profile.sound) {
        api.inject(tabId, {
          files: ['/data/scripts/sha.js']
        }).catch(error);
      }
      if (profile.code && profile['code-value'].trim()) {
        const id = 'scr-' + Math.random();
        api.inject(tabId, {
          func: id => {
            const span = document.createElement('span');
            span.id = id;
            span.addEventListener('post', e => chrome.runtime.sendMessage(e.detail));

            document.documentElement.append(span);
          },
          args: [id]
        }).then(() => api.inject(tabId, {
          world: 'MAIN',
          func: (id, code) => {
            const span = document.getElementById(id);
            span.remove();
            const s = document.createElement('script');
            s.textContent = code;

            const post = detail => span.dispatchEvent(new CustomEvent('post', {
              detail
            }));

            const error = e => post({
              method: 'show-error',
              message: e.message
            });
            window.addEventListener('error', error);

            s.addEventListener('toggle-requested', () => post({method: 'toggle-requested'}));
            s.addEventListener('activate-tab', () => post({method: 'activate-tab'}));
            s.addEventListener('delay-for', e => post({
              method: 'delay-for',
              delay: Number(e.detail)
            }));
            s.addEventListener('play-sound', e => post({
              method: 'play-sound',
              src: e.detail
            }));
            s.addEventListener('set-badge', e => post({
              method: 'set-badge',
              content: e.detail
            }));
            document.body.append(s);
            s.remove();

            window.removeEventListener('error', error);
          },
          args: [id, profile['code-value']]
        })).catch(error);
      }
    }
    // custom jobs and removed jobs are only applied if there is no ongoing job
    else {
      const prefs = await api.storage.get({
        'dynamic.json': false,
        'json': [],

        'removed.jobs': {},
        'removed.jobs.enabled': true
      });
      const tab = {
        url: d.url,
        id: d.tabId
      };

      if (prefs['removed.jobs.enabled']) {
        const href = api.clean.href(d.url);
        const o = prefs['removed.jobs'][href];
        if (o) {
          messaging({
            method: 'add-jobs',
            profile: o.profile,
            tabs: [tab]
          });
          delete prefs['removed.jobs'][href];

          return api.storage.set({
            'removed.jobs': prefs['removed.jobs']
          });
        }
      }
      if (prefs['dynamic.json']) {
        custom(tab, prefs.json);
      }
    }
  });
});

/* startup -> restore a job, find a job for matching tab, run custom jobs */
const restore = async () => {
  const jobs = new Set([
    ...Object.keys(await api.storage.get(null)).filter(n => n.startsWith('job-')).map(s => Number(s.slice(4))),
    ...(await api.alarms.keys()).map(Number)
  ]);
  const profiles = new Set();

  for (const tabId of jobs) {
    const tab = await api.tabs.get(tabId);
    const profile = await api.storage.get('job-' + tabId);

    if (tab && tab.url === profile.href) {
      api.button.icon('active', tabId);
      const o = await api.alarms.get(tabId + '');
      if (!o) {
        messaging({
          method: 'add-jobs',
          profile,
          tabs: [tab]
        });
      }
    }
    else {
      await new Promise(resolve => messaging({
        reason: 'restore-tab-not-found',
        method: 'remove-jobs',
        ids: [tabId]
      }, undefined, resolve));
      if (profile && profile.href) {
        profiles.add(profile);
      }
    }
  }
  // see if we can find an identical tab for the missed profiles
  for (const profile of profiles) {
    const tabs = await api.tabs.query({
      url: api.clean.href(profile.href)
    });
    // find the first tab with no job
    for (const tab of tabs) {
      // make sure this tab does not have an active job
      const o = await api.alarms.get(tab.id.toString());
      if (!o) {
        profiles.delete(profile);
        await new Promise(resolve => messaging({
          method: 'add-jobs',
          profile,
          tabs: [tab]
        }, undefined, resolve));
        break;
      }
    }
  }
  // Try to restore remaining not found jobs by registering "tabs.onUpdated" once for a period of a defined seconds
  // This tracking is only registered once after browser startup and get destroyed either by worker or timeout.
  if (profiles.size) {
    console.info('[Missed Jobs found after Restart]', profiles);
    const track = async (id, info, tab) => {
      for (const profile of profiles) {
        if (tab.url && tab.url.startsWith(api.clean.href(profile.href))) {
          // make sure this tab does not have an active job
          const o = await api.alarms.get(tab.id.toString());
          if (!o) {
            profiles.delete(profile);
            messaging({
              method: 'add-jobs',
              profile,
              tabs: [tab]
            });
            return;
          }
        }
      }
    };
    chrome.tabs.onUpdated.addListener(track);
    setTimeout(() => chrome.tabs.onUpdated.removeListener(track), 20000);
  }

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
  api.alarms.count().then(c => api.button.badge(c));
};
// restore with delay
api.runtime.started(async () => {
  const prefs = await api.storage.get({
    'startup-restore-delay': 5000
  });
  if (prefs['startup-restore-delay'] > 0) {
    api.alarms.add('startup-restore', {
      when: Date.now() + prefs['startup-restore-delay']
    }, true);

    // register only on startup call
    api.alarms.fired(o => {
      if (o.name === 'startup-restore') {
        restore();
      }
    }, true);
  }
});

/* make sure timers are current */
api.sync = () => {
  const now = Date.now();
  api.alarms.forEach(o => {
    if (o.scheduledTime < now) {
      api.alarms.add(o.name, {
        when: now + Math.round(Math.random() * 1000),
        periodInMinutes: o.periodInMinutes
      });
    }
  });
};
api.idle.fired(state => {
  if (state === 'active') {
    api.sync();
  }
});
