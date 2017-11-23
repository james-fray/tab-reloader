/* globals app */
'use strict';

var storage = {};

var toSecond = obj => Math.max(
  obj.forced ? 1000 : 10000, // allow reloading up to a second!
  obj.dd * 1000 * 60 * 60 * 24 + obj.hh * 1000 * 60 * 60 + obj.mm * 1000 * 60 + obj.ss * 1000
);
var session = obj => {
  chrome.storage.local.get({
    session: []
  }, prefs => {
    let session = Array.isArray(prefs.session) ? prefs.session : [];
    // remove the old jobs for this session
    session = session.filter(o => o.url !== obj.url);
    session.push(obj);
    session = session.filter(o => o.url.startsWith('http') || o.url.startsWith('ftp') || o.url.startsWith('file'));
    session = session.slice(-20);
    console.log(session);
    chrome.storage.local.set({session});
  });
};

Object.values = Object.values || function(obj) {
  const tmp = [];
  for (const n in obj) {
    tmp.push(obj[n]);
  }
  return tmp;
};

app.button.color = '#797979';

function count() {
  const num = Object.values(storage).reduce((p, c) => p + (c.status ? 1 : 0), 0);
  app.button.badge = num ? num : '';
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
  window.clearTimeout(obj.id);
  obj.id = window.setTimeout(obj.callback, period);
}
chrome.webNavigation.onDOMContentLoaded.addListener(d => {
  if (d.frameId === 0) {
    const id = d.tabId;
    if (!storage[id] || !storage[id].status) {
      return;
    }
    storage[id].time = (new Date()).getTime();
    app.button.icon(storage[id].status, id);
    repeat(storage[id]);
  }
});

function enable(obj, tab) {
  const id = tab.id;
  storage[id] = storage[id] || {};
  Object.assign(storage[id], obj, {
    id: window.clearTimeout(storage[id].id),
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
              chrome.tabs.reload(tab.id, {
                bypassCache: storage[id].cache !== true
              });
            }
          }
          else {
            chrome.tabs.reload(tab.id, {
              bypassCache: storage[id].cache !== true
            });
          }
          // repeat although this might get overwritten after reload.
          repeat(storage[id]);
        }
        else {
          window.clearTimeout(storage[id].id);
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
  if (request.method === 'enable') {
    enable(request.data, request.tab);
  }
  else if (request.method === 'request-update') {
    const id = request.id;
    storage[id] = storage[id] || {};
    const time = storage[id].time;
    let dd, hh, mm, ss;
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
    window.clearTimeout(storage[id].id);
    delete storage[id];
    count();
  }
});

// restore
window.setTimeout(() => {
  chrome.storage.local.get({
    session: [],
    json: []
  }, prefs => {
    if (Array.isArray(prefs.session)) {
      const entries = prefs.session;
      chrome.tabs.query({
        url: '<all_urls>'
      }, tabs => {
        // automatic jobs
        tabs.forEach(tab => {
          const {hostname} = new URL(tab.url);
          const entry = prefs.json.filter(j => j.hostname === hostname).pop();
          if (entry) {
            enable(Object.assign({
              period: {
                dd: 0,
                hh: 0,
                mm: 5,
                ss: 0
              },
              current: false,
              cache: false,
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
  });
}, 3000);

// FAQs & Feedback
chrome.storage.local.get({
  'version': null,
  'faqs': navigator.userAgent.indexOf('Firefox') === -1
}, prefs => {
  const version = chrome.runtime.getManifest().version;

  if (prefs.version ? (prefs.faqs && prefs.version !== version) : true) {
    chrome.storage.local.set({version}, () => {
      chrome.tabs.create({
        url: 'http://add0n.com/tab-reloader.html?version=' + version +
          '&type=' + (prefs.version ? ('upgrade&p=' + prefs.version) : 'install')
      });
    });
  }
});

{
  const {name, version} = chrome.runtime.getManifest();
  chrome.runtime.setUninstallURL('http://add0n.com/feedback.html?name=' + name + '&version=' + version);
}
