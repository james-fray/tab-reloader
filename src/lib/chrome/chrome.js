'use strict';

var app = {};

app.callbacks = {};
app.on = (id, callback) => {
  app.callbacks[id] = app.callbacks[id] || [];
  app.callbacks[id].push(callback);
};
app.emit = (id, data) => {
  (app.callbacks[id] || []).forEach(c => c(data));
};

app.on('load', function () {
  var script = document.createElement('script');
  document.body.appendChild(script);
  script.src = './lib/common.js';
});

Object.values = Object.values || function (obj) {
  return Object.keys(obj).map(n => obj[n]);
};

app.storage = (function () {
  let objs = {};
  chrome.storage.local.get(null, function (o) {
    objs = o;
    app.emit('load');
  });
  return {
    read: id => objs[id],
    write: function (id, data) {
      objs[id] = data;
      let tmp = {};
      tmp[id] = data;
      chrome.storage.local.set(tmp);
    }
  };
})();

app.button = {
  set mode (val) {  //jshint ignore:line
    var path = 'icons/' + (val ? '' : 'disabled/');
    chrome.browserAction.setIcon({
      path: {
        '16': './data/' + path + '16.png',
        '18': './data/' + path + '18.png',
        '19': './data/' + path + '19.png',
        '32': './data/' + path + '32.png',
        '36': './data/' + path + '36.png',
        '38': './data/' + path + '38.png'
      }
    });
    console.error({
      path: {
        '16': './data/' + path + '16.png',
        '18': './data/' + path + '18.png',
        '19': './data/' + path + '19.png',
        '32': './data/' + path + '32.png',
        '36': './data/' + path + '36.png',
        '38': './data/' + path + '38.png'
      }
    });
  },
  set label (label) { // jshint ignore: line
    chrome.browserAction.setTitle({
      title: label
    });
  },
  set badge (val) { // jshint ignore: line
    chrome.browserAction.setBadgeText({
      text: (val ? val : '') + ''
    });
  },
  set color (val) { // jshint ignore: line
    chrome.browserAction.setBadgeBackgroundColor({
      color: val
    });
  }
};

app.popup = {
  send: (method, data) => chrome.runtime.sendMessage({method, data}),
  receive: (id, callback) => chrome.runtime.onMessage.addListener(function (request) {
    if (request.method === id) {
      callback(request.data);
    }
  })
};

app.tab = {
  open: (url) => chrome.tabs.create({url}),
  list: () => new Promise ((resolve) => {
    chrome.tabs.query({
      currentWindow: false
    }, (tabs) => resolve(tabs));
  }),
  active: () => new Promise((resolve) => {
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, (tabs) => resolve(tabs[0]));
  }),
  reload: (tab) => chrome.tabs.reload(tab.id),
  array: () => new Promise((resolve) => {
    chrome.tabs.query({}, (tabs) => resolve(tabs));
  }),
  onActivate: function (c) {
    chrome.tabs.onActivated.addListener(function (obj) {
      c({id: obj.tabId});
    });
    chrome.windows.onFocusChanged.addListener(function () {
      app.tab.active().then(function (tab) {
        if (tab) {
          c({id: tab.id});
        }
      });
    });
  },
  onRefresh: (c) => chrome.tabs.onUpdated.addListener(function (id, changeInfo) {
    if (changeInfo.status === 'loading') {
      c({id});
    }
  }),
  onClose: (c) => chrome.tabs.onRemoved.addListener((id) => c({id}))
};

app.version = () => chrome.runtime.getManifest().version;

app.startup = (function () {
  let loadReason, callback;
  function check () {
    if (loadReason === 'startup' || loadReason === 'install') {
      if (callback) {
        callback();
      }
    }
  }
  if (chrome.runtime.onInstalled && chrome.runtime.onStartup) {
    chrome.runtime.onInstalled.addListener(function (details) {
      loadReason = details.reason;
      check();
    });
    chrome.runtime.onStartup.addListener(function () {
      loadReason = 'startup';
      check();
    });
  }
  else {
    loadReason = 'startup';
    check();
  }
  return function (c) {
    callback = c;
    check();
  };
})();
