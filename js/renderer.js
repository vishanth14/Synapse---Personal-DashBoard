// ============================================
// renderer.js — Synapse Page Router
// ============================================

function initRenderer() {
    setupNavigation();
    setupLogout();
    setupSidebarToggle();
    navigateTo('dashboard');

    window.lifeOS?.on?.('data-updated', (fileName) => {
        console.log('[RENDERER] Data updated:', fileName);
    });

    console.log('[RENDERER] ✅ Router initialized');
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            if (!page) return;
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            navigateTo(page);
        });

        // Keyboard accessibility
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                item.click();
            }
        });
    });
}

function navigateTo(page) {
    console.log('[RENDERER] Navigating to:', page);
    const routes = {
        dashboard: window.loadDashboard,
        wellness:  window.loadWellnessPage,
        finance:   window.loadFinancePage,
        skills:    window.loadSkillsPage,
        reminders: window.loadRemindersPage,
    };
    const loader = routes[page];
    if (loader) loader();
    else console.warn('[RENDERER] Unknown page:', page);
}

function setupLogout() {
    // Uses event delegation — works even if sidebar re-renders
    document.addEventListener('click', (e) => {
        if (e.target.closest('#logoutBtn')) window.handleLogout?.();
    });
}

function setupSidebarToggle() {
    const toggle  = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (!toggle || !sidebar) return;
    toggle.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
}

window.initRenderer = initRenderer;
window.navigateTo   = navigateTo;