/* global URLPattern */

const api = {
  firefox: /Firefox/.test(navigator.userAgent)
};

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

api.clean = {
  href(o) {
    return o.split('#')[0];
  }
};

api.match = (key = '', str = '', parent = undefined) => {
  if (key === '' || str === '') {
    return false;
  }
  // RegExp matching
  if (key.startsWith('re:')) {
    try {
      const r = new RegExp(key.slice(3));

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
      let v = key.slice(3);
      if (v.startsWith('http') === false) {
        v = 'http{s}?://' + v;
      }
      const pattern = new URLPattern(v, parent);

      return pattern.test(str);
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
      const [hostname, ...parts] = key.slice(3).replace(/^https?:\/\//, '').split('/');
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

api.idle = {
  fired(c) {
    chrome.idle.onStateChanged.addListener(c);
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
  keys() {
    return chrome.alarms.getAll().then(os => os.map(o => o.name));
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
  async active() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });
    return tab;
  },
  activate(tabId) {
    return Promise.all([
      new Promise(resolve => chrome.tabs.update(tabId, {
        active: true
      }, resolve)),
      new Promise(resolve => api.tabs.get(tabId).then(t => chrome.windows.update(t.windowId, {
        focused: true
      }, resolve)))
    ]);
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
  removed(c, windows = false) {
    if (windows) {
      chrome.windows.onRemoved.addListener(c);
    }
    else {
      chrome.tabs.onRemoved.addListener(c);
    }
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
        if (api.firefox) {
          setTimeout(c, 100, d);
        }
        else {
          c(d);
        }
      }
    });
  },
  update(...args) {
    chrome.tabs.update(...args);
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

api.context = {
  tab: 'TAB' in chrome.contextMenus.ContextType,
  add(options) {
    const valids = Object.values(chrome.contextMenus.ContextType);
    options.contexts = options.contexts.filter(s => valids.includes(s));

    chrome.contextMenus.create(options, () => {
      chrome.runtime.lastError;
    });
  },
  fired(c) {
    chrome.contextMenus.onClicked.addListener(c);
  }
};

api.commands = {
  fired(c) {
    chrome.commands.onCommand.addListener(c);
  }
};

api.runtime = {
  started(c) {
    if (api.firefox) {
      c();
    }
    else {
      chrome.runtime.onStartup.addListener(c);
      chrome.runtime.onInstalled.addListener(c);
    }
  }
};

api.permissions = {
  async request(o) {
    try {
      // const grantted = await chrome.permissions.contains(o);
      // if (grantted) {
      //   return true;
      // }
      return await chrome.permissions.request(o);
    }
    catch (e) {
      console.error(e);
      return false;
    }
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
