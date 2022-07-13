/* keyboard support */

document.addEventListener('keydown', e => {
  if (e.target.type === 'text' || e.target.type === 'number' || e.target.tagName === 'TEXTAREA') {
    return;
  }

  const enabled = document.body.dataset.enabled === 'true';
  const meta = e.ctrlKey || e.metaKey;

  if (e.code === 'Escape' && e.shiftKey) {
    window.close();
  }
  else if (e.code === 'Escape' && enabled) {
    e.preventDefault();
    document.getElementById('disable').dispatchEvent(new Event('click'));
  }
  else if (e.code === 'KeyS' && !enabled) {
    e.preventDefault();
    e.stopPropagation();
    document.body.dataset.forced = e.shiftKey;
    document.getElementById('enable').click();
  }
  else if (e.code.startsWith('Digit') && meta && !enabled) {
    e.preventDefault();
    document.querySelectorAll('#presets .entry')[Number(e.key) - 1].dispatchEvent(new Event('click', {
      bubbles: true
    }));
  }
});
