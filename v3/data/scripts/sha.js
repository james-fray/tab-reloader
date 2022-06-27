{
  let e = document.body;
  try {
    e = document.querySelector(localStorage.getItem('tab-reloader-element')) || e;
  }
  catch (e) {}

  console.log('Calculating hash of', e, crypto.subtle);

  // crypto.subtle is not available on http
  chrome.runtime.sendMessage({
    method: 'sha256',
    message: e.innerText
  }, hash => {
    const oh = localStorage.getItem('tab-reloader-hash');

    if (oh && oh !== hash) {
      if (window.switch) {
        chrome.runtime.sendMessage({
          method: 'activate-tab'
        });
      }
      if (window.src) {
        chrome.runtime.sendMessage({
          method: 'play-sound',
          src: window.src,
          volume: Number(localStorage.getItem('tab-reloader-volume') || 1)
        });
      }
    }

    console.log('Hash is', hash);
    localStorage.setItem('tab-reloader-hash', hash);
  });
}
