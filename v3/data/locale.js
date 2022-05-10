// localization
[...document.querySelectorAll('[data-i18n]')].forEach(e => {
  if (e.dataset.i18nValue) {
    e[e.dataset.i18nValue] = chrome.i18n.getMessage(e.dataset.i18n);
  }
  else if (e.tagName === 'INPUT') {
    e.value = chrome.i18n.getMessage(e.dataset.i18n);
  }
  else {
    e.textContent = chrome.i18n.getMessage(e.dataset.i18n);
  }
});
