'use strict';

var dom = {
  get enable() {
    return document.querySelector('[data-type=enable]');
  },
  set enable(val) {
    var tmp = document.querySelector('[data-type=enable]');
    tmp.textContent = val ? 'Enabled' : 'Disabled';
    tmp.setAttribute('class', 'icon-toggle-' + (val ? 'on' : 'off'));
    document.body.dataset.enabled = val;
  },
  get current() {
    return document.querySelector('[data-type=current]').classList.contains('icon-toggle-on');
  },
  set current(val) {
    var tmp = document.querySelector('[data-type=current]');
    tmp.textContent = val ? 'Enabled' : 'Disabled';
    tmp.setAttribute('class', 'icon-toggle-' + (val ? 'on' : 'off'));
  },
  get dd() {
    return document.querySelector('[data-type=dd]').value;
  },
  set dd(val) {
    document.querySelector('[data-type=dd]').value = val;
  },
  get hh() {
    return document.querySelector('[data-type=hh]').value;
  },
  set hh(val) {
    document.querySelector('[data-type=hh]').value = val;
  },
  get mm() {
    return document.querySelector('[data-type=mm]').value;
  },
  set mm(val) {
    document.querySelector('[data-type=mm]').value = val;
  },
  get ss() {
    return document.querySelector('[data-type=ss]').value;
  },
  set ss(val) {
    document.querySelector('[data-type=ss]').value = val;
  },
  get vr() {
    return document.querySelector('[data-type=vr]').value;
  },
  set vr(val) {
    document.querySelector('[data-type=vr]').value = val;
  },
  set msg(val) { // jshint ignore:line
    document.querySelector('[data-type=msg]').textContent = val;
  },
  set jobs(val) { // jshint ignore:line
    document.querySelector('[data-type=jobs]').textContent = val;
  },
};
var id;
var tab;

function check() {
  window.clearInterval(id);
  console.log('request update');
  id = window.setInterval(() => chrome.runtime.sendMessage({
    method: 'request-update',
    id: tab.id
  }), 1000);
}

chrome.runtime.onMessage.addListener(request => {
  const twoDigit = num => ('00' + num).substr(-2);
  if (request.method === 'updated-info') {
    const obj = request.data;
    dom.enable = obj.status;
    dom.current = obj.current;
    if (!obj.status) {
      id = window.clearInterval(id);
    }
    else if (!id) {
      check();
    }
    Object.assign(dom, {
      dd: obj.dd || 0,
      hh: obj.hh || 0,
      mm: obj.mm || 5,
      ss: obj.ss || 0,
      vr: obj.variation || 0,
      jobs: obj.jobs || 0
    });

    if (obj.status) {
      const {dd = 0, hh = 0, mm = 5, ss = 0} = obj.msg;
      dom.msg = `Time left to refresh: ${twoDigit(dd)} : ${twoDigit(hh)} : ${twoDigit(mm)} : ${twoDigit(ss)}`;
    }
    else {
      dom.msg = 'Tab Reloader is disabled on this tab';
    }
  }
});

document.addEventListener('click', e => {
  const target = e.target;
  const type = target.dataset.type;
  if (type === 'enable') {
    chrome.runtime.sendMessage({
      method: 'enable',
      tab,
      data: {
        dd: dom.dd,
        hh: dom.hh,
        mm: dom.mm,
        ss: dom.ss,
        variation: Number(dom.vr),
        current: dom.current
      }
    });
  }
  else if (type === 'current') {
    dom.current = !dom.current;
  }
});

document.addEventListener('change', ({target}) => {
  const value = Number(target.value);
  const min = Number(target.min);
  const max = Number(target.max);
  target.value = Math.max(min, Math.min(max, value));
});

// init
chrome.tabs.query({
  active: true,
  currentWindow: true
}, tabs => {
  if (tabs && tabs.length) {
    tab = tabs[0];
    chrome.runtime.sendMessage({
      method: 'request-update',
      id: tab.id
    });
    check();
  }
});
