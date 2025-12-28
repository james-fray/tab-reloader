/* global api, defaults */

if (typeof importScripts !== 'undefined') {
  self.importScripts('api.js', 'defaults.js', 'reload.js', 'context.js');
}

// Firefox
if (typeof URLPattern === 'undefined') {
  import('./polyfill/urlpattern.js').then(o => {
    self.URLPattern = o.URLPattern;
  });
}


const messaging = (request, sender, response = () => {}) => {
  if (request.method === 'remove-jobs') {
    // remove the jobs
    setTimeout(async () => {
      // get profiles before clearing the storage
      const map = new Map();
      for (const id of request.ids) {
        const profile = await api.storage.get('job-' + id);
        map.set(id.toString(), profile);
      }

      // remove job
      for (const e of request.ids) {
        const id = e.toString();
        await api.alarms.remove(id);
        api.button.icon('disabled', Number(id));
      }
      await api.storage.remove(...request.ids.map(id => 'job-' + id));
      await api.alarms.count().then(c => api.button.badge(c));

      if (request['skip-echo'] !== true) {
        api.post.bg({
          method: 'reload-interface'
        }, () => chrome.runtime.lastError);
      }
      response();

      // remove counters
      for (const e of request.ids) {
        chrome.tabs.sendMessage(Number(e), {
          method: 'kill-counter'
        }, () => chrome.runtime.lastError);
      }

      // allow discarding
      for (const [id, profile] of map.entries()) {
        if (profile && profile.nodiscard) {
          api.tabs.update(Number(id), {
            autoDiscardable: true
          });
        }
      }

      // keep track of jobs that are not removed by the user
      if (
        request.reason === 'tab-removed' ||
        request.reason === 'tab-not-found-on-window-removed' ||
        request.reason === 'tab-not-found-on-popup' ||
        request.reason === 'tab-not-found-on-alarm'
      ) {
        api.storage.get({
          'removed.jobs': {}
        }).then(prefs => {
          for (const id of request.ids) {
            const profile = map.get(id.toString());
            // do not add a job that is explicitly being forbidden
            if (profile && profile['skip-auto-add'] !== true) {
              // add new one
              prefs['removed.jobs'][api.clean.href(profile.href)] = {
                reason: request.reason,
                profile,
                timestamp: Date.now()
              };
            }
          }
          // remove old profiles
          Object.entries(prefs['removed.jobs']).forEach(([key, o]) => {
            if (Date.now() - o.timestamp > defaults['removed.jobs']) {
              delete prefs['removed.jobs'][key];
            }
          });
          api.storage.set(prefs);
        });
      }
    });

    return true;
  }
  else if (request.method === 'add-jobs') {
    api.storage.get({
      'default-profile': {},
      'profiles': {}
    }).then(prefs => {
      const g = Object.assign({}, defaults.profile, prefs['default-profile'], request.profile, {
        timestamp: Date.now()
      });
      delete prefs['default-profile'];

      const period = Math.max(1, api.convert.secods(api.convert.str2obj(g.period)));

      const when = Date.now() + (request.now ? 100 : (
        g.randomize ? parseInt(Math.random() * period * 1000) : period * 1000
      ));

      setTimeout(async () => {
        const storage = {};
        for (const tab of request.tabs) {
          const name = tab.id.toString();
          storage['job-' + name] = Object.assign({
            href: tab.url
          }, g);
          await api.alarms.add(name, {
            when,
            // only used as backup. The extension sets a new alarm
            periodInMinutes: Math.max(1, period / 60)
          });
          api.button.icon('active', tab.id);
          // countdown
          if (request.profile['visual-countdown']) {
            api.tabs.countdown(tab.id, request.profile.period, 'page').catch(e => console.error(e));
          }
          if (request.profile['badge-countdown']) {
            api.tabs.countdown(tab.id, request.profile.period, 'badge').catch(e => console.error(e));
          }
          // no discard
          if (g.nodiscard) {
            api.tabs.update(tab.id, {
              autoDiscardable: false
            });
          }
        }
        await api.storage.set(storage);
        api.alarms.count().then(c => api.button.badge(c));

        api.post.bg({
          method: 'reload-interface'
        }, () => chrome.runtime.lastError);
        response();
      });

      // keep in profiles
      for (const tab of request.tabs) {
        try {
          const {hostname} = new URL(tab.url);

          if (hostname) {
            prefs.profiles[hostname] = Object.assign({
              href: tab.url
            }, g);
          }
        }
        catch (e) {
          console.warn('Cannot add the new job to profiles', e);
        }
      }
      const profiles = Object.entries(prefs.profiles);
      if (profiles.length > defaults['max-number-of-profiles']) {
        const keys = profiles.sort((a, b) => a[1].timestamp - b[1].timestamp)
          .slice(0, profiles.length - defaults['max-number-of-profiles']).map(a => a[0]);

        for (const key of keys) {
          delete prefs.profiles[key];
        }
      }

      api.storage.set(prefs);
    });

    return true;
  }
  else if (request.method === 'search-for-profile-anyway') {
    (async () => {
      // Do we have a job for this tab
      if (request.alarm) {
        const profile = await api.storage.get('job-' + request.alarm.name);

        return response({
          active: true,
          profile
        });
      }
      // Do we have a profile for this tab
      const profile = await new Promise(resolve => messaging({
        method: 'search-for-profile',
        url: request.url
      }, {}, resolve));
      if (profile) {
        return response({profile});
      }
      // load defaults
      api.storage.get({
        'default-profile': defaults.profile
      }).then(prefs => response({
        profile: prefs['default-profile']
      }));
    })();

    return true;
  }
  else if (request.method === 'search-for-profile') {
    api.storage.get({
      profiles: {}
    }).then(({profiles}) => {
      for (const [key, value] of Object.entries(profiles)) {
        if (api.match('ht:' + key, request.url)) {
          return response(value);
        }
      }
      return response(false);
    });
    return true;
  }
  else if (request.method === 'show-error') { // user command
    const id = sender.tab.id;

    api.button.icon('error', id);
    api.button.badge('E', id);
    api.button.tooltip(request.message, id);
  }
  else if (request.method === 'toggle-requested') { // user command
    const id = sender.tab.id;

    api.alarms.get(id.toString()).then(o => {
      if (o) {
        messaging({
          reason: 'script-request',
          method: 'remove-jobs',
          ids: [id]
        });
      }
      else {
        messaging({
          method: 'search-for-profile',
          url: sender.tab.url
        }, {}, v => messaging({
          method: 'add-jobs',
          profile: v || {},
          tabs: [sender.tab]
        }));
      }
    });
  }
  else if (request.method === 'activate-tab') { // user command
    api.tabs.activate(sender.tab.id);
  }
  else if (request.method === 'play-sound') { // user command
    try {
      const audio = new Audio(request.src);
      audio.volume = request.volume || 1;
      audio.play();
    }
    catch (e) {
      try {
        const args = new URLSearchParams();
        args.set('volume', request.volume || 1);
        args.set('src', request.src);

        chrome.offscreen.createDocument({
          url: '/data/sounds/play.html?' + args.toString(),
          reasons: ['AUDIO_PLAYBACK'],
          justification: 'play alert on content change'
        }).catch(e => console.warn(e));
      }
      catch (ee) {
        console.warn(e, ee);
      }
    }
  }
  else if (request.method === 'close-document') {
    chrome.offscreen.closeDocument();
  }
  else if (request.method === 'delay-for') {
    const id = sender.tab.id;

    api.alarms.get(id.toString()).then(o => {
      if (o) {
        const when = Math.max(Date.now() + 1000, o.scheduledTime + request.delay);
        api.alarms.add(o.name, {
          when
        });
        api.post.bg({
          method: 'reload-interface'
        });
      }
    });
  }
  else if (request.method === 'get-timer') {
    api.alarms.get(sender.tab.id.toString()).then(response);

    return true;
  }
  else if (request.method === 'set-badge') {
    api.button.badge(request.content, sender.tab.id);
  }
  else if (request.method === 'echo') {
    response(true);
  }
  else if (request.method === 'sha256') {
    const msgBuffer = new TextEncoder('utf-8').encode(request.message);
    crypto.subtle.digest('SHA-256', msgBuffer).then(hashBuffer => {
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('');
      response(hashHex);
    });
    return true;
  }
  else if (request.method === 'synchronous-timings') {
    api.sync();
  }
};

api.post.fired(messaging);

/* remove the job if tab is removed */
api.tabs.removed((id, info) => {
  // on browser close, this causes issue
  if (info.isWindowClosing === false) {
    messaging({
      reason: 'tab-removed',
      method: 'remove-jobs',
      ids: [id]
    });
  }
});
/*
  make sure all jobs have a tab;
  sometimes api.tabs.remove(..., false) is not being called when the tab is the only child
*/
api.tabs.removed(() => setTimeout(() => {
  api.alarms.keys().then(async names => {
    const ids = [];
    for (const name of names) {
      const tabId = Number(name);
      const tab = await api.tabs.get(tabId);
      if (!tab) {
        ids.push(tabId);
      }
    }
    if (ids.length) {
      messaging({
        reason: 'tab-not-found-on-window-removed',
        method: 'remove-jobs',
        ids
      });
    }
  });
}, 2000), true);

/* badge color */
api.storage.get({
  color: defaults['badge-color']
}).then(prefs => api.button.color(prefs.color));
api.storage.changed(ps => ps.color && api.button.color(ps.color.newValue));

/* FAQs & Feedback */
{
  chrome.management = chrome.management || {
    getSelf(c) {
      c({installType: 'normal'});
    }
  };
  if (navigator.webdriver !== true) {
    const {homepage_url: page, name, version} = chrome.runtime.getManifest();
    chrome.runtime.onInstalled.addListener(({reason, previousVersion}) => {
      chrome.management.getSelf(({installType}) => installType === 'normal' && chrome.storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            chrome.tabs.query({active: true, lastFocusedWindow: true}, tbs => chrome.tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            chrome.storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    chrome.runtime.setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
