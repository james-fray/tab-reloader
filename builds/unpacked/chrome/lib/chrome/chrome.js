/* globals webkitNotifications*/
'use strict';

var app = new EventEmitter();
app.globals = {
  browser: navigator.userAgent.indexOf('OPR') === -1 ? 'chrome' : 'opera'
};

app.once('load', function () {
  var script = document.createElement('script');
  document.body.appendChild(script);
  script.src = '../common.js';
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

app.EventEmitter = EventEmitter;

app.storage = (function () {
  var objs = {};
  chrome.storage.local.get(null, function (o) {
    objs = o;
    app.emit('load');
  });
  return {
    read: function (id) {
      return (objs[id] || !isNaN(objs[id])) ? objs[id] + '' : objs[id];
    },
    write: function (id, data) {
      objs[id] = data;
      var tmp = {};
      tmp[id] = data;
      chrome.storage.local.set(tmp, function () {});
    }
  };
})();

app.button = (function () {
  var onCommand;
  chrome.browserAction.onClicked.addListener(function () {
    if (onCommand) {
      onCommand();
    }
  });
  return {
    onCommand: function (c) {
      onCommand = c;
    },
    set mode (val) {
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
  send: function (id, data) {
    chrome.extension.sendRequest({method: id, data: data});
  },
  receive: function (id, callback) {
    chrome.extension.onRequest.addListener(function (request, sender) {
      if (request.method === id && !sender.tab) {
        callback(request.data);
      }
    });
  }
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
    var d = app.Promise.defer();
    chrome.tabs.query({
      currentWindow: false
    }, function (tabs) {
      d.resolve(tabs);
    });
    return d.promise;
  },
  active: function () {
    var d = app.Promise.defer();
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, function (tabs) {
      d.resolve(tabs[0]);
    });
    return d.promise;
  },
  reload: function (tab) {
    chrome.tabs.reload(tab.id);
  },
  array: function () {
    var d = app.Promise.defer();
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
  onRefresh: function (c) {
    chrome.tabs.onUpdated.addListener(function (id, changeInfo) {
      if (changeInfo.status === 'loading') {
        c({id: id});
      }
    });
  },
  onClose: function (c) {
    chrome.tabs.onRemoved.addListener(function (id) {
      c({id: id});
    });
  }
};

app.version = function () {
  return chrome[chrome.runtime && chrome.runtime.getManifest ? 'runtime' : 'extension'].getManifest().version;
};

app.timer = window;

app.options = {
  send: function (id, data) {
    chrome.tabs.query({}, function (tabs) {
      tabs.forEach(function (tab) {
        if (tab.url.indexOf(chrome.extension.getURL('data/options/index.html') === 0)) {
          chrome.tabs.sendMessage(tab.id, {method: id, data: data}, function () {});
        }
      });
    });
  },
  receive: function (id, callback) {
    chrome.runtime.onMessage.addListener(function (message, sender) {
      if (
        message.method === id &&
        sender.tab &&
        sender.tab.url.indexOf(chrome.extension.getURL('data/options/index.html') === 0)
      ) {
        callback.call(sender.tab, message.data);
      }
    });
  }
};
