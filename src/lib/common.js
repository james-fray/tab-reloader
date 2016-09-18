'use strict';

var app = app || require('./firefox/firefox');
var config = config || require('./config');

var storage = {};

var toSecond  = obj => Math.max(10000, obj.dd * 1000 * 60 * 60 * 24 + obj.hh * 1000 * 60 * 60 + obj.mm * 1000 * 60 + obj.ss * 1000);
var twoDigit  = num => ('00' + num).substr(-2);
var session  = obj => config.session.store(obj);

Object.values = Object.values || function (obj) {
  let tmp = [];
  for (let n in obj) {
    tmp.push(obj[n]);
  }
  return tmp;
};

app.button.color = '#797979';

function count () {
  let num = Object.values(storage).reduce((p, c) => p + (c.status ? 1 : 0), 0);
  app.button.badge = num ? num : '';
  return num;
}

function repeat (obj) {
  function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
  }

  let period = obj.period;
  if (obj.variation) {
    period = getRandomInt(period * (100 - obj.variation) / 100, period * (100 + obj.variation) / 100);
    period = Math.max(period, 7000);
  }
  obj.vperiod = period;
  obj.id  = app.timer.setTimeout(obj.callback, period);
}
app.tab.onRefresh(function (tab) {
  let id = tab.id;
  if (!storage[id] || !storage[id].status) {
    return;
  }
  app.timer.clearTimeout(storage[id].id);
  storage[id].time = (new Date()).getTime();
  repeat(storage[id]);
});

app.popup.receive('update', function () {
  app.tab.active().then(function (tab) {
    if (!tab) {
      return;
    }
    let id = tab.id;
    storage[id] = storage[id] || {};
    let time = storage[id].time, dd, hh, mm, ss;
    if (time && storage[id].status) {
      let period = storage[id].vperiod || toSecond(storage[id]);
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
  });
});

function enable (obj, _tab) {
  app.Promise.resolve(_tab || app.tab.active()).then(function (tab) {
    let id = tab.id;
    storage[id] = storage[id] || {};
    storage[id].id = app.timer.clearTimeout(storage[id].id);
    storage[id].status = !storage[id].status;
    storage[id].current = obj.current;
    storage[id].variation = obj.variation;
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
        storage[id].time = (new Date()).getTime();
        if (tab && tab.id) {
          if (storage[id].current) {
            app.tab.active().then(function (t) {
              if (!t || tab.id !== t.id) {
                app.tab.reload(tab);
              }
              else {
                repeat(storage[id]);
              }
            });
          }
          else {
            app.tab.reload(tab);
          }
        }
        else {
          app.timer.clearTimeout(storage[id].id);
          delete storage[id];
        }
      };
      repeat(storage[id]);
    }
    storage[id].jobs = count();
    app.popup.send('update', storage[id]);
    if (!_tab) {
      session({
        url: tab.url,
        status: storage[id].status,
        current: obj.current,
        variation: obj.variation,
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
  let entries = config.session.restore();
  app.tab.array().then(tabs => tabs.forEach(function (tab) {
    if (!storage[tab.id]) { // only restore if tab has not already been activated manually
      let entry = entries.filter(e => e.url === tab.url);
      if (entry.length) {
        entry = entry[0];
        if (entry.status) {
          enable(Object.assign(entry.period, {
            current: entry.current || false,
            variation: entry.variation || 0
          }), tab);
        }
        else {
          storage[tab.id] = {
            dd: entry.period.dd,
            hh: entry.period.hh,
            mm: entry.period.mm,
            ss: entry.period.ss,
            current: entry.current || false,
            variation: entry.variation || 0
          };
        }
      }
    }
  }))
  // update status of the current tab
  .then(app.tab.active)
  .then(tab => app.button.mode = (tab ? storage[tab.id] || {} : {}).status);
}
app.timer.setTimeout(restore, 6000);

app.tab.onActivate(tab => app.button.mode = (storage[tab.id] || {}).status);
app.tab.onClose(function (tab) {
  if (storage[tab.id] && storage[tab.id].id) {
    app.timer.clearTimeout(storage[tab.id].id);
    delete storage[tab.id];
    count();
  }
  app.tab.active().then(tab => app.button.mode = (storage[tab.id] || {}).status);
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
