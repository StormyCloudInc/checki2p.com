document.addEventListener('DOMContentLoaded', () => {
    const root = document.documentElement;
    const storageKey = 'checki2p-theme';

    function applyTheme(theme) {
        if (theme === 'light') {
            root.setAttribute('data-theme', 'light');
        } else {
            root.removeAttribute('data-theme');
        }
        updateButton();
    }

    function currentTheme() {
        return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    }

    function toggleTheme() {
        const next = currentTheme() === 'light' ? 'dark' : 'light';
        localStorage.setItem(storageKey, next);
        applyTheme(next);
    }

    function updateButton() {
        const btn = document.querySelector('button.theme-toggle');
        if (!btn) return;
        const theme = currentTheme();
        btn.textContent = `[${theme}]`;
        btn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
    }

    const saved = localStorage.getItem(storageKey);
    applyTheme(saved || 'dark');

    const btn = document.querySelector('button.theme-toggle');
    if (btn) btn.addEventListener('click', toggleTheme);
});
