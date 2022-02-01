/* global api, defaults */

// importScripts('api.js', 'defaults.js', 'reload.js', 'context.js');

const messaging = (request, sender, response = () => {}) => {
  if (request.method === 'remove-job') {
    const id = request.id.toString();

    setTimeout(async () => {
      await api.alarms.remove(id);
      await api.storage.remove('job-' + id);
      await api.alarms.count().then(c => api.button.badge(c));
      if (request['skip-echo'] !== true) {
        api.post.bg({
          method: 'reload-interface'
        });
      }
      response();
    }, 0);
    api.button.icon('disabled', request.id);

    return true;
  }
  else if (request.method === 'add-job') {
    const profile = Object.assign({}, defaults.profile, request.profile, {
      timestamp: Date.now(),
      href: request.tab.url.split('#')[0]
    });

    const name = request.tab.id.toString();
    const period = Math.max(1, api.convert.secods(api.convert.str2obj(profile.period)));
    const when = Date.now() + period * 1000;

    setTimeout(async () => {
      await api.storage.set({
        ['job-' + name]: profile
      });
      await api.alarms.add(name, {
        when,
        // only used as backup. The extension sets a new alarm
        periodInMinutes: Math.max(1, period / 60)
      });
      api.alarms.count().then(c => api.button.badge(c));
      api.button.icon('active', request.tab.id);
      api.post.bg({
        method: 'reload-interface'
      });
      response();
    });

    // keep in profiles
    try {
      const {hostname} = new URL(request.tab.url);

      if (hostname) {
        api.storage.get({
          profiles: {}
        }).then(prefs => {
          prefs.profiles[hostname] = profile;

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
      }
    }
    catch (e) {
      console.warn('Cannot add the new job to profiles', e);
    }

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
  else if (request.method === 'toggle-requested') { // user command
    const id = sender.tab.id;

    api.alarms.get(id.toString()).then(o => {
      if (o) {
        messaging({
          reason: 'script-request',
          method: 'remove-job',
          id
        });
      }
      else {
        messaging({
          method: 'search-for-profile',
          url: sender.tab.url
        }, {}, v => messaging({
          method: 'add-job',
          profile: v || {},
          tab: sender.tab
        }));
      }
    });
  }
  else if (request.method === 'activate-tab') { // user command
    api.tabs.activate(sender.tab.id);
  }
  else if (request.method === 'play-sound') { // user command
    try {
      (new Audio(request.src)).play();
    }
    catch (e) {
      console.warn(e);
    }
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
};

api.post.fired(messaging);

/* remove the job if tab is removed */
api.tabs.removed((id, info) => {
  // on browser close, this causes issue
  if (info.isWindowClosing === false) {
    messaging({
      reason: 'tab-removed',
      method: 'remove-job',
      id
    });
  }
});
/*
  make sure all jobs have a tab;
  sometimes api.tabs.remove(..., false) is not being called when the tab is the only child
*/
api.tabs.removed(() => setTimeout(() => {
  api.alarms.forEach(async o => {
    const tabId = Number(o.name);
    const tab = await api.tabs.get(tabId);
    if (!tab) {
      messaging({
        reason: 'tab-not-found-on-window-removed',
        method: 'remove-job',
        id: tabId
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
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const page = getManifest().homepage_url;
    const {name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, currentWindow: true}, tbs => tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
