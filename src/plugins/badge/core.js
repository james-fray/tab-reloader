/* global log, timeout, storage */

const _f = timeout.set;
const _s = timeout.stop;
let t;

const clean = () => {
  const count = Object.values(storage).filter(o => o.status).length;
  for (const [id, o] of Object.entries(storage)) {
    if (o.status !== true) {
      const tabId = Number(id);
      chrome.browserAction.setBadgeText({
        tabId,
        text: count ? String(count) : ''
      });
    }
  }
};

chrome.alarms.onAlarm.addListener(o => {
  if (o.name === 'badge-updates') {
    log('badge plugin alarm is fired');
    const now = Date.now();

    clean();
    for (const [id, o] of Object.entries(storage)) {
      if (o.status !== true) {
        continue;
      }
      const tabId = Number(id);
      // left in minutes
      const left = Math.round((o.vperiod - (now - o.time)) / 1000 / 60);
      if (left < 60) {
        chrome.browserAction.setBadgeText({
          tabId,
          text: left + 'm'
        });
      }
      else if (left < 24 * 60) {
        chrome.browserAction.setBadgeText({
          tabId,
          text: Math.ceil(left / 60) + 'h'
        });
      }
      else {
        chrome.browserAction.setBadgeText({
          tabId,
          text: Math.round(left / 60 / 24) + 'd'
        });
      }
    }
  }
});
const check = () => {
  if (Object.values(storage).some(o => o.status)) {
    log('badge plugin alarm is set to one minute');
    chrome.alarms.create('badge-updates', {
      when: Date.now(),
      periodInMinutes: 1
    });
  }
  else {
    log('badge plugin alarm is removed');
    chrome.alarms.clear('badge-updates');
    clean();
  }
};

function enable() {
  console.log('badge plugin is enabled');

  timeout.set = function(...args) {
    clearTimeout(t);
    t = setTimeout(check, 1000);
    return _f.apply(this, args);
  };
  timeout.stop = function(...args) {
    clearTimeout(t);
    t = setTimeout(check, 1000);
    return _s.apply(this, args);
  };
  check();
}
function disable() {
  log('badge plugin is disabled');
  timeout.set = _f;
  timeout.stop = _s;
  chrome.alarms.clear('badge-updates');
  const count = Object.values(storage).filter(o => o.status).length;
  for (const [id, o] of Object.entries(storage)) {
    if (o.status) {
      chrome.browserAction.setBadgeText({
        tabId: Number(id),
        text: String(count)
      });
    }
  }
}

export {
  enable,
  disable
};
