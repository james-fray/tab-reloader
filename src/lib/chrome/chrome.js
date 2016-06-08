'use strict';

var app = new EventEmitter();

app.once('load', function () {
  var script = document.createElement('script');
  document.body.appendChild(script);
  script.src = './lib/common.js';
});

if (!Promise.defer) {
  Promise.defer = function () {
    let deferred = {};
    let promise = new Promise(function (resolve, reject) {
      deferred.resolve = resolve;
      deferred.reject  = reject;
    });
    deferred.promise = promise;
    return deferred;
  };
}
app.Promise = Promise;

Object.values = Object.values || function (obj) {
  return Object.keys(obj).map(n => obj[n]);
};

app.EventEmitter = EventEmitter;

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
      chrome.storage.local.set(tmp, function () {});
    }
  };
})();

app.button = (function () {
  let onCommand;
  chrome.browserAction.onClicked.addListener(function () {
    if (onCommand) {
      onCommand();
    }
  });
  return {
    onCommand: function (c) {
      onCommand = c;
    },
    set mode (val) {  //jshint ignore:line
      var path = './icons/' + (val ? '' : 'disabled/');
      chrome.browserAction.setIcon({
        path: {
          '19': '../../data/' + path + '/19.png',
          '38': '../../data/' + path + '/38.png'
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
    }
  };
})();

app.popup = {
  send: (id, data) => chrome.extension.sendRequest({method: id, data: data}),
  receive: (id, callback) => chrome.extension.onRequest.addListener(function (request, sender) {
    if (request.method === id && !sender.tab) {
      callback(request.data);
    }
  })
};

app.tab = {
  open: function (url, inBackground, inCurrent) {
    if (inCurrent) {
      chrome.tabs.update(null, {url: url});
    }
    else {
      chrome.tabs.create({
        url: url,
        active: typeof inBackground === 'undefined' ? true : !inBackground
      });
    }
  },
  list: function () {
    let d = app.Promise.defer();
    chrome.tabs.query({
      currentWindow: false
    }, function (tabs) {
      d.resolve(tabs);
    });
    return d.promise;
  },
  active: function () {
    let d = app.Promise.defer();
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, function (tabs) {
      d.resolve(tabs[0]);
    });
    return d.promise;
  },
  reload: (tab) => chrome.tabs.reload(tab.id),
  array: function () {
    let d = app.Promise.defer();
    chrome.tabs.query({}, function (tabs) {
      d.resolve(tabs);
    });
    return d.promise;
  },
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

app.version = function () {
  return chrome[chrome.runtime && chrome.runtime.getManifest ? 'runtime' : 'extension'].getManifest().version;
};

app.timer = window;

app.startup = (function () {
  let loadReason, callback;
  function check () {
    if (loadReason === 'startup' || loadReason === 'install') {
      if (callback) {
        callback();
      }
    }
  }
  chrome.runtime.onInstalled.addListener(function (details) {
    loadReason = details.reason;
    check();
  });
  chrome.runtime.onStartup.addListener(function () {
    loadReason = 'startup';
    check();
  });
  return function (c) {
    callback = c;
    check();
  };
})();
