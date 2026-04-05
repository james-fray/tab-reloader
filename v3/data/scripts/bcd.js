// display timer on badge
{
  let timer;
  const once = () => chrome.runtime.sendMessage({
    method: 'get-timer'
  }).then(o => {
    let badge = '';
    let next = 1;
    if (o) {
      let remaining = (o.scheduledTime - Date.now()) / 1000;
      if (remaining < 0) {
        remaining = 0;
        badge = '↻';
        next = 1;
      }
      else {
        if (remaining >= 86400) {
          // days
          badge = Math.round(remaining / 86400) + 'd';
          next = remaining % 43200 || 43200;
        }
        else if (remaining >= 3600) {
          // hours
          badge = Math.round(remaining / 3600) + 'h';
          next = remaining % 1800 || 1800;
        }
        else if (remaining >= 60) {
          // minutes
          badge = Math.round(remaining / 60) + 'm';
          next = remaining % 30 || 30;
        }
        else {
          // seconds
          badge = Math.round(remaining) + 's';
          next = 1;
        }
      }
    }
    clearTimeout(timer);
    if (badge) {
      chrome.runtime.sendMessage({
        method: 'set-badge',
        content: badge
      });
    }
    console.log(next, badge);
    timer = setTimeout(once, next * 1000);
  });
  if (document.visibilityState !== 'hidden') {
    once();
  }

  const visibilitychange = () => {
    if (document.visibilityState === 'hidden') {
      clearTimeout(timer);
    }
    else {
      once();
    }
  };

  addEventListener('visibilitychange', visibilitychange);

  const observe = request => {
    if (request.method === 'kill-counter') {
      clearTimeout(timer);
      removeEventListener('visibilitychange', visibilitychange);
      chrome.runtime.sendMessage({
        method: 'set-badge',
        content: '×'
      });
      chrome.runtime.onMessage.removeListener(observe);
    }
    else if (request.method === 'popup-opened') {
      once();
    }
  };
  chrome.runtime.onMessage.addListener(observe);
}
