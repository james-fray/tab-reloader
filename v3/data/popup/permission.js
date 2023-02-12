/* global tab, api */

// request permission
document.addEventListener('change', e => {
  if (e.target.checked && e.target.dataset.permission === 'true') {
    const url = tab.url;

    if (tab.url.startsWith('http')) {
      let origin = url.replace(/^https*/, '*');
      try {
        origin = '*://' + (new URL(tab.url)).hostname + '/';
      }
      catch (e) {}

      api.permissions.request({
        origins: [origin]
      }).then(granted => {
        if (granted === false) {
          setTimeout(() => e.target.checked = false, 500);
        }
      });
    }
    else {
      setTimeout(() => e.target.checked = false, 500);
    }
  }
});
