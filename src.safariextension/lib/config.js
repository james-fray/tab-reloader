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
  get intPref () {
    return +app.storage.read('intPref') || 10;  // default value is 10
  },
  set intPref (val) {
    val = +val;
    if (val < 5) {
      val = 5;
    }
    app.storage.write('intPref', val);
  },
  get bolPref () {
    return app.storage.read('bolPref') === 'false' ? false : true; // default is true
  },
  set bolPref (val) {
    app.storage.write('bolPref', val);
  },
  get strPref () {
    return app.storage.read('strPref') || 'default string';
  },
  set strPref (val) {
    app.storage.write('strPref', val);
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
