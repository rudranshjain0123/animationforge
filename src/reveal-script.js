// This exact string is shared by the browser exporter and the server's CSP.
export const revealScript = `(() => {
  const nodes = document.querySelectorAll('[data-af-reveal]:not([data-af-bound])');
  if (!('IntersectionObserver' in window) || !nodes.length) return;
  const watcher = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.setAttribute('data-af-entered', '');
      watcher.unobserve(entry.target);
    }
  }, { threshold: 0.12 });
  for (const node of nodes) {
    node.setAttribute('data-af-bound', '');
    watcher.observe(node);
  }
})();`
