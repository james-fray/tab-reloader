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

Object.values = Object.values || function(obj) {
  return Object.keys(obj).map(n => obj[n]);
};

app.storage = (function() {
  let objs = {};
  chrome.storage.local.get(null, function(o) {
    objs = o;
    app.emit('load');
  });
  return {
    read: id => objs[id],
    write: function(id, data) {
      objs[id] = data;
      chrome.storage.local.set({
        [id]: data
      });
    }
  };
})();

app.button = {
  icon: (mode, tabId) => {
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
  set label(label) { // jshint ignore: line
    chrome.browserAction.setTitle({
      title: label
    });
  },
  set badge(val) { // jshint ignore: line
    chrome.browserAction.setBadgeText({
      text: String(val ? val : '')
    });
  },
  set color(val) { // jshint ignore: line
    chrome.browserAction.setBadgeBackgroundColor({
      color: val
    });
  }
};
