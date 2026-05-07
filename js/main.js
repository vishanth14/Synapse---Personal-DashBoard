// ============================================
// main.js — Synapse Royal Core Engine (FIXED)
// ============================================
// Works alongside auth.js.
// auth.js  → handles login/signup/session/toast
// main.js  → handles navigation/page loading/theme
// ============================================

// ============================================
// GLOBAL STATE
// ============================================

let currentPage = "dashboard";

// ============================================
// DOM ELEMENTS
// ============================================

let navItems    = [];
let pageContent = null;
let logoutBtn   = null;
let themeToggle = null;

// ============================================
// INITIALIZE APPLICATION
// Called by auth.js after login (enterApp),
// or on DOMContentLoaded if session is active.
// ============================================

function initRenderer() {
    try {
        navItems    = document.querySelectorAll('.nav-item');
        pageContent = document.getElementById('pageContent');
        logoutBtn   = document.getElementById('logoutBtn');
        themeToggle = document.getElementById('themeIcon');

        initializeTheme();
        setupMainEventListeners();
        loadPage('dashboard');

        console.log('[MAIN] ✅ Renderer initialized');
    } catch (err) {
        console.error('[MAIN] ❌ Renderer init failed:', err);
    }
}

// Expose so auth.js can call it after login
window.initRenderer = initRenderer;

// ============================================
// EVENT LISTENERS
// ============================================

function setupMainEventListeners() {

    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const page = item.getAttribute('data-page');
            if (page) loadPage(page);
        });
    });

    // Logout (auth.js also handles this via delegation, belt-and-suspenders)
    logoutBtn?.addEventListener('click', () => {
        if (typeof window.handleLogout === 'function') window.handleLogout();
    });

    // Theme toggle
    themeToggle?.addEventListener('click', toggleTheme);
}

// ============================================
// PAGE LOADER
// ============================================

async function loadPage(page) {
    currentPage = page;
    setActiveNav(page);
    showLoader();

    try {
        switch (page) {
            case 'dashboard': await loadDashboard();     break;
            case 'wellness':  await loadWellnessPage();  break;
            case 'finance':   await loadFinancePage();   break;
            case 'skills':    await loadSkillsPage();    break;
            case 'reminders': await loadRemindersPage(); break;
            case 'settings':  loadSettingsPage();        break;
            default:          await loadDashboard();
        }
    } catch (err) {
        console.error(`[MAIN] Page load error (${page}):`, err);
        if (pageContent) {
            pageContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-triangle-exclamation"></i>
                    <h3>Failed to load page</h3>
                    <p>Something went wrong. Please try again.</p>
                </div>`;
        }
    }
}

// ============================================
// ACTIVE NAVIGATION
// ============================================

function setActiveNav(page) {
    navItems.forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-page') === page);
    });
}

// ============================================
// SETTINGS PAGE
// ============================================

function loadSettingsPage() {
    if (!pageContent) return;
    pageContent.innerHTML = `
        <div class="page-header">
            <h2 class="page-title">Settings</h2>
            <p class="page-subtitle">Customize your royal experience</p>
        </div>
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Appearance</h3>
                <div class="card-icon"><i class="fas fa-palette"></i></div>
            </div>
            <div class="card-body">
                <div class="finance-summary">
                    <div class="finance-item">
                        <div class="finance-label">Theme</div>
                        <div class="finance-value">
                            <button class="btn-secondary" onclick="toggleTheme()">
                                <i class="fas fa-adjust"></i> Toggle Theme
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="card mt-20">
            <div class="card-header">
                <h3 class="card-title">Account</h3>
                <div class="card-icon"><i class="fas fa-user-cog"></i></div>
            </div>
            <div class="card-body">
                <div class="finance-summary">
                    <div class="finance-item">
                        <div class="finance-label">Signed in as</div>
                        <div class="finance-value" id="settingsUserName">—</div>
                    </div>
                </div>
                <button class="btn-secondary mt-20" onclick="if(typeof window.handleLogout==='function') window.handleLogout()">
                    <i class="fas fa-sign-out-alt"></i> Sign Out
                </button>
            </div>
        </div>`;

    // Fill in user name
    try {
        const u = JSON.parse(localStorage.getItem('synapseCurrentUser'));
        const el = document.getElementById('settingsUserName');
        if (u && el) el.textContent = `${u.name} (${u.email})`;
    } catch {}
}

// ============================================
// THEME
// ============================================

function toggleTheme() {
    const body    = document.body;
    const isLight = body.classList.contains('light-theme');

    body.classList.toggle('light-theme', !isLight);
    body.classList.toggle('dark-theme',   isLight);

    if (themeToggle) {
        themeToggle.className = isLight ? 'fas fa-moon' : 'fas fa-sun';
    }
    localStorage.setItem('theme', isLight ? 'dark' : 'light');
}

function initializeTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(saved === 'light' ? 'light-theme' : 'dark-theme');
    if (themeToggle) {
        themeToggle.className = saved === 'light' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// ============================================
// HELPERS
// ============================================

function showLoader() {
    if (!pageContent) return;
    pageContent.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
        </div>`;
}

// safeRead — used by dashboard.js / module pages
// Prefers window.lifeOS, falls back to localStorage
async function safeRead(fileName) {
    if (window.lifeOS?.readData) {
        try {
            const data = await window.lifeOS.readData(fileName);
            return Array.isArray(data) ? data : (data || []);
        } catch (e) {
            console.warn('[MAIN] lifeOS read failed, using localStorage:', fileName);
        }
    }
    try {
        const raw = localStorage.getItem(`synapse_${fileName}`);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

async function safeWrite(fileName, data) {
    if (window.lifeOS?.writeData) {
        try {
            return await window.lifeOS.writeData(fileName, data);
        } catch (e) {
            console.warn('[MAIN] lifeOS write failed, using localStorage:', fileName);
        }
    }
    try {
        localStorage.setItem(`synapse_${fileName}`, JSON.stringify(data));
        return { success: true };
    } catch { return { success: false }; }
}

// showToast — unified; auth.js also defines this.
// Only define here if auth.js hasn't defined it yet (load-order safety).
if (typeof window.showToast !== 'function') {
    window.showToast = function(message, type = 'success') {
        const toast    = document.getElementById('toast');
        const toastMsg = document.getElementById('toastMsg');
        if (!toast || !toastMsg) return;
        toastMsg.textContent = message;
        toast.className      = `toast show ${type}`;
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => toast.classList.remove('show'), 3500);
    };
}

// updateUserUI — unified; auth.js also defines this.
if (typeof window.updateUserUI !== 'function') {
    window.updateUserUI = function(user) {
        if (!user) return;
        const nameEl   = document.getElementById('userName');
        const emailEl  = document.getElementById('userEmail');
        const avatarEl = document.getElementById('userAvatar');
        if (nameEl)   nameEl.textContent   = user.name  || 'Guest';
        if (emailEl)  emailEl.textContent  = user.email || '';
        if (avatarEl) avatarEl.textContent = (user.name || 'G').charAt(0).toUpperCase();
    };
}

// ============================================
// GLOBAL EXPORTS
// ============================================

window.loadPage         = loadPage;
window.initRenderer     = initRenderer;
window.toggleTheme      = toggleTheme;
window.safeRead         = safeRead;
window.safeWrite        = safeWrite;