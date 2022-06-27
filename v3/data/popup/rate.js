chrome.storage.local.get({
  'rate': true,
  'crate': 0
}, prefs => {
  document.getElementById('rate').dataset.hide = prefs['rate'] === false || prefs.crate < 5 || Math.random() < 0.5;

  if (prefs.crate < 5) {
    prefs.crate += 1;
    chrome.storage.local.set({crate: prefs.crate});
  }
});

document.getElementById('rate').onclick = () => {
  let url = 'https://chrome.google.com/webstore/detail/tab-reloader/dejobinhdiimklegodgbmbifijpppopn/reviews/';
  if (/Edg/.test(navigator.userAgent)) {
    url = 'https://microsoftedge.microsoft.com/addons/detail/amclpbiglkmdhodbgnchnkmfdghnabik';
  }
  else if (/Firefox/.test(navigator.userAgent)) {
    url = 'https://addons.mozilla.org/firefox/addon/tab-reloader/reviews/';
  }
  else if (/OPR/.test(navigator.userAgent)) {
    url = 'https://addons.opera.com/extensions/details/tab-reloader/';
  }

  chrome.storage.local.set({
    'rate': false
  }, () => chrome.tabs.create({
    url
  }));
};
