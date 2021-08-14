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
  'history.timeout': 5000,
  'context.active': false,
  'context.cache': false,
  'dynamic.json': false,
  'policy': {},
  'use-native': true,
  'log': false,
  'active': 'single' // single or multiple; single means only focused active tab
};

const tabContextMenusInfo = [
  { title: 'Don\'t reload', id: 'no.reload', dd: 0, hh: 0, mm: 0, ss: 0 },
  { title: 'Every 10 secs', id: 'reload.0.0.10', dd: 0, hh: 0, mm: 0, ss: 10 },
  { title: 'Every 30 secs', id: 'reload.0.0.30', dd: 0, hh: 0, mm: 0, ss: 30 },
  { title: 'Every minute',  id: 'reload.0.1.0', dd: 0, hh: 0, mm: 1, ss: 0 },
  { title: 'Every 5 minutes', id: 'reload.0.5.0', dd: 0, hh: 0, mm: 5, ss: 0 },
  { title: 'Every 15 minutes', id: 'reload.0.15.0', dd: 0, hh: 0, mm: 15, ss: 0 },
  { title: 'Every hour', id: 'reload.1.0.0', dd: 0, hh: 1, mm: 0, ss: 0 },
];

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

const log = (...args) => prefs.log && console.log(...args);

const storage = {};

const toSecond = obj => Math.max(
  obj.forced ? 1000 : 10000, // allow reloading up to a second!
  obj.dd * 1000 * 60 * 60 * 24 + obj.hh * 1000 * 60 * 60 + obj.mm * 1000 * 60 + obj.ss * 1000
);
const session = (obj, store = true) => {
  if (prefs.history === false || store === false) {
    log('session storing is skipped', obj);
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

function toPopup(id, extra) {
  const obj = storage[id];
  const data = {
    method: 'updated-info',
    data: {
      status: obj.status,
      dd: obj.dd,
      hh: obj.hh,
      mm: obj.mm,
      ss: obj.ss,
      msg: obj.msg
    }
  };
  if (extra) {
    Object.assign(data.data, {
      variation: obj.variation,
      current: obj.current,
      cache: obj.cache,
      form: obj.form,
      code: obj.code,
      ste: obj.ste,
      jobs: Object.entries(storage).filter(([id, o]) => o.status).map(([id, o]) => ({
        title: o['_title'],
        id
      }))
    });
  }
  chrome.runtime.sendMessage(data, () => chrome.runtime.lastError);
}

/* due to having variation, the timeout id might change between number and string based on what the previous call is */
const timeout = {};
timeout.set = (id = '', period, callback) => {
  window.clearTimeout(id);
  if (typeof id === 'string') {
    chrome.alarms.clear(id, () => {});
  }
  delete timeout.cache[id];
  if (period < 2 * 60 * 1000 || prefs['use-native'] === false) {
    log('use setTimeout', id, period);
    return window.setTimeout(callback, period);
  }
  else {
    id = 'timer-' + Math.random();
    log('use chrome.alarms', id, period);
    timeout.cache[id] = callback;
    chrome.alarms.create(id, {
      when: Date.now() + period
    });
    return id; // in case the id is the number from previous timeout call
  }
};
timeout.stop = id => {
  window.clearTimeout(id);
  if (timeout.cache[id]) {
    log('clearing a native', id);
    chrome.alarms.clear(id, () => {});
  }
};
timeout.cache = {};
chrome.alarms.onAlarm.addListener(({name}) => {
  if (timeout.cache[name]) {
    timeout.cache[name]();
  }
});

function repeat(obj, delay = 0) {
  function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
  }

  let period = Math.max(1, obj.period + delay);
  if (obj.variation) {
    period = getRandomInt(period * (100 - obj.variation) / 100, period * (100 + obj.variation) / 100);
    period = Math.max(period, 7000);
  }
  obj.vperiod = period;
  obj.id = timeout.set(obj.id, period, obj.callback);
}

const onDOMContentLoaded = d => {
  if (d.frameId === 0) {
    const id = d.tabId;
    if (!storage[id] || !storage[id].status) {
      if (prefs['dynamic.json']) {
        const {hostname} = new URL(d.url);
        const entry = prefs.json.filter(j => j.hostname ? match(hostname, j.hostname) : j.url === d.url).pop();
        if (entry) {
          enable(Object.assign({
            dd: 0,
            hh: 0,
            mm: 5,
            ss: 0,
            current: false,
            cache: false,
            form: false,
            code: '',
            forced: false,
            variation: 0
          }, entry), {id, url: d.url}, true, 'repeat');
        }
      }
      return;
    }
    storage[id].time = Date.now();
    app.button.icon(storage[id].status, id);
    repeat(storage[id]);
    if (storage[id].ste) {
      chrome.tabs.executeScript(id, {
        code: `{
          const ste = () => {
            window.stop();
            const e = (document.scrollingElement || document.body);
            e.scrollTop = e.scrollHeight;
          }
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', ste);
          }
          else {
            ste();
          }
        }`
      });
    }
    // the user passes this custom script to get executed after each reload
    if (storage[id].code) {
      chrome.tabs.executeScript(id, {
        code: `
          chrome.runtime.sendMessage({
            method: 'get-user-code',
            id: ${id}
          }, code => {
            const script = document.createElement('script');
            script.textContent = code;
            document.documentElement.appendChild(script);
            script.addEventListener('toggle-requested', () => chrome.runtime.sendMessage({
              method: 'toggle-requested',
              id: ${id}
            }));
            script.addEventListener('play-sound', e => chrome.runtime.sendMessage({
              method: 'play-sound',
              id: ${id},
              src: e.detail
            }));
            script.addEventListener('activate-tab', e => chrome.runtime.sendMessage({
              method: 'activate-tab',
              id: ${id}
            }));
            script.addEventListener('delay-for', e => chrome.runtime.sendMessage({
              method: 'delay-for',
              delay: Number(e.detail),
              id: ${id}
            }));
            script.remove();
          });
        `
      });
    }
  }
};
chrome.webNavigation.onDOMContentLoaded.addListener(onDOMContentLoaded);

function reload(tabId, obj) {
  chrome.tabs.get(tabId, tab => {
    // policy check
    const {hostname} = new URL(tab.url);
    const entry = Object.entries(prefs.policy).filter(([h]) => match(hostname, h)).map(a => a[1]).pop();
    if (entry) {
      const skip = () => window.setTimeout(() => onDOMContentLoaded({
        frameId: 0,
        tabId: tab.id,
        url: tab.url
      }), 100);
      try {
        if (entry && entry.url) {
          const a = new RegExp(entry.url);
          if (a.test(tab.url) === false) {
            log('reloading job is skipped due to URL policy violation');
            return skip();
          }
        }
        if (entry && entry.date) {
          const a = new RegExp(entry.date);
          if (a.test((new Date()).toLocaleString()) === false) {
            log('reloading job is skipped due to DATE policy violation');
            return skip();
          }
        }
      }
      catch (e) {
        console.warning('policy checking failed', e);
      }
    }
    if (obj.form) {
      chrome.tabs.update(tabId, {
        url: tab.url.split('#')[0].split('?')[0]
      });
    }
    else {
      chrome.tabs.reload(tabId, {
        bypassCache: obj.cache !== true
      });
    }
  });
}

function markCorrespondingTimeTabContextMenu(data) {
  for(let tabContextMenuInfo of tabContextMenusInfo) {
    chrome.contextMenus.update(tabContextMenuInfo.id, { checked: false });
  }

  const info = (!data.status) ? tabContextMenusInfo[0] :
                  tabContextMenusInfo.find(i => i.dd === +(data.dd) && i.hh === +(data.hh) && 
                                                i.mm === +(data.mm) && i.ss === +(data.ss));

  if (info) {
    chrome.contextMenus.update(info.id, { checked: true });
  }  
}

function enable(obj, tab, store = true, origin) {
  const id = tab.id;
  storage[id] = storage[id] || {};
  Object.assign(storage[id], obj, {
    'id': timeout.stop(storage[id].id),
    'status': !storage[id].status,
    'time': Date.now(),
    'msg': '',
    '_title': tab.title,
    origin
  });

  app.button.icon(storage[id].status, id);

  markCorrespondingTimeTabContextMenu(storage[id]);

  if (storage[id].status) {
    storage[id].period = toSecond(obj);
    storage[id].callback = (function(id) {
      storage[id].time = Date.now();


      chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        chrome.tabs.get(id, tab => {
          if (tab) {
            if (storage[id].current) {
              if (!tab.active || (tab.active && prefs['active'] === 'single' && tabs.length && tab.id !== tabs[0].id)) {
                reload(tab.id, storage[id]);
              }
            }
            else {
              reload(tab.id, storage[id]);
            }
            storage[id]['_title'] = tab.title;
            // repeat although this might get overwritten after reload.
            repeat(storage[id]);
          }
          else {
            timeout.stop(storage[id].id);
            delete storage[id];
          }
        });
      });
    }).bind(this, tab.id);
    repeat(storage[id]);
  }
  count();
  toPopup(id);
  session({
    url: tab.url,
    status: storage[id].status,
    current: obj.current,
    cache: obj.cache,
    form: obj.form,
    code: obj.code,
    ste: obj.ste,
    variation: obj.variation,
    forced: obj.forced,
    period: {
      dd: obj.dd,
      hh: obj.hh,
      mm: obj.mm,
      ss: obj.ss
    }
  }, store);
}
chrome.runtime.onMessage.addListener((request, sender, response) => {
  if (request.method === 'count') {
    count();
  }
  else if (request.method === 'enable') {
    enable(request.data, request.tab, true, 'manual');
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
      let diff = period - (Date.now() - time);
      diff -= 5 * period;
      // make sure we display positive number to the user
      if (diff < 0) {
        diff = (diff % period) + period;
      }
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
    toPopup(id, request.extra);
  }
  else if (request.method === 'get-user-code') {
    response(storage[request.id].code);
    return true;
  }
  else if (request.method === 'toggle-requested') {
    enable(storage[request.id], sender.tab, true, 'manual');
  }
  else if (request.method === 'play-sound') {
    const a = new Audio(request.src);
    a.play();
  }
  else if (request.method === 'activate-tab') {
    chrome.tabs.update(sender.tab.id, {
      active: true
    });
    chrome.windows.update(sender.tab.windowId, {
      focused: true
    });
  }
  else if (request.method === 'delay-for') {
    const o = storage[request.id];
    repeat(o, request.delay);
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
        const entry = prefs.json.filter(j => j.hostname ? match(hostname, j.hostname) : j.url === tab.url).pop();

        if (entry) {
          enable(Object.assign({
            dd: 0,
            hh: 0,
            mm: 5,
            ss: 0,
            current: false,
            cache: false,
            form: false,
            code: '',
            forced: false,
            ste: false,
            variation: 0
          }, entry), tab, false, 'auto.job');
        }
      });
      // session jobs
      tabs.forEach(tab => {
        if (!storage[tab.id] || !('dd' in storage[tab.id])) { // only restore if tab has not already been activated manually
          let entry = entries.filter(e => e.url === tab.url);
          if (entry.length) {
            entry = entry[0];
            if (entry.status) {
              enable(Object.assign(entry.period, {
                'current': entry.current || false,
                'cache': entry.cache || false,
                'form': entry.form || false,
                'code': entry.code || '',
                'ste': entry.ste || false,
                'forced': entry.forced || false,
                'variation': entry.variation || 0,
                '_title': tab.title
              }), tab, false, 'restore');
            }
            else {
              storage[tab.id] = {
                'dd': entry.period.dd,
                'hh': entry.period.hh,
                'mm': entry.period.mm,
                'ss': entry.period.ss,
                'current': entry.current || false,
                'cache': entry.cache || false,
                'form': entry.form || false,
                'code': entry.code || '',
                'ste': entry.ste || false,
                'forced': entry.forced || false,
                'variation': entry.variation || 0,
                '_title': tab.title
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
  title: 'Reload tabs',
  id: 'reload',
  contexts: ['browser_action']
});
chrome.contextMenus.create({
  title: 'All tabs',
  id: 'reload.all',
  contexts: ['browser_action'],
  parentId: 'reload'
});
chrome.contextMenus.create({
  title: 'All tabs in the current window',
  id: 'reload.window',
  contexts: ['browser_action'],
  parentId: 'reload'
});
chrome.contextMenus.create({
  title: 'Toggle active reloading jobs',
  id: 'toggle',
  contexts: ['browser_action']
});
chrome.contextMenus.create({
  title: 'Stop all',
  id: 'stop.all',
  contexts: ['browser_action'],
  parentId: 'toggle'
});
chrome.contextMenus.create({
  title: 'Resume all',
  id: 'resume.all',
  contexts: ['browser_action'],
  parentId: 'toggle'
});
chrome.contextMenus.create({
  title: 'Resume previously active jobs',
  id: 'resume.all.cond',
  contexts: ['browser_action'],
  parentId: 'toggle'
});
chrome.contextMenus.create({
  contexts: ['browser_action'],
  type: 'separator'
});
chrome.contextMenus.create({
  title: 'Restore old reloading jobs',
  id: 'restore',
  contexts: ['browser_action']
});
const contextmenus = () => {
  if ('TAB' in chrome.contextMenus.ContextType) {
    
    for(let info of tabContextMenusInfo) {
      chrome.contextMenus.create({ title: info.title, id: info.id, contexts: ['tab'], type: 'checkbox' });
    }

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
      enable({}, tab, true, 'manual');
    }
  }
  else if (info.menuItemId.startsWith('reload.')) {
    if (storage[tab.id] && storage[tab.id].status) {
      enable({}, tab, true, 'manual');
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
      code: '',
      forced: false,
      variation: 0
    }, tab, true, 'manual');
  }
  else if (info.menuItemId.startsWith('context.')) {
    chrome.storage.local.set({
      [info.menuItemId]: info.checked
    });
  }
  else if (info.menuItemId === 'stop.all') {
    const entries = Object.entries(storage).filter(([id, o]) => o.status);
    entries.forEach(async (e, i) => {
      const [id, o] = e;
      await new Promise(resolve => chrome.tabs.get(Number(id), tab => {
        if (i === entries.length - 1) {
          prefs.session.forEach(o => o.status = false);
          enable(o, tab, true, 'batch');
        }
        else {
          enable(o, tab, false, 'batch');
        }
        resolve();
      }));
    });
  }
  else if (info.menuItemId === 'resume.all' || info.menuItemId === 'resume.all.cond') {
    const entries = Object.entries(storage)
      .filter(([id, o]) => o.status !== true)
      .filter(([id, o]) => {
        if (info.menuItemId === 'resume.all.cond') {
          return ['batch', 'auto.job', 'restore'].indexOf(o.origin) !== -1;
        }
        return true;
      });
    const urls = [];
    entries.forEach(async (e, i) => {
      const [id, o] = e;
      await new Promise(resolve => chrome.tabs.get(Number(id), tab => {
        if (i === entries.length - 1) {
          prefs.session.forEach(o => {
            if (urls.indexOf(o.url) !== -1) {
              o.status = true;
            }
          });
          enable(o, tab, true, 'batch');
        }
        else {
          urls.push(tab.url);
          enable(o, tab, false, 'batch');
        }
        resolve();
      }));
    });
  }
});

// init
window.addEventListener('DOMContentLoaded', () => {
  chrome.alarms.clearAll(() => chrome.storage.local.get(prefs, ps => {
    Object.assign(prefs, ps);
    app.button.color = ps.color;
    contextmenus();
    window.setTimeout(restore, prefs['history.timeout']);
  }));
});

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
