/* global api */

const args = new URLSearchParams(location.search);

const tabId = args.get('tabId');
const period = args.get('period');

const remaining = (o, p) => {
  let remaining = (o.scheduledTime - Date.now()) / 1000;

  if (remaining < 0 && p) {
    const period = api.convert.secods(
      api.convert.str2obj(p)
    );
    while (period > 0 && remaining < 0) {
      remaining += period;
    }
  }
  //
  if (remaining < 0) {
    remaining = 0;
  }

  const v = api.convert.sec2obj(remaining);
  return api.convert.obj2str(v);
};

// display timer
let timer;
const once = () => api.alarms.get(tabId).then(o => {
  if (o) {
    const v = remaining(o, period);
    document.getElementById('cbc').textContent = v;
  }

  clearTimeout(timer);
  timer = setTimeout(once, 1000);
});
once();

addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    clearTimeout(timer);
  }
  else {
    once();
  }
});

document.getElementById(args.get('position')).checked = true;

addEventListener('change', e => {
  if (e.target.id === 'tl') {
    chrome.storage.local.set({
      'counter-position': 'top: 10px; left: 10px;'
    });
  }
  else if (e.target.id === 'tr') {
    chrome.storage.local.set({
      'counter-position': 'top: 10px; right: 10px;'
    });
  }
  else if (e.target.id === 'bl') {
    chrome.storage.local.set({
      'counter-position': 'bottom: 10px; left: 10px;'
    });
  }
  else if (e.target.id === 'br') {
    chrome.storage.local.set({
      'counter-position': 'bottom: 10px; right: 10px;'
    });
  }
});
