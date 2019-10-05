'use strict';

const app = {};
app.button = {
  icon(mode, tabId) {
    const path = 'icons/' + (mode ? '' : 'disabled/');
    chrome.browserAction.setIcon({
      tabId,
      path: {
        '16': '/data/' + path + '16.png',
        '18': '/data/' + path + '18.png',
        '19': '/data/' + path + '19.png',
        '32': '/data/' + path + '32.png',
        '36': '/data/' + path + '36.png',
        '38': '/data/' + path + '38.png'
      }
    });
  },
  set label(label) {
    chrome.browserAction.setTitle({
      title: label
    });
  },
  set badge(val) {
    chrome.browserAction.setBadgeText({
      text: String(val ? val : '')
    });
  },
  set color(val) {
    chrome.browserAction.setBadgeBackgroundColor({
      color: val
    });
  }
};

const match = (str, rule) => {
  const escapeRegex = str => str.replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1');
  return new RegExp('^' + rule.split('*').map(escapeRegex).join('.*') + '$').test(str);
};

const prefs = {
  'badge': true,
  'color': '#5e5e5e',
  'session': [],
  'json': [],
  'history': true,
  'context.active': false,
  'context.cache': false,
  'dynamic.json': false
};

chrome.storage.onChanged.addListener(ps => {
  Object.keys(ps).forEach(k => prefs[k] = ps[k].newValue);
  if (ps.history && ps.history.newValue === false) {
    chrome.storage.local.set({
      'session': []
    });
  }
  if (ps.color) {
    app.button.color = ps.color.newValue;
  }
});

const storage = {};

const toSecond = obj => Math.max(
  obj.forced ? 1000 : 10000, // allow reloading up to a second!
  obj.dd * 1000 * 60 * 60 * 24 + obj.hh * 1000 * 60 * 60 + obj.mm * 1000 * 60 + obj.ss * 1000
);
const session = obj => {
  if (prefs.history === false) {
    return;
  }
  let session = Array.isArray(prefs.session) ? prefs.session : [];
  // remove the old jobs for this session
  session = session.filter(o => o.url !== obj.url);
  session.push(obj);
  session = session.filter(o => o.url.startsWith('http') || o.url.startsWith('ftp') || o.url.startsWith('file'));
  session = session.slice(-20);
  chrome.storage.local.set({session});
};

function count() {
  const num = Object.values(storage).reduce((p, c) => p + (c.status ? 1 : 0), 0);
  if (prefs.badge) {
    app.button.badge = num ? num : '';
  }
  return num;
}

function toPopup(id) {
  const obj = storage[id];
  chrome.runtime.sendMessage({
    method: 'updated-info',
    data: {
      status: obj.status,
      current: obj.current,
      cache: obj.cache,
      form: obj.form,
      dd: obj.dd,
      hh: obj.hh,
      mm: obj.mm,
      ss: obj.ss,
      variation: obj.variation,
      msg: obj.msg,
      jobs: obj.jobs
    }
  });
}

function timeout(id = 'timer-' + Math.random(), period, callback) {
  // console.log(id, period);
  if (period < 2 * 60 * 1000) {
    window.clearTimeout(id);
    return window.setTimeout(callback, period);
  }
  else {
    timeout.cache[id] = callback;
    chrome.alarms.clear(id, () => chrome.alarms.create(id, {
      when: Date.now() + period
    }));
    return id;
  }
}
timeout.stop = id => {
  if (timeout.cache[id]) {
    chrome.alarms.clear(id, () => {});
  }
  else {
    window.clearTimeout(id);
  }
};
timeout.cache = {};
chrome.alarms.onAlarm.addListener(({name}) => {
  if (timeout.cache[name]) {
    timeout.cache[name]();
  }
});

function repeat(obj) {
  function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
  }

  let period = obj.period;
  if (obj.variation) {
    period = getRandomInt(period * (100 - obj.variation) / 100, period * (100 + obj.variation) / 100);
    period = Math.max(period, 7000);
  }
  obj.vperiod = period;
  obj.id = timeout(obj.id, period, obj.callback);
}

chrome.webNavigation.onDOMContentLoaded.addListener(d => {
  if (d.frameId === 0) {
    const id = d.tabId;
    if (!storage[id] || !storage[id].status) {
      if (prefs['dynamic.json']) {
        const {hostname} = new URL(d.url);
        const entry = prefs.json.filter(j => match(hostname, j.hostname)).pop();
        if (entry) {
          enable(Object.assign({
            dd: 0,
            hh: 0,
            mm: 5,
            ss: 0,
            current: false,
            cache: false,
            form: false,
            forced: false,
            variation: 0
          }, entry), {id, url: d.url});
        }
      }
      return;
    }
    storage[id].time = (new Date()).getTime();
    app.button.icon(storage[id].status, id);
    repeat(storage[id]);
  }
});

function reload(tabId, obj) {
  if (obj.form) {
    chrome.tabs.get(tabId, tab => chrome.tabs.update(tabId, {
      url: tab.url.split('#')[0].split('?')[0]
    }));
  }
  else {
    chrome.tabs.reload(tabId, {
      bypassCache: obj.cache !== true
    });
  }
}

function enable(obj, tab) {
  const id = tab.id;
  storage[id] = storage[id] || {};
  Object.assign(storage[id], obj, {
    id: timeout.stop(storage[id].id),
    status: !storage[id].status,
    time: (new Date()).getTime(),
    msg: ''
  });

  app.button.icon(storage[id].status, id);

  if (storage[id].status) {
    storage[id].period = toSecond(obj);
    storage[id].callback = (function(id) {
      storage[id].time = (new Date()).getTime();
      chrome.tabs.get(id, tab => {
        if (tab) {
          if (storage[id].current) {
            if (!tab.active) {
              reload(tab.id, storage[id]);
            }
          }
          else {
            reload(tab.id, storage[id]);
          }
          // repeat although this might get overwritten after reload.
          repeat(storage[id]);
        }
        else {
          timeout.stop(storage[id].id);
          delete storage[id];
        }
      });
    }).bind(this, tab.id);
    repeat(storage[id]);
  }
  storage[id].jobs = count();
  toPopup(id);
  session({
    url: tab.url,
    status: storage[id].status,
    current: obj.current,
    cache: obj.cache,
    form: obj.form,
    variation: obj.variation,
    forced: obj.forced,
    period: {
      dd: obj.dd,
      hh: obj.hh,
      mm: obj.mm,
      ss: obj.ss
    }
  });
}
chrome.runtime.onMessage.addListener(request => {
  if (request.method === 'count') {
    count();
  }
  else if (request.method === 'enable') {
    enable(request.data, request.tab);
  }
  else if (request.method === 'request-update') {
    const id = request.id;
    storage[id] = storage[id] || {};
    const time = storage[id].time;
    let dd;
    let hh;
    let mm;
    let ss;
    if (time && storage[id].status) {
      const period = storage[id].vperiod || toSecond(storage[id]);
      let diff = period - ((new Date()).getTime() - time);
      dd = Math.floor(diff / (1000 * 60 * 60) / 24);
      diff -= dd * 24 * 60 * 60 * 1000;
      hh = Math.floor(diff / (1000 * 60 * 60));
      diff -= hh * 60 * 60 * 1000;
      mm = Math.floor(diff / (60 * 1000));
      ss = Math.floor(diff % (60 * 1000) / 1000);
      storage[id].msg = {dd, hh, mm, ss};
    }
    else {
      storage[id].msg = '';
    }
    storage[id].jobs = count();
    toPopup(id);
  }
});

chrome.tabs.onRemoved.addListener(id => {
  if (storage[id] && storage[id].id) {
    timeout.stop(storage[id].id);
    delete storage[id];
    count();
  }
});

// restore
const restore = () => {
  if (Array.isArray(prefs.session)) {
    const entries = prefs.session;
    chrome.tabs.query({
      url: '<all_urls>'
    }, tabs => {
      // automatic jobs
      tabs.forEach(tab => {
        const {hostname} = new URL(tab.url);
        const entry = prefs.json.filter(j => match(hostname, j.hostname)).pop();
        if (entry) {
          enable(Object.assign({
            dd: 0,
            hh: 0,
            mm: 5,
            ss: 0,
            current: false,
            cache: false,
            form: false,
            forced: false,
            variation: 0
          }, entry), tab);
        }
      });
      // session jobs
      tabs.forEach(tab => {
        if (!storage[tab.id]) { // only restore if tab has not already been activated manually
          let entry = entries.filter(e => e.url === tab.url);
          if (entry.length) {
            entry = entry[0];
            if (entry.status) {
              enable(Object.assign(entry.period, {
                current: entry.current || false,
                cache: entry.cache || false,
                form: entry.form || false,
                forced: entry.forced || false,
                variation: entry.variation || 0
              }), tab);
            }
            else {
              storage[tab.id] = {
                dd: entry.period.dd,
                hh: entry.period.hh,
                mm: entry.period.mm,
                ss: entry.period.ss,
                current: entry.current || false,
                cache: entry.cache || false,
                form: entry.form || false,
                forced: entry.forced || false,
                variation: entry.variation || 0
              };
            }
            app.button.icon(entry.status, tab.id);
          }
        }
      });
    });
  }
};

chrome.contextMenus.create({
  title: 'Reload all tabs',
  id: 'reload.all',
  contexts: ['browser_action']
});
chrome.contextMenus.create({
  title: 'Reload all tabs in the current window',
  id: 'reload.window',
  contexts: ['browser_action']
});
chrome.contextMenus.create({
  title: 'Restore old reloading jobs',
  id: 'restore',
  contexts: ['browser_action']
});
const contextmenus = () => {
  if ('TAB' in chrome.contextMenus.ContextType) {
    chrome.contextMenus.create({
      title: 'Don\'t reload',
      id: 'no.reload',
      contexts: ['tab']
    });
    chrome.contextMenus.create({
      title: 'Every 10 secs',
      id: 'reload.0.0.10',
      contexts: ['tab']
    });
    chrome.contextMenus.create({
      title: 'Every 30 secs',
      id: 'reload.0.0.30',
      contexts: ['tab']
    });
    chrome.contextMenus.create({
      title: 'Every minute',
      id: 'reload.0.1.0',
      contexts: ['tab']
    });
    chrome.contextMenus.create({
      title: 'Every 5 minutes',
      id: 'reload.0.5.0',
      contexts: ['tab']
    });
    chrome.contextMenus.create({
      title: 'Every 15 minutes',
      id: 'reload.0.15.0',
      contexts: ['tab']
    });
    chrome.contextMenus.create({
      title: 'Every hour',
      id: 'reload.1.0.0',
      contexts: ['tab']
    });
    chrome.contextMenus.create({
      contexts: ['tab'],
      type: 'separator'
    });
    chrome.contextMenus.create({
      title: 'Use cache while reloading',
      id: 'context.cache',
      contexts: ['tab'],
      type: 'checkbox',
      checked: prefs['context.cache']
    });
    chrome.contextMenus.create({
      title: 'Do not reload if tab is active',
      id: 'context.active',
      contexts: ['tab'],
      type: 'checkbox',
      checked: prefs['context.active']
    });
    chrome.contextMenus.create({
      contexts: ['tab'],
      type: 'separator'
    });
    chrome.contextMenus.create({
      title: 'Reload tab',
      id: 'reload.now',
      contexts: ['tab']
    });
    chrome.contextMenus.create({
      title: 'Reload all tabs',
      id: 'reload.all.c',
      contexts: ['tab']
    });
    chrome.contextMenus.create({
      title: 'Reload all tabs in the current window',
      id: 'reload.window.c',
      contexts: ['tab']
    });
  }
};

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'reload.all' || info.menuItemId === 'reload.all.c') {
    chrome.tabs.query({}, tabs => tabs.forEach(tab => reload(tab.id, {
      bypassCache: true
    })));
  }
  else if (info.menuItemId === 'reload.window' || info.menuItemId === 'reload.window.c') {
    chrome.tabs.query({
      currentWindow: true
    }, tabs => tabs.forEach(tab => reload(tab.id, {
      bypassCache: true
    })));
  }
  else if (info.menuItemId === 'reload.now') {
    reload(tab.id, {
      bypassCache: true
    });
  }
  else if (info.menuItemId === 'restore') {
    restore();
  }
  else if (info.menuItemId === 'no.reload') {
    if (storage[tab.id] && storage[tab.id].status) {
      enable({}, tab);
    }
  }
  else if (info.menuItemId.startsWith('reload.')) {
    if (storage[tab.id] && storage[tab.id].status) {
      enable({}, tab);
    }
    const [hh, mm, ss] = info.menuItemId.replace('reload.', '').split('.').map(s => Number(s));
    enable({
      dd: 0,
      hh,
      mm,
      ss,
      current: prefs['context.active'],
      cache: prefs['context.cache'],
      form: false,
      forced: false,
      variation: 0
    }, tab);
  }
  else if (info.menuItemId.startsWith('context.')) {
    chrome.storage.local.set({
      [info.menuItemId]: info.checked
    });
  }
});

// init
chrome.alarms.clearAll(() => {
  chrome.storage.local.get(prefs, ps => {
    Object.assign(prefs, ps);
    app.button.color = ps.color;
    contextmenus();
  });
  window.setTimeout(restore, 3000);
});
// FAQs & Feedback
{
  const {onInstalled, setUninstallURL, getManifest} = chrome.runtime;
  const {name, version} = getManifest();
  const page = getManifest().homepage_url;
  onInstalled.addListener(({reason, previousVersion}) => {
    chrome.storage.local.get({
      'faqs': true,
      'last-update': 0
    }, prefs => {
      if (reason === 'install' || (prefs.faqs && reason === 'update')) {
        const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
        if (doUpdate && previousVersion !== version) {
          chrome.tabs.create({
            url: page + '?version=' + version +
              (previousVersion ? '&p=' + previousVersion : '') +
              '&type=' + reason,
            active: reason === 'install'
          });
          chrome.storage.local.set({'last-update': Date.now()});
        }
      }
    });
  });
  setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
}
