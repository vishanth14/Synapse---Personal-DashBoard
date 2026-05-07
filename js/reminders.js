// ============================================
// reminders.js — Synapse Royal Reminders
// ============================================

async function loadRemindersPage() {
    const pageContent = document.getElementById('pageContent');
    if (!pageContent) return;

    const currentUser = JSON.parse(localStorage.getItem('synapseCurrentUser'));
    if (!currentUser) {
        pageContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-lock"></i>
                <h3>Authentication Required</h3>
                <p>Please login to access reminders.</p>
            </div>`;
        return;
    }

    pageContent.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;

    try {
        const remindersData = await safeReminderRead('reminders.json');
        const userReminders = remindersData
            .filter(r => r.userId === currentUser.id)
            .sort((a, b) => new Date(a.time) - new Date(b.time));

        const activeCount    = userReminders.filter(r => !r.completed).length;
        const completedCount = userReminders.filter(r =>  r.completed).length;
        const efficiency     = calculateReminderEfficiency(userReminders);

        pageContent.innerHTML = `
            <div class="page-header">
                <h2 class="page-title">Reminders</h2>
                <p class="page-subtitle">Stay on top of your royal schedule</p>
            </div>

            <!-- Stats -->
            <div class="dashboard-cards">
                <div class="card stagger-item">
                    <div class="card-header">
                        <h3 class="card-title">Total</h3>
                        <div class="card-icon"><i class="fas fa-list"></i></div>
                    </div>
                    <div class="card-body">
                        <div class="card-value">${userReminders.length}</div>
                        <div class="card-label">Total reminders created</div>
                    </div>
                </div>
                <div class="card stagger-item">
                    <div class="card-header">
                        <h3 class="card-title">Active</h3>
                        <div class="card-icon"><i class="fas fa-clock"></i></div>
                    </div>
                    <div class="card-body">
                        <div class="card-value">${activeCount}</div>
                        <div class="card-label">Pending reminders</div>
                    </div>
                </div>
                <div class="card stagger-item">
                    <div class="card-header">
                        <h3 class="card-title">Completed</h3>
                        <div class="card-icon"><i class="fas fa-check-circle"></i></div>
                    </div>
                    <div class="card-body">
                        <div class="card-value">${completedCount}</div>
                        <div class="card-label">Finished reminders</div>
                    </div>
                </div>
                <div class="card stagger-item">
                    <div class="card-header">
                        <h3 class="card-title">Efficiency</h3>
                        <div class="card-icon"><i class="fas fa-chart-line"></i></div>
                    </div>
                    <div class="card-body">
                        <div class="card-value">${efficiency}%</div>
                        <div class="card-label">Completion performance</div>
                    </div>
                </div>
            </div>

            <!-- Quick Reminder -->
            <div class="card mt-20 stagger-item">
                <div class="card-header">
                    <h3 class="card-title">Quick Reminder</h3>
                    <div class="card-icon"><i class="fas fa-bolt"></i></div>
                </div>
                <div class="card-body">
                    <div class="input-group">
                        <i class="fas fa-pen input-icon"></i>
                        <input type="text" id="quickReminderTitle" class="form-input" placeholder="Reminder title">
                    </div>
                    <div class="input-group">
                        <i class="fas fa-calendar input-icon"></i>
                        <input type="datetime-local" id="quickReminderTime" class="form-input">
                    </div>
                    <div id="quickReminderMessage" class="form-message mt-10"></div>
                    <button class="btn-primary mt-20" id="quickReminderBtn">
                        <i class="fas fa-plus"></i> Add Quick Reminder
                    </button>
                </div>
            </div>

            <!-- Reminder List -->
            <div class="card mt-20 stagger-item">
                <div class="card-header">
                    <h3 class="card-title">Your Reminders</h3>
                    <div style="display:flex;gap:10px;align-items:center;">
                        <button class="btn-primary" id="addReminderBtn">
                            <i class="fas fa-plus"></i> New
                        </button>
                        <div class="card-icon"><i class="fas fa-scroll"></i></div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="reminders-list" id="remindersList">
                        ${userReminders.length > 0
                            ? renderReminderList(userReminders)
                            : `<div class="empty-state">
                                <i class="fas fa-bell-slash"></i>
                                <h3>No Reminders Yet</h3>
                                <p>Start organizing your tasks and events.</p>
                               </div>`}
                    </div>
                </div>
            </div>
        `;

        setupReminderListeners();
        revealReminderCards();
        checkUpcomingReminders(userReminders);

    } catch (err) {
        console.error('[REMINDERS] Load error:', err);
        pageContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-triangle-exclamation"></i>
                <h3>Unable to Load Reminders</h3>
                <p>Please try again later.</p>
            </div>`;
    }
}

// ── Render List ────────────────────────────
function renderReminderList(reminders) {
    return reminders.map(r => `
        <div class="reminder-item" data-id="${r.id}">
            <input type="checkbox" class="reminder-checkbox" ${r.completed ? 'checked' : ''}
                onchange="toggleReminderCompletion('${r.id}', this.checked)">
            <div class="reminder-info">
                <div class="reminder-title">${r.completed ? '✅ ' : ''}${escapeHTML(r.title)}</div>
                <div class="reminder-time"><i class="fas fa-clock"></i> ${new Date(r.time).toLocaleString()}</div>
                ${r.description ? `<div class="card-label mt-10">${escapeHTML(r.description)}</div>` : ''}
            </div>
            <div class="reminder-actions">
                <button class="reminder-btn" onclick="deleteReminder('${r.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// ── Event Listeners ────────────────────────
function setupReminderListeners() {
    document.getElementById('addReminderBtn')  ?.addEventListener('click', showReminderModal);
    document.getElementById('quickReminderBtn')?.addEventListener('click', handleQuickReminder);
}

// ── Reminder Modal ─────────────────────────
function showReminderModal() {
    document.getElementById('reminderModal')?.remove();

    const modal = document.createElement('div');
    modal.id        = 'reminderModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Create Reminder</h3>
                    <button class="reminder-btn" id="closeReminderModal"><i class="fas fa-times"></i></button>
                </div>
                <div class="card-body">
                    <div class="input-group">
                        <i class="fas fa-pen input-icon"></i>
                        <input type="text" id="reminderTitle" class="form-input" placeholder="Reminder title">
                    </div>
                    <div class="input-group">
                        <i class="fas fa-align-left input-icon"></i>
                        <textarea id="reminderDescription" class="form-input" placeholder="Description (optional)"></textarea>
                    </div>
                    <div class="input-group">
                        <i class="fas fa-calendar input-icon"></i>
                        <input type="datetime-local" id="reminderDateTime" class="form-input">
                    </div>
                    <div id="reminderMessage" class="form-message mt-10"></div>
                    <button class="btn-royal mt-20" id="saveReminderBtn">
                        Save Reminder <i class="fas fa-bell"></i>
                    </button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('show'));

    document.getElementById('closeReminderModal').addEventListener('click', closeReminderModal);
    document.getElementById('saveReminderBtn').addEventListener('click', handleAddReminder);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeReminderModal(); });
}

function closeReminderModal() {
    const modal = document.getElementById('reminderModal');
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
}

// ── Add Full Reminder ──────────────────────
async function handleAddReminder() {
    const currentUser = JSON.parse(localStorage.getItem('synapseCurrentUser'));
    const title       = document.getElementById('reminderTitle')      ?.value.trim();
    const description = document.getElementById('reminderDescription')?.value.trim() || '';
    const time        = document.getElementById('reminderDateTime')   ?.value;
    const msgEl       = document.getElementById('reminderMessage');

    if (!title || !time) {
        showReminderMessage(msgEl, 'Please fill all required fields', 'error');
        return;
    }
    try {
        const reminders = await safeReminderRead('reminders.json');
        reminders.push({
            id: generateReminderId(), userId: currentUser.id,
            title, description, time, completed: false,
            createdAt: new Date().toISOString()
        });
        await window.lifeOS.writeData('reminders.json', reminders);
        showToast('Reminder added successfully', 'success');
        window.lifeOS?.showNotification?.({ title: 'Synapse Reminders', body: `"${title}" added` });
        closeReminderModal();
        loadRemindersPage();
    } catch (err) {
        console.error('[REMINDERS] Add error:', err);
        showReminderMessage(msgEl, 'Unable to add reminder', 'error');
    }
}

// ── Quick Reminder ─────────────────────────
async function handleQuickReminder() {
    const currentUser = JSON.parse(localStorage.getItem('synapseCurrentUser'));
    const title  = document.getElementById('quickReminderTitle')?.value.trim();
    const time   = document.getElementById('quickReminderTime') ?.value;
    const msgEl  = document.getElementById('quickReminderMessage');

    if (!title || !time) { showReminderMessage(msgEl, 'Please fill all fields', 'error'); return; }

    try {
        const reminders = await safeReminderRead('reminders.json');
        reminders.push({
            id: generateReminderId(), userId: currentUser.id,
            title, description: '', time, completed: false,
            createdAt: new Date().toISOString()
        });
        await window.lifeOS.writeData('reminders.json', reminders);
        showReminderMessage(msgEl, 'Quick reminder added!', 'success');
        document.getElementById('quickReminderTitle').value = '';
        document.getElementById('quickReminderTime').value  = '';
        loadRemindersPage();
    } catch (err) {
        console.error('[REMINDERS] Quick add error:', err);
        showReminderMessage(msgEl, 'Unable to add reminder', 'error');
    }
}

// ── Toggle Completion ──────────────────────
async function toggleReminderCompletion(id, completed) {
    try {
        let reminders = await safeReminderRead('reminders.json');
        reminders = reminders.map(r => r.id === id ? { ...r, completed } : r);
        await window.lifeOS.writeData('reminders.json', reminders);
        showToast(completed ? 'Reminder completed!' : 'Reminder reopened', 'success');
        loadRemindersPage();
    } catch (err) { console.error('[REMINDERS] Toggle error:', err); }
}

// ── Delete ─────────────────────────────────
async function deleteReminder(id) {
    if (!confirm('Delete this reminder?')) return;
    try {
        let reminders = await safeReminderRead('reminders.json');
        reminders = reminders.filter(r => r.id !== id);
        await window.lifeOS.writeData('reminders.json', reminders);
        showToast('Reminder deleted', 'success');
        loadRemindersPage();
    } catch (err) { console.error('[REMINDERS] Delete error:', err); }
}

// ── Upcoming Alert ─────────────────────────
function checkUpcomingReminders(reminders) {
    const now      = Date.now();
    const upcoming = reminders.filter(r => {
        const diff = new Date(r.time) - now;
        return diff > 0 && diff <= 3_600_000 && !r.completed;
    });
    if (upcoming.length > 0) {
        window.lifeOS?.showNotification?.({
            title: 'Upcoming Reminders',
            body:  `${upcoming.length} reminder(s) due within 1 hour`
        });
    }
}

// ── Helpers ────────────────────────────────
function calculateReminderEfficiency(reminders) {
    if (!reminders.length) return 0;
    return Math.round((reminders.filter(r => r.completed).length / reminders.length) * 100);
}

function revealReminderCards() {
    document.querySelectorAll('.card').forEach((card, i) => {
        card.style.opacity   = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = `opacity 0.5s ease ${i * 120}ms, transform 0.5s ease ${i * 120}ms`;
        requestAnimationFrame(() => { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; });
    });
}

function showReminderMessage(el, msg, type) {
    if (!el) return;
    el.textContent = msg;
    el.className   = `form-message ${type}`;
}

function escapeHTML(str) {
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function safeReminderRead(file) {
    try {
        const data = await window.lifeOS.readData(file);
        return Array.isArray(data) ? data : [];
    } catch { return []; }
}

function generateReminderId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// ── Global Exports ─────────────────────────
window.loadRemindersPage          = loadRemindersPage;
window.showReminderModal          = showReminderModal;
window.closeReminderModal         = closeReminderModal;
window.toggleReminderCompletion   = toggleReminderCompletion;
window.deleteReminder             = deleteReminder;