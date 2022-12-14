/* global api */

const check = () => {
  if (confirm('Worker is not responding! Would you like to restart the extension?')) {
    chrome.runtime.reload();
  }
};
check.id = setTimeout(check, 2000);

api.post.bg({
  method: 'echo'
}, r => {
  if (r) {
    clearTimeout(check.id);
    console.info('health check passed');
  }
});
