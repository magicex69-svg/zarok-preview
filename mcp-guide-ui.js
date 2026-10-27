(function () {
  const root = document.querySelector('[data-connect-guide]');
  if (!root) return;
  root.dataset.design = 'banner';
  const links = [...root.querySelectorAll('[data-guide-link]')];
  const panels = [...root.querySelectorAll('[data-guide-panel]')];
  const picker = root.querySelector('[data-guide-picker]');
  const selected = root.querySelector('[data-guide-selected]');
  const search = root.querySelector('[data-guide-search]');
  const mobile = matchMedia('(max-width: 800px)');
  const known = id => panels.find(p => p.id === id);
  function fromHash() {
    try { return decodeURIComponent(location.hash.slice(1)); } catch (_) { return ''; }
  }
  function select(id, options = {}) {
    const panel = known(id) || panels[0];
    const changed = panel.hidden;
    panels.forEach(p => { p.hidden = p !== panel; });
    if (changed) panel.scrollTop = 0;
    links.forEach(link => {
      const active = link.hash === '#' + panel.id;
      if (active) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
      if (active) selected.textContent = link.querySelector('[data-guide-name]').textContent;
    });
    if (options.history && location.hash !== '#' + panel.id) history.pushState(null, '', '#' + panel.id);
    if (mobile.matches) picker.open = false;
    if (options.focus) {
      const heading = panel.querySelector('h2');
      heading.focus({ preventScroll: true });
      /* список слева остаётся там, где его пролистали; на компьютере панель и так на виду (липкая),
         на телефоне список сворачивается — плавно подъезжаем к инструкции */
      if (mobile.matches) panel.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
  }
  root.classList.add('guide-ready');
  picker.open = !mobile.matches;
  select(fromHash());
  links.forEach(link => link.addEventListener('click', event => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    select(link.hash.slice(1), { history: true, focus: true });
  }));
  addEventListener('hashchange', () => select(fromHash()));
  addEventListener('popstate', () => select(fromHash()));
  mobile.addEventListener('change', () => { picker.open = !mobile.matches; });
  search.addEventListener('input', () => {
    const query = search.value.trim().toLocaleLowerCase();
    links.forEach(link => { link.hidden = !link.textContent.toLocaleLowerCase().includes(query); });
    root.querySelectorAll('[data-guide-group]').forEach(group => { group.hidden = ![...group.querySelectorAll('[data-guide-link]')].some(link => !link.hidden); });
    root.querySelector('[data-guide-empty]').hidden = links.some(link => !link.hidden);
  });
  /* в панели сервиса: «Как подключить» / «Как отключить» */
  root.addEventListener('click', event => {
    const tab = event.target.closest('[data-howto-tab]');
    if (!tab) return;
    const box = tab.closest('[data-howto]'), i = tab.dataset.howtoTab;
    box.querySelectorAll('[data-howto-tab]').forEach(t => t.setAttribute('aria-selected', String(t === tab)));
    box.querySelectorAll('[data-howto-panel]').forEach(p => { p.hidden = p.dataset.howtoPanel !== i; });
  });
  root.addEventListener('click', async event => {
    const button = event.target.closest('[data-guide-copy]');
    if (!button) return;
    const value = button.getAttribute('data-guide-copy');
    const status = root.querySelector('[data-guide-status]');
    try {
      if (navigator.clipboard && isSecureContext) await navigator.clipboard.writeText(value);
      else {
        const field = document.createElement('textarea');
        field.value = value;field.readOnly = true;field.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
        document.body.append(field);field.select();
        const ok = document.execCommand('copy');field.remove();
        if (!ok) throw new Error('copy');
        button.focus({ preventScroll: true });
      }
      status.textContent = status.dataset.success;
      button.querySelector('[data-copy-text]').textContent = button.dataset.done;
      clearTimeout(button._guideTimer);
      button._guideTimer = setTimeout(() => { button.querySelector('[data-copy-text]').textContent = button.dataset.label; }, 1800);
    } catch (_) { status.textContent = status.dataset.failure; button.querySelector('[data-copy-text]').textContent = button.dataset.failed; const code = button.closest('.guide-code, .guide-endpoint')?.querySelector('code'); if (code) { const range = document.createRange(); range.selectNodeContents(code); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); } }
  });
})();
