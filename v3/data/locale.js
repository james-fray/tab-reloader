// localization
[...document.querySelectorAll('[data-i18n]')].forEach(e => {
  for (const id of e.dataset.i18n.split('|')) {
    const a = id.split('@');
    let method = 'textContent';
    if (e.dataset.i18nValue) {
      method = e.dataset.i18nValue;
    }
    else if (a.length === 2) {
      method = a[1];
    }
    else if (e.tagName === 'INPUT') {
      method = 'value';
    }
    e[method] = chrome.i18n.getMessage(a[0]);
  }
});
