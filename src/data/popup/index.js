/* globals load, unload, background */
'use strict';

var dom = {
  get enable () {
    return document.querySelector('[data-type=enable]');
  },
  set enable (val) {
    var tmp = document.querySelector('[data-type=enable]');
    tmp.textContent = val ? 'Enabled' : 'Disabled';
    tmp.setAttribute('class', 'icon-toggle-' + (val ? 'on' : 'off'));
  },
  get current () {
    return document.querySelector('[data-type=current]').classList.contains('icon-toggle-on');
  },
  set current (val) {
    var tmp = document.querySelector('[data-type=current]');
    tmp.textContent = val ? 'Enabled' : 'Disabled';
    tmp.setAttribute('class', 'icon-toggle-' + (val ? 'on' : 'off'));
  },
  get dd () {
    return document.querySelector('[data-type=dd]').value;
  },
  set dd (val) {
    document.querySelector('[data-type=dd]').value = val;
  },
  get hh () {
    return document.querySelector('[data-type=hh]').value;
  },
  set hh (val) {
    document.querySelector('[data-type=hh]').value = val;
  },
  get mm () {
    return document.querySelector('[data-type=mm]').value;
  },
  set mm (val) {
    document.querySelector('[data-type=mm]').value = val;
  },
  get ss () {
    return document.querySelector('[data-type=ss]').value;
  },
  set ss (val) {
    document.querySelector('[data-type=ss]').value = val;
  },
  get vr () {
    return document.querySelector('[data-type=vr]').value;
  },
  set vr (val) {
    document.querySelector('[data-type=vr]').value = val;
  },
  set msg (val) { // jshint ignore:line
    document.querySelector('[data-type=msg]').textContent = val;
  },
  set jobs (val) { // jshint ignore:line
    document.querySelector('[data-type=jobs]').textContent = val;
  },
};
var id;

function uncheck () {
  if (id) {
    window.clearInterval(id);
    id = '';
  }
}
function check() {
  uncheck();
  id = window.setInterval(function () {
    background.send('update');
  }, 1000);
}

background.receive('update', function (obj) {
  dom.enable = obj.status;
  dom.current = obj.current;
  if (!obj.status) {
    uncheck();
  }
  else if (!id) {
    check();
  }
  dom.dd = obj.dd || 0;
  dom.hh = obj.hh || 0;
  dom.mm = obj.mm || 5;
  dom.ss = obj.ss || 0;
  dom.vr = obj.variation || 0;
  dom.msg = obj.msg;
  dom.jobs = obj.jobs || 0;
});

document.addEventListener('click', function (e) {
  let target = e.target;
  let type = target.dataset.type;
  if (type === 'enable') {
    background.send('enable', {
      dd: dom.dd,
      hh: dom.hh,
      mm: dom.mm,
      ss: dom.ss,
      variation: +dom.vr,
      current: dom.current
    });
  }
  else if (type === 'current') {
    dom.current = !dom.current;
  }
});

document.addEventListener('change', function (e) {
  var value = +e.target.value;
  var min = +e.target.min;
  var max = +e.target.max;
  e.target.value = Math.max(min, Math.min(max, value));
});

load(check);
load(function () {
  background.send('update');
});
unload(uncheck);
