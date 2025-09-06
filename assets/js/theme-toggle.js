// Lightweight theme toggle with persistence and logo swapping
document.addEventListener('DOMContentLoaded', () => {
    const root = document.documentElement;
    const storageKey = 'checki2p-theme';
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    function applyTheme(theme) {
        if (theme === 'light') {
            root.setAttribute('data-theme', 'light');
        } else {
            root.removeAttribute('data-theme');
        }
        swapLogo();
    }

    function currentTheme() {
        return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    }

    function toggleTheme() {
        const next = currentTheme() === 'light' ? 'dark' : 'light';
        localStorage.setItem(storageKey, next);
        applyTheme(next);
        const btn = document.querySelector('button.theme-toggle');
        if (btn) btn.setAttribute('aria-label', next === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
    }

    function swapLogo() {
        const logo = document.querySelector('.logo');
        if (!logo) return;
        const isLight = currentTheme() === 'light';
        // Expect filenames logo-light.svg and logo-dark.svg
        const lightSrc = '/assets/images/logo-light.svg';
        const darkSrc = '/assets/images/logo-dark.svg';
        logo.src = isLight ? lightSrc : darkSrc;
    }

    // Initialize theme from storage or system
    const saved = localStorage.getItem(storageKey);
    const initial = saved || (prefersDark ? 'dark' : 'light');
    applyTheme(initial);

    // Attach toggle handler
    const existingBtn = document.querySelector('button.theme-toggle');
    if (existingBtn) {
        existingBtn.addEventListener('click', toggleTheme);
        existingBtn.setAttribute('aria-label', initial === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
    }
});


