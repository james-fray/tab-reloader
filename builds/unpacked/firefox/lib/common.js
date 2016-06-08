'use strict';

var app = app || require('./firefox/firefox');
var config = config || require('./config');

var storage = {};

var toSecond  = obj => Math.max(10000, obj.dd * 1000 * 60 * 60 * 24 + obj.hh * 1000 * 60 * 60 + obj.mm * 1000 * 60 + obj.ss * 1000);
var twoDigit  = num => ('00' + num).substr(-2);
var session  = obj => config.session.store(obj);

function count () {
  console.error('count is called');
  let num = Object.values(storage).reduce((p, c) => p + (c.status ? 1 : 0), 0);
  app.button.badge = num ? num : '';
  return num;
}

app.popup.receive('update', function () {
  console.error('updating');
  app.tab.active().then(function (tab) {
    if (!tab) {
      return;
    }
    let id = tab.id;
    storage[id] = storage[id] || {};
    let time = storage[id].time, dd, hh, mm, ss;
    if (time && storage[id].status) {
      let period = toSecond(storage[id]);
      let diff = period - ((new Date()).getTime() - time);
      dd = Math.floor(diff / (1000 * 60 * 60) / 24);
      diff = diff - dd * 24 * 60 * 60 * 1000;
      hh = Math.floor(diff / (1000 * 60 * 60));
      diff = diff - hh * 60 * 60 * 1000;
      mm = Math.floor(diff / (60 * 1000));
      ss = Math.floor(diff % (60 * 1000) / 1000);
      storage[id].msg = `Time left to refresh: ${twoDigit(dd)} : ${twoDigit(hh)} : ${twoDigit(mm)} : ${twoDigit(ss)}`;
    }
    else {
      storage[id].msg = 'Tab Reloader is disabled on this tab';
    }
    storage[id].jobs = count();
    app.popup.send('update', storage[tab.id]);
  }).catch (e => console.error(e));
});

function enable (obj, _tab) {
  console.error('enable is called');
  app.Promise.resolve(_tab || app.tab.active()).then(function (tab) {
    let id = tab.id;
    storage[id] = storage[id] || {};
    storage[id].id = app.timer.clearInterval(storage[id].id);
    storage[id].status = !storage[id].status;
    if (!_tab) {
      app.button.mode = storage[id].status;
    }
    storage[id].dd = obj.dd;
    storage[id].hh = obj.hh;
    storage[id].mm = obj.mm;
    storage[id].ss = obj.ss;
    storage[id].time = (new Date()).getTime();
    storage[id].msg = 'Tab Reloader is disabled on this tab';
    if (storage[id].status) {
      storage[id].period = toSecond(obj);
      storage[id].callback = function () {
        console.error('callback is called');
        storage[id].time = (new Date()).getTime();
        if (tab && tab.id) {
          app.tab.reload(tab);
        }
        else {
          app.timer.clearInterval(storage[id].id);
          delete storage[id];
        }
      };
      storage[id].id = app.timer.setInterval(storage[id].callback, storage[id].period);
    }
    storage[id].jobs = count();
    app.popup.send('update', storage[id]);
    if (!_tab) {
      session({
        url: tab.url,
        status: storage[id].status,
        period: {
          dd: obj.dd,
          hh: obj.hh,
          mm: obj.mm,
          ss: obj.ss
        }
      });
    }
  });
}
app.popup.receive('enable', enable);

function restore () {
  console.error('restore is called');
  let entries = config.session.restore();
  app.tab.array().then(tabs => tabs.forEach(function (tab) {
    let entry = entries.filter(e => e.url === tab.url);
    if (entry.length) {
      entry = entry[0];
      if (entry.status) {
        enable(entry.period, tab);
      }
      else {
        storage[tab.id] = {
          dd: entry.period.dd,
          hh: entry.period.hh,
          mm: entry.period.mm,
          ss: entry.period.ss
        };
      }
    }
  }))
  // update status of the current tab
  .then(app.tab.active)
  .then(tab => app.button.mode = (tab ? storage[tab.id] : {}).status);
}
app.timer.setTimeout(restore, 1000);

app.tab.onActivate(tab => app.button.mode = (storage[tab.id] || {}).status);
app.tab.onRefresh(function (tab) {
  let id = tab.id;
  if (!storage[id] || !storage[id].id) {
    return;
  }
  let now = (new Date()).getTime();
  let diff = now - storage[id].time;
  if (diff > 10 * 1000) {
    app.timer.clearInterval(storage[id].id);
    storage[id].time = now;
    storage[id].id = app.timer.setInterval(storage[id].callback, storage[id].period);
  }
});
app.tab.onClose(function (tab) {
  if (storage[tab.id] && storage[tab.id].id) {
    app.timer.clearInterval(storage[tab.id].id);
    delete storage[tab.id];
    count();
  }
  app.button.mode = (storage[tab.id] || {}).status;
});

/* welcome page */
app.startup(function () {
  let version = config.welcome.version;
  if (app.version() !== version) {
    app.timer.setTimeout(function () {
      app.tab.open(
        'http://add0n.com/tab-reloader.html?v=' + app.version() +
        (version ? '&p=' + version + '&type=upgrade' : '&type=install')
      );
      config.welcome.version = app.version();
    }, config.welcome.timeout);
  }
});
