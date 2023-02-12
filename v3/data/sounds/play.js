const args = new URLSearchParams(location.search);

const audio = new Audio(args.get('src'));
audio.volume = Number(args.get('volume'));
audio.onerror = audio.onended = () => chrome.runtime.sendMessage({
  method: 'close-document'
});
audio.play();
