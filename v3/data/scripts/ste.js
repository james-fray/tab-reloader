// scroll to the end
{
  const ste = () => {
    window.stop();
    const e = (document.scrollingElement || document.body);
    e.scrollTop = e.scrollHeight;
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ste);
  }
  else {
    ste();
  }
}
