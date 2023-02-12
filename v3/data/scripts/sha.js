{
  // session storage
  const {href} = location;

  let e = document.body;
  try {
    e = document.querySelector(
      localStorage.getItem('tab-reloader-element-' + href) ||
      localStorage.getItem('tab-reloader-element')
    ) || e;
  }
  catch (e) {}

  console.info('Tab Reloader', 'Calculating hash of', e);

  // crypto.subtle is not available on http
  const content = e.innerText || '';

  chrome.runtime.sendMessage({
    method: 'sha256',
    message: content
  }, hash => {
    if (hash) { // Firefox sometimes does not return valid hash
      const oh = sessionStorage.getItem('tab-reloader-hash-' + href);

      if (hash && oh && oh !== hash) {
        if (window.switch) {
          chrome.runtime.sendMessage({
            method: 'activate-tab'
          });
        }
        const src = localStorage.getItem('tab-reloader-sound-' + href) ||
          localStorage.getItem('tab-reloader-sound') ||
          window.src;

        if (src) {
          const volume = Number(
            localStorage.getItem('tab-reloader-volume-' + href) ||
            localStorage.getItem('tab-reloader-volume')
          ) || 1;

          chrome.runtime.sendMessage({
            method: 'play-sound',
            src,
            volume
          });
        }
      }

      console.info('Tab Reloader', 'Hash is', hash);
      sessionStorage.setItem('tab-reloader-hash-' + href, hash);
    }
    else {
      console.warn('cannot calculate hash', hash);
    }
  });
}
