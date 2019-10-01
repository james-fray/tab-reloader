'use strict';

const prefs = {
  'dd': 0,
  'hh': 0,
  'mm': 5,
  'ss': 0
};

const dom = {
  get enable() {
    return document.querySelector('[data-type=enable]');
  },
  set enable(val) {
    const tmp = document.querySelector('[data-type=enable]');
    tmp.textContent = val ? 'Enabled' : 'Disabled';
    tmp.setAttribute('class', 'icon-toggle-' + (val ? 'on' : 'off'));
    document.body.dataset.enabled = val;
  },
  get current() {
    return document.querySelector('[data-type=current]').classList.contains('icon-toggle-on');
  },
  set current(val) {
    const tmp = document.querySelector('[data-type=current]');
    tmp.textContent = val ? 'Enabled' : 'Disabled';
    tmp.setAttribute('class', 'icon-toggle-' + (val ? 'on' : 'off'));
  },
  get cache() {
    return document.querySelector('[data-type=cache]').classList.contains('icon-toggle-on');
  },
  set cache(val) {
    const tmp = document.querySelector('[data-type=cache]');
    tmp.textContent = val ? 'Enabled' : 'Disabled';
    tmp.setAttribute('class', 'icon-toggle-' + (val ? 'on' : 'off'));
  },
  get form() {
    return document.querySelector('[data-type=form]').classList.contains('icon-toggle-on');
  },
  set form(val) {
    const tmp = document.querySelector('[data-type=form]');
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
  }
};
let id;
let tab;

function check() {
  window.clearInterval(id);
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
    dom.cache = obj.cache;
    dom.form = obj.form;
    if (!obj.status) {
      id = window.clearInterval(id);
    }
    else if (!id) {
      check();
    }
    Object.assign(dom, {
      dd: isNaN(obj.dd) ? prefs.dd : obj.dd,
      hh: isNaN(obj.hh) ? prefs.hh : obj.hh,
      mm: isNaN(obj.mm) ? prefs.mm : obj.mm,
      ss: isNaN(obj.ss) ? prefs.ss : obj.ss,
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
        current: dom.current,
        forced: e.shiftKey, // forced period
        cache: dom.cache,
        form: dom.form
      }
    });
  }
  else if (type === 'current') {
    dom.current = !dom.current;
  }
  else if (type === 'cache') {
    dom.cache = !dom.cache;
  }
  else if (type === 'form') {
    dom.form = !dom.form;
  }
});

document.addEventListener('change', ({target}) => {
  const value = Number(target.value);
  const min = Number(target.min);
  const max = Number(target.max);
  target.value = Math.max(min, Math.min(max, value));
});

// init
chrome.storage.local.get(prefs, ps => {
  Object.assign(prefs, ps);

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
});
