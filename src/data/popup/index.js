'use strict';

const prefs = {
  'dd': 0,
  'hh': 0,
  'mm': 5,
  'ss': 0,
  'pp-current': false,
  'pp-cache': false,
  'pp-form': false,
  'pp-offline': false,
  'pp-scroll-to-end': false,

  'presets': [{
    hh: 0,
    mm: 0,
    ss: 30
  }, {
    hh: 0,
    mm: 5,
    ss: 0
  }, {
    hh: 0,
    mm: 15,
    ss: 0
  }, {
    hh: 0,
    mm: 30,
    ss: 0
  }, {
    hh: 1,
    mm: 0,
    ss: 0
  }, {
    hh: 5,
    mm: 0,
    ss: 0
  }]
};

// detect FF's overflow menu
if (document.documentElement.clientWidth < 500) {
  document.body.classList.add('ffo');
}

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
  get offline() {
    return document.querySelector('[data-type=offline]').classList.contains('icon-toggle-on');
  },
  set offline(val) {
    const tmp = document.querySelector('[data-type=offline]');
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
  get ste() { // scroll-to-end
    return document.querySelector('[data-type=scoll-to-end]').classList.contains('icon-toggle-on');
  },
  set ste(val) {
    const tmp = document.querySelector('[data-type=scoll-to-end]');
    tmp.textContent = val ? 'Enabled' : 'Disabled';
    tmp.setAttribute('class', 'icon-toggle-' + (val ? 'on' : 'off'));
  },
  get code() {
    return document.querySelector('textarea').value;
  },
  set code(val) {
    document.querySelector('textarea').value = val || '';
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
  set jobs(jobs) { // jshint ignore:line
    document.body.dataset.jobs = document.querySelector('[data-type=jobs]').textContent =
      jobs.length;
    const ol = document.querySelector('#jobs ol');
    for (const job of jobs) {
      const li = document.createElement('li');
      li.textContent = job.title;
      li.dataset.id = job.id;
      ol.appendChild(li);
    }
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

    if ('current' in obj) {
      dom.current = obj.current;
    }
    if ('offline' in obj) {
      dom.offline = obj.offline;
    }
    if ('cache' in obj) {
      dom.cache = obj.cache;
    }
    if ('form' in obj) {
      dom.form = obj.form;
    }
    if ('code' in obj) {
      dom.code = obj.code;
    }
    if ('ste' in obj) {
      dom.ste = obj.ste;
    }
    if ('variation' in obj) {
      dom.vr = obj.variation || 0;
    }
    if ('jobs' in obj) {
      dom.jobs = obj.jobs;
    }

    dom.enable = obj.status;
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
      ss: isNaN(obj.ss) ? prefs.ss : obj.ss
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
        offline: dom.offline,
        forced: e.shiftKey, // forced period
        cache: dom.cache,
        form: dom.form,
        code: dom.code,
        ste: dom.ste
      }
    });
  }
  else if (type === 'current') {
    dom.current = !dom.current;
  }
  else if (type === 'offline') {
    dom.offline = !dom.offline;
  }
  else if (type === 'cache') {
    dom.cache = !dom.cache;
  }
  else if (type === 'form') {
    dom.form = !dom.form;
  }
  else if (type === 'scoll-to-end') {
    if (dom.ste === false) {
      chrome.permissions.request({
        origins: [tab.url]
      }, granted => {
        if (granted) {
          dom.ste = true;
        }
        else {
          dom.ste = false;
        }
      });
    }
    else {
      dom.ste = false;
    }
  }
});

document.addEventListener('change', ({target}) => {
  if (target.type === 'number') {
    const value = Number(target.value);
    const min = Number(target.min);
    const max = Number(target.max);
    target.value = Math.max(min, Math.min(max, value));
  }
});

// permit
{
  const input = document.getElementById('permit');
  const textarea = document.querySelector('textarea');

  const check = () => {
    const next = granted => {
      input.disabled = granted;
      textarea.disabled = granted === false;
    };
    try {
      chrome.permissions.contains({
        origins: [tab.url]
      }, granted => {
        next(chrome.runtime.lastError ? false : granted);
      });
    }
    catch (e) {
      next(false);
    }
  };

  input.check = check;
  input.addEventListener('click', () => {
    chrome.permissions.request({
      origins: [tab.url]
    }, granted => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        alert('Code Execution Denied:\n\n' + lastError.message);
      }
      if (granted) {
        check();
      }
    });
  });
}

// init
chrome.storage.local.get(prefs, ps => {
  Object.assign(prefs, ps);

  dom.current = prefs['pp-current'];
  dom.cache = prefs['pp-cache'];
  dom.form = prefs['pp-form'];
  dom.offline = prefs['pp-offline'];
  dom.ste = prefs['pp-scroll-to-end'];

  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, tabs => {
    if (tabs && tabs.length) {
      tab = tabs[0];
      chrome.runtime.sendMessage({
        method: 'request-update',
        id: tab.id,
        extra: true
      });
      check();
      document.getElementById('permit').check();
    }
  });

  for (const preset of prefs.presets.slice(0, 6)) {
    const span = document.createElement('span');
    span.dataset.hh = preset.hh;
    span.dataset.mm = preset.mm;
    span.dataset.ss = preset.ss;

    span.textContent = preset.hh.toString().padStart(2, '0') + ':' + preset.mm.toString().padStart(2, '0') + ':' +
      preset.ss.toString().padStart(2, '0');

    document.querySelector('.presets').appendChild(span);
  }
});

// jobs
document.querySelector('#jobs ol').addEventListener('click', e => {
  const id = e.target.dataset.id;
  if (id) {
    chrome.tabs.update(Number(id), {
      active: true
    });
    chrome.tabs.get(Number(id), tab => chrome.windows.update(tab.windowId, {
      focused: true
    }));
  }
});

// presets
document.addEventListener('click', e => {
  const {hh, mm, ss} = e.target.dataset;
  if (ss) {
    dom.hh = hh;
    dom.mm = mm;
    dom.ss = ss;
  }
});

document.addEventListener('DOMContentLoaded', () => {
  for (const a of [...document.querySelectorAll('[data-href]')]) {
    if (a.hasAttribute('href') === false) {
      a.href = chrome.runtime.getManifest().homepage_url + '#' + a.dataset.href;
    }
  }
});
