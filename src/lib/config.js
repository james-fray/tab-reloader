'use strict';

var isFirefox = typeof require !== 'undefined', config;
if (isFirefox) {
  var app = require('./firefox/firefox');
  var os = require('sdk/system').platform;
  config = exports;
}
else {
  config = {};
}

config.options = {

};

config.session = {
  store: function (obj) {
    let session = app.storage.read('session') || '[]';
    session = JSON.parse(session);
    session = session.filter(o => o.url !== obj.url);
    session.push(obj);
    // do not save more than 20 entries
    session = session.slice(-20);
    app.storage.write('session', JSON.stringify(session));
  },
  restore: function () {
    let session = app.storage.read('session') || '[]';
    return JSON.parse(session);
  }
};

config.welcome = {
  get version () {
    return app.storage.read('version');
  },
  set version (val) {
    app.storage.write('version', val);
  },
  timeout: 3,
  get show () {
    return app.storage.read('show') === 'false' ? false : true; // default is true
  },
  set show (val) {
    app.storage.write('show', val);
  }
};
// Complex get and set
config.get = function (name) {
  return name.split('.').reduce(function (p, c) {
    return p[c];
  }, config);
};
config.set = function (name, value) {
  function set(name, value, scope) {
    name = name.split('.');
    if (name.length > 1) {
      set.call((scope || this)[name.shift()], name.join('.'), value)
    }
    else {
      this[name[0]] = value;
    }
  }
  set(name, value, config);
};
