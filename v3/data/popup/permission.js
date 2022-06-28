/* global tab, api */

// request permission
document.addEventListener('change', e => {
  if (e.target.checked && e.target.dataset.permission === 'true') {
    const url = tab.url;
    console.log(url, url.replace(/^https*/, '*'));

    if (tab.url.startsWith('http')) {
      api.permissions.request({
        origins: [url.replace(/^https*/, '*')]
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
