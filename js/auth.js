// ============================================
// auth.js — Synapse Authentication (FIXED)
// ============================================

let landingPage, appContainer;
let loginFormContainer, signupFormContainer;
let loginTabBtn, signupTabBtn;
let loginBtn, signupBtn;
let goToSignup, goToLogin;
let loginMessage, signupMessage;
let passwordInput, strengthContainer, strengthFill, strengthLabel;
let rememberMe;

function initDOMReferences() {
    landingPage         = document.getElementById('landingPage');
    appContainer        = document.getElementById('appContainer');
    loginFormContainer  = document.getElementById('loginForm');
    signupFormContainer = document.getElementById('signupForm');
    loginTabBtn         = document.getElementById('loginTabBtn');
    signupTabBtn        = document.getElementById('signupTabBtn');
    loginBtn            = document.getElementById('loginBtn');
    signupBtn           = document.getElementById('signupBtn');
    goToSignup          = document.getElementById('goToSignup');
    goToLogin           = document.getElementById('goToLogin');
    loginMessage        = document.getElementById('loginMessage');
    signupMessage       = document.getElementById('signupMessage');
    passwordInput       = document.getElementById('signupPassword');
    strengthContainer   = document.getElementById('passwordStrength');
    strengthFill        = document.getElementById('strengthFill');
    strengthLabel       = document.getElementById('strengthLabel');
    rememberMe          = document.getElementById('rememberMe');
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        initDOMReferences();
        switchTab('login');
        setupAuthEventListeners();
        setupPasswordStrength();
        setupPasswordToggles();
        restoreSession();
        console.log('[AUTH] ✅ Initialized');
    } catch (err) {
        console.error('[AUTH] ❌ Init error:', err);
    }
});

function setupAuthEventListeners() {
    loginTabBtn  ?.addEventListener('click', () => switchTab('login'));
    signupTabBtn ?.addEventListener('click', () => switchTab('signup'));
    goToSignup   ?.addEventListener('click', (e) => { e.preventDefault(); switchTab('signup'); });
    goToLogin    ?.addEventListener('click', (e) => { e.preventDefault(); switchTab('login');  });
    loginBtn     ?.addEventListener('click', handleLogin);
    signupBtn    ?.addEventListener('click', handleSignup);

    // Logout via delegation
    document.addEventListener('click', (e) => {
        if (e.target.closest('#logoutBtn')) handleLogout();
    });

    // Enter key support
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        if (loginFormContainer?.classList.contains('active'))       handleLogin();
        else if (signupFormContainer?.classList.contains('active')) handleSignup();
    });
}

// ── Tab Switching ──────────────────────────
function switchTab(tab) {
    clearMessages();
    const isLogin = tab === 'login';
    loginTabBtn ?.classList.toggle('active',  isLogin);
    signupTabBtn?.classList.toggle('active', !isLogin);
    loginFormContainer ?.classList.toggle('active',  isLogin);
    signupFormContainer?.classList.toggle('active', !isLogin);
}

// ── Get all users (supports multi-user) ────
function getAllUsers() {
    try {
        const raw = localStorage.getItem('synapseUsers');
        if (raw) return JSON.parse(raw);
        // Migrate legacy single-user storage
        const legacy = localStorage.getItem('synapseUser');
        if (legacy) {
            const user = JSON.parse(legacy);
            const users = [user];
            localStorage.setItem('synapseUsers', JSON.stringify(users));
            return users;
        }
        return [];
    } catch { return []; }
}

function saveAllUsers(users) {
    localStorage.setItem('synapseUsers', JSON.stringify(users));
}

// ── Login ──────────────────────────────────
function handleLogin() {
    clearMessages();
    const email    = document.getElementById('loginEmail')   ?.value.trim();
    const password = document.getElementById('loginPassword')?.value;

    if (!email || !password) {
        showMessage(loginMessage, 'Please fill in all fields.', 'error');
        return;
    }
    if (!validateEmail(email)) {
        showMessage(loginMessage, 'Enter a valid email address.', 'error');
        return;
    }

    try {
        const users = getAllUsers();
        if (!users.length) {
            showMessage(loginMessage, 'No account found. Please sign up first.', 'error');
            return;
        }

        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!user) {
            showMessage(loginMessage, 'No account found with this email.', 'error');
            return;
        }
        if (user.password !== password) {
            showMessage(loginMessage, 'Incorrect password. Please try again.', 'error');
            return;
        }

        // Ensure user has an id
        if (!user.id) {
            user.id = generateUserId(email);
            saveAllUsers(users);
        }

        localStorage.setItem('synapseCurrentUser', JSON.stringify(user));

        if (rememberMe?.checked) {
            localStorage.setItem('synapseRemember', 'true');
        } else {
            localStorage.removeItem('synapseRemember');
        }

        // Clear login fields
        const emailEl = document.getElementById('loginEmail');
        const passEl  = document.getElementById('loginPassword');
        if (emailEl) emailEl.value = '';
        if (passEl)  passEl.value  = '';

        updateUserUI(user);
        enterApp();
        showToast('Welcome back, ' + user.name + '! 👑', 'success');

    } catch (err) {
        console.error('[AUTH] Login error:', err);
        showMessage(loginMessage, 'Error logging in. Please try again.', 'error');
    }
}

// ── Signup ─────────────────────────────────
function handleSignup() {
    clearMessages();
    const name     = document.getElementById('signupName')    ?.value.trim();
    const email    = document.getElementById('signupEmail')   ?.value.trim();
    const password = document.getElementById('signupPassword')?.value;
    const confirm  = document.getElementById('confirmPassword')?.value;

    if (!name || !email || !password || !confirm) {
        showMessage(signupMessage, 'Please fill in all fields.', 'error');
        return;
    }
    if (!validateEmail(email)) {
        showMessage(signupMessage, 'Enter a valid email address.', 'error');
        return;
    }
    if (password.length < 6) {
        showMessage(signupMessage, 'Password must be at least 6 characters.', 'error');
        return;
    }
    if (password !== confirm) {
        showMessage(signupMessage, 'Passwords do not match.', 'error');
        return;
    }

    try {
        const users = getAllUsers();
        const exists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
        if (exists) {
            showMessage(signupMessage, 'An account with this email already exists.', 'error');
            return;
        }

        const newUser = {
            id:        generateUserId(email),
            name,
            email,
            password,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        saveAllUsers(users);

        showMessage(signupMessage, '✅ Account created! You can now sign in.', 'success');
        showToast('Account created successfully!', 'success');

        setTimeout(() => {
            switchTab('login');
            const loginEmailEl = document.getElementById('loginEmail');
            if (loginEmailEl) loginEmailEl.value = email;
            ['signupName','signupEmail','signupPassword','confirmPassword']
                .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        }, 1200);

    } catch (err) {
        console.error('[AUTH] Signup error:', err);
        showMessage(signupMessage, 'Error creating account. Please try again.', 'error');
    }
}

// ── App Navigation ─────────────────────────
function enterApp() {
    if (landingPage)  landingPage.style.display  = 'none';
    if (appContainer) appContainer.style.display = 'flex';
    // Trigger main app renderer if available
    setTimeout(() => {
        if (window.initRenderer)  window.initRenderer();
        else if (window.loadPage) window.loadPage('dashboard');
    }, 100);
}

function handleLogout() {
    localStorage.removeItem('synapseCurrentUser');
    localStorage.removeItem('synapseRemember');
    if (appContainer) appContainer.style.display = 'none';
    if (landingPage)  landingPage.style.display  = 'flex';
    switchTab('login');
    showToast('Logged out successfully.', 'success');
}

function restoreSession() {
    try {
        const remembered = localStorage.getItem('synapseRemember');
        const savedUser  = localStorage.getItem('synapseCurrentUser');
        if (remembered === 'true' && savedUser) {
            const user = JSON.parse(savedUser);
            // Verify user still exists in the store
            const users = getAllUsers();
            const valid = users.some(u => u.id === user.id);
            if (valid) {
                updateUserUI(user);
                enterApp();
                return;
            }
            // Stale session — clear it
            localStorage.removeItem('synapseCurrentUser');
            localStorage.removeItem('synapseRemember');
        }
    } catch (err) {
        console.error('[AUTH] Session restore error:', err);
    }
}

// ── UI Helpers ─────────────────────────────
function updateUserUI(user) {
    if (!user) return;
    const nameEl   = document.getElementById('userName');
    const emailEl  = document.getElementById('userEmail');
    const avatarEl = document.getElementById('userAvatar');
    if (nameEl)   nameEl.textContent   = user.name;
    if (emailEl)  emailEl.textContent  = user.email;
    if (avatarEl) avatarEl.textContent = user.name.charAt(0).toUpperCase();
}

// ── Password Strength ──────────────────────
function setupPasswordStrength() {
    if (!passwordInput || !strengthContainer || !strengthFill || !strengthLabel) return;
    passwordInput.addEventListener('input', () => {
        const pw = passwordInput.value;
        if (!pw) { strengthContainer.style.display = 'none'; return; }
        strengthContainer.style.display = 'block';
        let score = 0;
        if (pw.length >= 6)          score++;
        if (/[A-Z]/.test(pw))        score++;
        if (/[0-9]/.test(pw))        score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;
        const widths = ['25%','50%','75%','100%'];
        const labels = ['Weak','Fair','Good','Strong'];
        const colors = ['#e74c3c','#f39c12','#2ecc71','#27ae60'];
        const i = Math.max(score - 1, 0);
        strengthFill.style.width      = widths[i];
        strengthFill.style.background = colors[i];
        strengthLabel.textContent     = labels[i];
    });
}

// ── Password Toggles ───────────────────────
function setupPasswordToggles() {
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const group = btn.closest('.input-group');
            if (!group) return;
            const input = group.querySelector('input[type="password"], input[type="text"]');
            const icon  = btn.querySelector('i');
            if (!input || !icon) return;
            const isHidden = input.type === 'password';
            input.type = isHidden ? 'text' : 'password';
            icon.classList.toggle('fa-eye',       !isHidden);
            icon.classList.toggle('fa-eye-slash',  isHidden);
        });
    });
}

// ── Utilities ──────────────────────────────
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateUserId(email) {
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
        hash = ((hash << 5) - hash) + email.charCodeAt(i);
        hash |= 0;
    }
    return 'user_' + Math.abs(hash).toString(36);
}

function clearMessages() {
    [loginMessage, signupMessage].forEach(el => {
        if (el) { el.textContent = ''; el.className = 'form-message'; }
    });
}

function showMessage(el, msg, type) {
    if (!el) return;
    el.textContent = msg;
    el.className   = `form-message ${type}`;
}

function showToast(message, type = 'info') {
    const toast    = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    if (!toast || !toastMsg) return;
    toastMsg.textContent = message;
    toast.className      = `toast show ${type}`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── Global Exports ─────────────────────────
window.handleLogin  = handleLogin;
window.handleSignup = handleSignup;
window.handleLogout = handleLogout;
window.switchTab    = switchTab;
window.showToast    = showToast;
window.enterApp     = enterApp;
window.updateUserUI = updateUserUI;
window.getAllUsers   = getAllUsers;
window.saveAllUsers = saveAllUsers;