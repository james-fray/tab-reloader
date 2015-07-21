'use strict';

// Load Firefox based resources
var self          = require('sdk/self'),
    data          = self.data,
    sp            = require('sdk/simple-prefs'),
    buttons       = require('sdk/ui/button/action'),
    prefs         = sp.prefs,
    pageMod       = require('sdk/page-mod'),
    tabs          = require('sdk/tabs'),
    timers        = require('sdk/timers'),
    loader        = require('@loader/options'),
    array         = require('sdk/util/array'),
    unload        = require('sdk/system/unload'),
    {on, off, once, emit} = require('sdk/event/core'),
    {Cu}  = require('chrome');

Cu.import('resource://gre/modules/Promise.jsm');

exports.globals = {
  browser: 'firefox'
};

// Promise
exports.Promise = Promise;

// Event Emitter
exports.on = on.bind(null, exports);
exports.once = once.bind(null, exports);
exports.emit = emit.bind(null, exports);
exports.removeListener = function removeListener (type, listener) {
  off(exports, type, listener);
};

//toolbar button
exports.button = (function () {
  var button = buttons.ActionButton({
    id: self.name,
    label: 'Tab Reloader',
    icon: {
      '16': './icons/disabled/16.png',
      '18': './icons/disabled/18.png',
      '32': './icons/disabled/32.png',
      '36': './icons/disabled/36.png',
      '64': './icons/disabled/64.png'
    },
    onClick: function() {
      exports.popup._obj.show({
        width: 412,
        height: 280,
        position: button
      });
    }
  });
  return {
    onCommand: function () {},
    set label (val) {
      button.label = val;
    },
    set mode (val) {
      var path = './icons/' + (val ? '' : 'disabled/');
      button.icon = {
        '16': path + '16.png',
        '18': path + '18.png',
        '32': path + '32.png',
        '36': path + '36.png',
        '64': path + '64.png'
      };
    },
    set badge (val) {
      button.badge = val ? val : '';
    }
  };
})();

exports.storage = {
  read: function (id) {
    return (prefs[id] || prefs[id] + '' === 'false' || !isNaN(prefs[id])) ? (prefs[id] + '') : null;
  },
  write: function (id, data) {
    data = data + '';
    if (data === 'true' || data === 'false') {
      prefs[id] = data === 'true' ? true : false;
    }
    else if (parseInt(data) + '' === data) {
      prefs[id] = parseInt(data);
    }
    else {
      prefs[id] = data + '';
    }
  }
};

exports.popup = (function () {
  var popup = require('sdk/panel').Panel({
    contentURL: data.url('./popup/index.html'),
    contentScriptFile: [data.url('./popup/firefox/firefox.js'), data.url('./popup/index.js')],
  });
  popup.on('show', () => popup.port.emit('show'));
  popup.on('hide', () => popup.port.emit('hide'));
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
    var temp = [];
    for each (var tab in tabs) {
      temp.push(tab);
    }
    return Promise.resolve(temp);
  },
  active: function () {
    return new Promise(function (resolve) {
      resolve(tabs.activeTab);
    });
  },
  reload: function (tab) {
    tab.reload();
  },
  onActivate: function (c) {
    tabs.on('activate', c);
  },
  onClose: function (c) {
    tabs.on('close', c);
  }
};

exports.version = function () {
  return self.version;
};

exports.timer = timers;

exports.options = (function () {
  var workers = [], options_arr = [];
  pageMod.PageMod({
    include: data.url('options/index.html'),
    contentScriptFile: [data.url('options/firefox/firefox.js'), data.url('options/index.js')],
    contentScriptWhen: 'ready',
    contentScriptOptions: {
      base: loader.prefixURI + loader.name + '/'
    },
    onAttach: function(worker) {
      array.add(workers, worker);
      worker.on('pageshow', function() { array.add(workers, this); });
      worker.on('pagehide', function() { array.remove(workers, this); });
      worker.on('detach', function() { array.remove(workers, this); });

      options_arr.forEach(function (arr) {
        worker.port.on(arr[0], arr[1]);
      });
    }
  });
  sp.on('openOptions', function() {
    exports.tab.open(data.url('options/index.html'));
  });
  unload.when(function () {
    exports.tab.list().then(function (tabs) {
      tabs.forEach(function (tab) {
        if (tab.url === data.url('options/index.html')) {
          tab.close();
        }
      });
    });
  });

  return {
    send: function (id, data) {
      workers.forEach(function (worker) {
        if (!worker || !worker.url) {
          return;
        }
        worker.port.emit(id, data);
      });
    },
    receive: (id, callback) => options_arr.push([id, callback])
  };
})();
