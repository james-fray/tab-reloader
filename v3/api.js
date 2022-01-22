/* global URLPattern */

const api = {};

api.storage = {
  get(prefs) {
    return new Promise(resolve => chrome.storage.local.get(prefs, ps => {
      if (typeof prefs === 'string') {
        resolve(ps[prefs]);
      }
      else {
        resolve(ps);
      }
    }));
  },
  set(prefs) {
    return new Promise(resolve => chrome.storage.local.set(prefs, resolve));
  },
  remove(key) {
    chrome.storage.local.remove(key);
  },
  changed(c) {
    chrome.storage.onChanged.addListener(c);
  }
};

api.convert = {
  obj2str(o, separator = ':') {
    return Object.values(o).map(value => value.toString().padStart(2, '0')).join(separator);
  },
  str2obj(str = '') {
    let [hh, mm, ss] = str.split(':');
    hh = hh || '0';
    mm = mm || '0';
    ss = ss || '0';

    if (isNaN(hh)) {
      hh = 0;
    }
    if (isNaN(mm)) {
      mm = 0;
    }
    if (isNaN(ss)) {
      ss = 0;
    }
    hh = Math.max(0, parseInt(hh));
    mm = Math.min(59, Math.max(0, parseInt(mm)));
    ss = Math.min(59, Math.max(0, parseInt(ss)));

    if (ss === 0 && mm === 0 && hh === 0) {
      mm = 5;
    }

    return {hh, mm, ss};
  },
  secods(o) {
    return o.hh * 60 * 60 + o.mm * 60 + o.ss;
  },
  sec2obj(num) {
    const hh = Math.floor(num / (60 * 60));
    num -= hh * 60 * 60;
    const mm = Math.floor(num / 60);
    const ss = Math.floor(num % 60);

    return {hh, mm, ss};
  }
};

api.match = (key = '', str = '', parent = '') => {
  if (key === '' || str === '') {
    return false;
  }
  // RegExp matching
  if (key.startsWith('re:')) {
    try {
      const r = new RegExp(key.substr(3));

      return r.test(str);
    }
    catch (e) {
      console.warn('Cannot run RegExp matching', e);
      return false;
    }
  }
  // URLPattern matching
  else if (key.startsWith('pt:')) {
    try {
      const pattern = new URLPattern(str, parent);

      return pattern.test(key.substr(3));
    }
    catch (e) {
      console.warn('Cannot run URLPattern matching', e);
      return false;
    }
  }
  // host matching
  else if (key.startsWith('ht:')) {
    try {
      // https://*.example.com/test*
      const [hostname, ...parts] = key.substr(3).replace(/^https?:\/\//, '').split('/');
      const [pathname, search] = parts.join('/').split('?');

      const pattern = new URLPattern({
        hostname,
        search: search ? '?' + search : '*',
        pathname: pathname ? '/' + pathname.split('#')[0] : '*'
      });
      return pattern.test(str);
    }
    catch (e) {
      console.warn('Cannot run host matching', e);
      return false;
    }
  }
  else {
    return str.indexOf(key) !== -1;
  }
};

api.alarms = {
  add(name, o) {
    return chrome.alarms.create(name, o);
  },
  remove(name) {
    return chrome.alarms.clear(name);
  },
  get(id) {
    return chrome.alarms.get(id);
  },
  fired(c) {
    chrome.alarms.onAlarm.addListener(c);
  },
  count() {
    return chrome.alarms.getAll().then(os => os.length);
  },
  forEach(c) {
    return chrome.alarms.getAll().then(os => Promise.all(os.map(o => c(o))));
  }
};

api.post = {
  bg: (o, c) => {
    chrome.runtime.sendMessage(o, c);
  },
  fired(...args) {
    chrome.runtime.onMessage.addListener(...args);
  }
};

api.tabs = {
  ready: true, // this switch is true when initialization is done
  async active() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });
    return tab;
  },
  activate(tabId) {
    chrome.tabs.update(tabId, {
      highlighted: true
    });
    api.tabs.get(tabId).then(t => chrome.windows.update(t.windowId, {
      focused: true
    }));
  },
  get(id) {
    return chrome.tabs.get(id).then(tab => {
      chrome.runtime.lastError;
      return tab;
    }).catch(() => null);
  },
  window(id) {
    return chrome.windows.get(id);
  },
  removed(c) {
    chrome.tabs.onRemoved.addListener(c);
  },
  query(o) {
    return chrome.tabs.query(o);
  },
  reload(tab, options, form) {
    if (form) {
      chrome.tabs.update(tab.id, {
        url: tab.url.split('#')[0].split('?')[0]
      });
    }
    else {
      chrome.tabs.reload(tab.id, options);
    }
  },
  loaded(c) {
    chrome.webNavigation.onDOMContentLoaded.addListener(d => {
      if (d.frameId === 0) {
        c(d);
      }
    });
  }
};

api.button = {
  icon(type, tabId) {
    try {
      chrome.action.setIcon({
        tabId,
        path: {
          '16': '/data/icons/' + type + '/16.png',
          '32': '/data/icons/' + type + '/32.png'
        }
      }, () => chrome.runtime.lastError);
    }
    catch (e) {}
  },
  badge(text, tabId) {
    api.storage.get({
      badge: true
    }).then(({badge}) => {
      if (badge) {
        const o = {
          text: String(text ? text : '')
        };
        if (tabId) {
          o.tabId = tabId;
        }
        chrome.action.setBadgeText(o, () => chrome.runtime.lastError);
      }
    });
  },
  tooltip(title, tabId) {
    const o = {
      title
    };
    if (tabId) {
      o.tabId = tabId;
    }
    chrome.action.setTitle(o);
  },
  color(color) {
    chrome.action.setBadgeBackgroundColor({
      color
    });
  }
};

api.runtime = {
  started(c) {
    chrome.runtime.onStartup.addListener(c);
    chrome.runtime.onInstalled.addListener(c);
  }
};

api.permissions = {
  async request(o) {
    const grantted = await chrome.permissions.contains(o);
    if (grantted) {
      return true;
    }
    return await chrome.permissions.request(o);
  }
};

api.inject = (tabId, o) => {
  return chrome.scripting.executeScript({
    target: {
      tabId
    },
    ...o
  });
};