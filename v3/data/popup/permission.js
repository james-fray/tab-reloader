/* global tab, api */

// request permission
document.addEventListener('change', async e => {
  if (e.target.checked && e.target.dataset.permission === 'true') {
    const url = tab.url;

    try {
      if (tab.url.startsWith('http')) {
        let origin = url.replace(/^https*/, '*');
        try {
          origin = '*://' + (new URL(tab.url)).hostname + '/';
        }
        catch (e) {}

        const granted = await api.permissions.request({
          origins: [origin]
        });
        if (granted !== true) {
          throw Error('NOT_GRANTED');
        }
      }
      else {
        const granted = await api.permissions.request({
          origins: [url]
        });
        if (granted !== true) {
          throw Error('NOT_GRANTED');
        }
      }
    }
    catch (ee) {
      console.error(ee);
      setTimeout(() => e.target.checked = false, 500);
    }
  }
});
