{
  const remove = () => {
    for (const e of document.querySelectorAll('.sadh6Hjii')) {
      e.remove();
    }
  };
  remove();

  const style = (c = () => {}) => chrome.storage.local.get({
    'counter-position': 'top: 10px; right: 10px;',
    'counter-size': 'width: 200px; height: 100px;'
  }, prefs => {
    iframe.style = `
      position: fixed;
      ${prefs['counter-position']},
      ${prefs['counter-size']},
      border: none;
      color-scheme: light;
      z-index: calc(Infinity);
      border: none;
    `;
    c(prefs);
  });

  const iframe = document.createElement('iframe');
  iframe.classList.add('sadh6Hjii');

  style(prefs => {
    const v =
      (prefs['counter-position'].includes('top') ? 't' : 'b') +
      (prefs['counter-position'].includes('left') ? 'l' : 'r');

    const args = new URLSearchParams();
    args.set('tabId', self.tabId);
    args.set('period', self.period);
    args.set('position', v);
    iframe.src = chrome.runtime.getURL('/data/counter/index.html') + '?' + args.toString();

    document.documentElement.append(iframe);
  });

  const position = prefs => {
    if (prefs['counter-position']) {
      style();
    }
  };
  const observe = request => {
    if (request.method === 'kill-counter') {
      remove();
      chrome.runtime.onMessage.removeListener(observe);
      chrome.storage.onChanged.removeListener(position);
    }
  };
  chrome.runtime.onMessage.addListener(observe);
  chrome.storage.onChanged.addListener(position);
}

