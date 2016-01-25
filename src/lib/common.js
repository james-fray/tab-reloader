'use strict';

/**** wrapper (start) ****/
if (typeof require !== 'undefined') {
  var app = require('./firefox/firefox');
  var config = require('./config');
}
/**** wrapper (end) ****/

/* options */
app.options.receive('changed', function (o) {
  config.set(o.pref, o.value);
  app.options.send('set', {
    pref: o.pref,
    value: config.get(o.pref)
  });
});
app.options.receive('get', function (pref) {
  app.options.send('set', {
    pref: pref,
    value: config.get(pref)
  });
});
app.options.receive('info', function () {
  app.options.send('info', {
    title: 'title',
    inshort: 'in short ...'
  });
});
/* popup */
app.popup.receive('resize', function () {
  app.popup.send('resize', {
    width: config.popup.width,
    height: config.popup.height
  });
});
/* welcome page */
(function () {
  var version = config.welcome.version;
  if (app.version() !== version) {
    app.timer.setTimeout(function () {
      app.tab.open(
        'http://add0n.com/tab-reloader.html?v=' + app.version() +
        (version ? '&p=' + version + '&type=upgrade' : '&type=install')
      );
      config.welcome.version = app.version();
    }, config.welcome.timeout);
  }
})();
/* */
var storage = {};

function toSecond (obj) {
  return Math.max(10000, obj.dd * 1000 * 60 * 60 * 24 + obj.hh * 1000 * 60 * 60 + obj.mm * 1000 * 60 + obj.ss * 1000);
}
function twoDigit (num) {
  return ('00' + num).substr(-2);
}
function count () {
  var num = 0;
  for (var o in storage) {
    if (storage[o].status) {
      num += 1;
    }
  }
  app.button.badge = num ? num : '';
  return num;
}

app.popup.receive('update', function () {
  app.tab.active().then(function (tab) {
    if (!tab) {
      return;
    }
    var id = tab.id;
    storage[id] = storage[id] || {};
    var time = storage[id].time, dd, hh, mm, ss;
    if (time && storage[id].status) {
      var period = toSecond(storage[id]);
      var diff = period - ((new Date()).getTime() - time);
      dd = Math.floor(diff / (1000 * 60 * 60) / 24);
      hh = Math.floor(diff / (1000 * 60 * 60) / 1) % 24;
      mm = Math.floor((diff / (60 * 1000)) % 60 % 24);
      ss = Math.floor(diff % (60 * 1000) / 1000);
      storage[id].msg = 'Time left to refresh: ' + twoDigit(dd) + ':' + twoDigit(hh) + ':' + twoDigit(mm) + ':' + twoDigit(ss);
    }
    else {
      storage[id].msg = 'Tab Reloader is disabled on this tab';
    }
    storage[id].jobs = count();
    app.popup.send('update', storage[tab.id]);
  });
});
app.popup.receive('enable', function (obj) {
  app.tab.active().then(function (tab) {
    var id = tab.id;
    if (storage[id].id) {
      app.timer.clearInterval(storage[id].id);
      storage[id].id = null;
    }
    storage[id] = storage[id] || {};
    storage[id].status = !storage[id].status;
    app.button.mode = storage[id].status;
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
  });
});

app.tab.onActivate(function (tab) {
  app.button.mode = (storage[tab.id] || {}).status;
});
app.tab.onRefresh(function (tab) {
  var id = tab.id;
  if (!storage[id] || !storage[id].id) {
    return;
  }
  var now = (new Date()).getTime();
  var diff = now - storage[id].time;
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
