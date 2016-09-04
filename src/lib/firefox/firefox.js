'use strict';

// Load Firefox based resources
var self = require('sdk/self'),
    data = self.data,
    sp = require('sdk/simple-prefs'),
    prefs = sp.prefs,
    tabs = require('sdk/tabs'),
    windows = require('sdk/windows'),
    timers = require('sdk/timers'),
    {ToggleButton} = require('sdk/ui/button/toggle'),
    {on, off, once, emit} = require('sdk/event/core'),
    {resolve} = require('sdk/core/promise');

// Promise
exports.Promise = {resolve};

// Event Emitter
exports.on = on.bind(null, exports);
exports.once = once.bind(null, exports);
exports.emit = emit.bind(null, exports);
exports.removeListener = function removeListener (type, listener) {
  off(exports, type, listener);
};

//toolbar button
exports.button = (function () {
  let button = new ToggleButton({
    id: self.name,
    label: 'Tab Reloader',
    icon: {
      '18': './icons/disabled/18.png',
      '36': './icons/disabled/36.png'
    },
    onChange: function(state) {
      if (state.checked) {
        exports.popup._obj.show({
          width: 412,
          height: 280,
          position: button
        });
      }
    }
  });
  return {
    _obj: button,
    onCommand: function () {},
    set label (val) { // jshint ignore:line
      button.label = val;
    },
    set mode (val) { // jshint ignore:line
      let path = './icons/' + (val ? '' : 'disabled/');
      button.icon = {
        '16': path + '16.png',
        '18': path + '18.png',
        '32': path + '32.png',
        '36': path + '36.png',
        '64': path + '64.png'
      };
    },
    set badge (val) { // jshint ignore:line
      button.badge = val ? val : '';
    },
    set color (val) { // jshint ignore:line
      button.badgeColor = val;
    }
  };
})();

exports.storage = {
  read: id => prefs[id],
  write: (id, data) => prefs[id] = data
};

exports.popup = (function () {
  var popup = require('sdk/panel').Panel({
    contentURL: data.url('./popup/index.html'),
    contentScriptFile: [data.url('./popup/firefox/firefox.js'), data.url('./popup/index.js')],
  });
  popup.on('show', () => popup.port.emit('show'));
  popup.on('hide', () => {
    for (let window of windows.browserWindows) {
      exports.button._obj.state(window, {checked: false});
    }
    popup.port.emit('hide');
  });

  return {
    _obj: popup,
    send: function (id, data) {
      popup.port.emit(id, data);
    },
    receive: function (id, callback) {
      popup.port.on(id, callback);
    }
  };
})();

exports.tab = {
  open: function (url, inBackground, inCurrent) {
    if (inCurrent) {
      tabs.activeTab.url = url;
    }
    else {
      tabs.open({
        url: url,
        inBackground: typeof inBackground === 'undefined' ? false : inBackground
      });
    }
  },
  list: function () {
    let temp = [];
    for each (var tab in tabs) {
      temp.push(tab);
    }
    return resolve(temp);
  },
  array: () => exports.tab.list(),
  active: () => resolve(tabs.activeTab),
  reload: (tab) => tab.reload(),
  onActivate: (c) => tabs.on('activate', c),
  onRefresh: (c) => tabs.on('ready', c),
  onClose: (c) => tabs.on('close', c)
};

exports.version = () => self.version;

exports.timer = timers;

exports.startup = function (callback) {
  if (self.loadReason === 'install' || self.loadReason === 'startup') {
    callback();
  }
};
