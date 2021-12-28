{
  const sha256 = async message => {
    const msgBuffer = new TextEncoder('utf-8').encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('');
    return hashHex;
  };
  sha256(document.body.innerText).then(hash => {
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
          src: window.src
        });
      }
    }

    localStorage.setItem('tab-reloader-hash', hash);
  });
}
