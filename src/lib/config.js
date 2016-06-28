'use strict';

var app = app || require('./firefox/firefox');
var config = config || exports;

config.session = {
  store: function (obj) {
    let session = app.storage.read('session') || '[]';
    session = JSON.parse(session);
    session = session.filter(o => o.url !== obj.url);
    session.push(obj);
    session = session.filter(o => !(o.url.startsWith('chrome://') || o.url.startsWith('resource://') || o.url.startsWith('about:')));
    // do not save more than 20 entries
    session = session.slice(-20);
    app.storage.write('session', JSON.stringify(session));
  },
  restore: () => JSON.parse(app.storage.read('session') || '[]')
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
