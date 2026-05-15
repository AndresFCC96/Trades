// Shared floating switcher widget: prototype navigation + light/dark toggle
// Include in each prototype's index.html
// Reads data-prototype="A|B|C|D" from <body> to know which is current
// Persists theme choice per prototype in localStorage

(function () {
  const PROTOS = [
    { id: 'A', name: 'TRADESYS', href: '../A - Terminal/index.html', color: '#4ade80' },
    { id: 'B', name: 'Pipely',   href: '../B - Modern/index.html',   color: '#7c5cff' },
    { id: 'C', name: 'Atlas',    href: '../C - Atlas/index.html',    color: '#2d5cf6' },
    { id: 'D', name: 'Sentinel', href: '../D - Sentinel/index.html', color: '#b08533' },
  ];

  function init() {
    const current = document.body.dataset.prototype || 'A';
    const storageKey = `tradesys-theme-${current}`;

    // Determine initial theme: stored value, or body's data-default-theme, or 'dark'
    let theme = localStorage.getItem(storageKey)
      || document.body.dataset.defaultTheme
      || 'dark';
    // Apply theme to DOM immediately (no button update yet — bar not built)
    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;

    function setTheme(t) {
      document.documentElement.dataset.theme = t;
      document.body.dataset.theme = t;
      localStorage.setItem(storageKey, t);
      theme = t;
      updateButtons();
    }

    // Build widget
    const bar = document.createElement('div');
    bar.id = 'proto-switcher';
    bar.innerHTML = `
      <style>
        #proto-switcher {
          position: fixed; bottom: 16px; right: 16px; z-index: 9999;
          display: flex; align-items: stretch; gap: 0;
          background: rgba(20, 20, 28, 0.92);
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 12px;
          padding: 4px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.4);
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 11px;
          transition: opacity 0.2s, transform 0.2s;
        }
        #proto-switcher.collapsed {
          padding: 0;
        }
        #proto-switcher.collapsed .ps-content { display: none; }
        #proto-switcher .ps-content { display: flex; gap: 2px; align-items: center; }
        #proto-switcher .ps-btn {
          width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
          border-radius: 7px; cursor: pointer; color: #a4adbd; font-weight: 600;
          letter-spacing: 0.5px; transition: background 0.12s, color 0.12s;
          text-decoration: none; user-select: none;
          background: transparent;
        }
        #proto-switcher .ps-btn:hover { background: rgba(255,255,255,0.06); color: #fff; }
        #proto-switcher .ps-btn.active {
          background: var(--ps-accent, #fff);
          color: #0a0c12;
        }
        #proto-switcher .ps-divider {
          width: 1px; height: 18px; background: rgba(255,255,255,0.10); margin: 0 4px;
          align-self: center;
        }
        #proto-switcher .ps-theme {
          font-size: 13px;
        }
        #proto-switcher .ps-label {
          padding: 0 8px; color: #a4adbd; font-size: 9px; letter-spacing: 1px;
          text-transform: uppercase; align-self: center;
        }
        #proto-switcher .ps-collapse {
          width: 18px; height: 28px; display: flex; align-items: center; justify-content: center;
          color: #6a7484; cursor: pointer; font-size: 10px;
        }
        #proto-switcher .ps-collapse:hover { color: #fff; }
        #proto-switcher.collapsed .ps-collapse {
          width: 28px; height: 28px;
        }
      </style>
      <div class="ps-content">
        <span class="ps-label">PROTO</span>
        ${PROTOS.map(p => `
          <a href="${p.href}" class="ps-btn proto-btn" data-id="${p.id}" data-color="${p.color}" title="${p.name}">${p.id}</a>
        `).join('')}
        <span class="ps-divider"></span>
        <span class="ps-btn ps-theme" data-action="theme" title="Toggle light/dark">${theme === 'dark' ? '☾' : '☼'}</span>
      </div>
      <span class="ps-collapse" data-action="collapse" title="Collapse">${'\u00ab'}</span>
    `;
    document.body.appendChild(bar);

    function updateButtons() {
      bar.querySelectorAll('.proto-btn').forEach(b => {
        const isActive = b.dataset.id === current;
        b.classList.toggle('active', isActive);
        if (isActive) b.style.setProperty('--ps-accent', b.dataset.color);
      });
      const themeBtn = bar.querySelector('.ps-theme');
      if (themeBtn) themeBtn.textContent = theme === 'dark' ? '☾' : '☼';
    }
    updateButtons();

    // Theme toggle
    bar.querySelector('.ps-theme').addEventListener('click', () => {
      setTheme(theme === 'dark' ? 'light' : 'dark');
    });

    // Collapse / expand
    let collapsed = localStorage.getItem('tradesys-switcher-collapsed') === '1';
    function applyCollapsed() {
      bar.classList.toggle('collapsed', collapsed);
      const c = bar.querySelector('.ps-collapse');
      c.textContent = collapsed ? '\u00bb' : '\u00ab';
    }
    applyCollapsed();
    bar.querySelector('.ps-collapse').addEventListener('click', () => {
      collapsed = !collapsed;
      localStorage.setItem('tradesys-switcher-collapsed', collapsed ? '1' : '0');
      applyCollapsed();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
