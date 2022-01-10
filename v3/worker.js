/* global api, defaults */

// importScripts('api.js', 'defaults.js', 'reload.js');

const messaging = (request, sender, response = () => {}) => {
  if (request.method === 'remove-job') {
    const id = request.id.toString();
    api.alarms.remove(id);
    api.storage.remove('job-' + id);
    api.alarms.count().then(c => api.button.badge(c));
    if (request['skip-echo'] !== true) {
      api.post.bg({
        method: 'reload-interface'
      });
    }
    api.button.icon('disabled', request.id);
  }
  else if (request.method === 'add-job') {
    const profile = Object.assign({}, defaults.profile, request.profile, {
      timestamp: Date.now(),
      href: request.tab.url
    });
    const name = request.tab.id.toString();
    const when = Date.now() + Math.max(1, api.convert.secods(api.convert.str2obj(profile.period))) * 1000;

    api.storage.set({
      ['job-' + name]: profile
    });
    api.alarms.add(name, {
      when
    });
    api.alarms.count().then(c => api.button.badge(c));
    api.button.icon('active', request.tab.id);
    api.post.bg({
      method: 'reload-interface'
    });

    console.log('added', name);

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

    response();
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
  messaging({
    method: 'remove-job',
    id
  });
});

/* badge color */
api.storage.get({
  color: defaults['badge-color']
}).then(prefs => api.button.color(prefs.color));
api.storage.changed(ps => ps.color && api.button.color(ps.color.newValue));
