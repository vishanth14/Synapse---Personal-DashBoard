// ============================================
// skills.js — Synapse Royal Skills Module
// ============================================

async function loadSkillsPage() {
    const pageContent = document.getElementById('pageContent');
    if (!pageContent) return;

    const currentUser = JSON.parse(localStorage.getItem('synapseCurrentUser'));
    if (!currentUser) {
        pageContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-lock"></i>
                <h3>Authentication Required</h3>
                <p>Please login to access skills.</p>
            </div>`;
        return;
    }

    pageContent.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;

    try {
        const skillsData    = await safeSkillsRead('skills.json');
        const userSkills    = skillsData.filter(s => s.userId === currentUser.id);
        const completedCount = userSkills.filter(s => s.completed).length;
        const avgProgress    = calculateAverageProgress(userSkills);

        pageContent.innerHTML = `
            <div class="page-header">
                <h2 class="page-title">Skills</h2>
                <p class="page-subtitle">Master your royal learning journey</p>
            </div>

            <!-- Stats -->
            <div class="dashboard-cards">
                <div class="card stagger-item">
                    <div class="card-header">
                        <h3 class="card-title">Total Skills</h3>
                        <div class="card-icon"><i class="fas fa-layer-group"></i></div>
                    </div>
                    <div class="card-body">
                        <div class="card-value">${userSkills.length}</div>
                        <div class="card-label">Learning tracks active</div>
                    </div>
                </div>
                <div class="card stagger-item">
                    <div class="card-header">
                        <h3 class="card-title">Completed</h3>
                        <div class="card-icon"><i class="fas fa-award"></i></div>
                    </div>
                    <div class="card-body">
                        <div class="card-value">${completedCount}</div>
                        <div class="card-label">Skills mastered</div>
                    </div>
                </div>
                <div class="card stagger-item">
                    <div class="card-header">
                        <h3 class="card-title">Avg Progress</h3>
                        <div class="card-icon"><i class="fas fa-chart-line"></i></div>
                    </div>
                    <div class="card-body">
                        <div class="card-value">${avgProgress}%</div>
                        <div class="card-label">Overall learning progress</div>
                    </div>
                </div>
            </div>

            <!-- Skills List -->
            <div class="card mt-20 stagger-item">
                <div class="card-header">
                    <h3 class="card-title">Skill Progress</h3>
                    <div style="display:flex;gap:10px;align-items:center;">
                        <button class="btn-primary" id="addSkillBtn">
                            <i class="fas fa-plus"></i> Add Skill
                        </button>
                        <div class="card-icon"><i class="fas fa-brain"></i></div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="skills-list">
                        ${userSkills.length > 0
                            ? renderSkills(userSkills)
                            : `<div class="empty-state">
                                <i class="fas fa-book-open"></i>
                                <h3>No Skills Added</h3>
                                <p>Start tracking your learning journey.</p>
                               </div>`}
                    </div>
                </div>
            </div>

            <!-- Categories -->
            <div class="card mt-20 stagger-item">
                <div class="card-header">
                    <h3 class="card-title">Popular Categories</h3>
                    <div class="card-icon"><i class="fas fa-tags"></i></div>
                </div>
                <div class="card-body">
                    <div class="brand-features">
                        <div class="feature-pill"><i class="fas fa-code"></i> Programming</div>
                        <div class="feature-pill"><i class="fas fa-palette"></i> Design</div>
                        <div class="feature-pill"><i class="fas fa-chart-pie"></i> Business</div>
                        <div class="feature-pill"><i class="fas fa-language"></i> Language</div>
                        <div class="feature-pill"><i class="fas fa-heartbeat"></i> Health</div>
                        <div class="feature-pill"><i class="fas fa-camera"></i> Creative</div>
                    </div>
                </div>
            </div>

            <!-- Learning Tips -->
            <div class="card mt-20 stagger-item">
                <div class="card-header">
                    <h3 class="card-title">Royal Learning Tips</h3>
                    <div class="card-icon"><i class="fas fa-lightbulb"></i></div>
                </div>
                <div class="card-body">
                    <div class="skills-list">${renderLearningTips()}</div>
                </div>
            </div>
        `;

        setupSkillsListeners();
        revealSkillsCards();

    } catch (err) {
        console.error('[SKILLS] Load error:', err);
        pageContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-triangle-exclamation"></i>
                <h3>Unable to Load Skills</h3>
                <p>Please try again later.</p>
            </div>`;
    }
}

// ── Render Skills ──────────────────────────
function renderSkills(skills) {
    return skills.map(skill => `
        <div class="skill-item">
            <div class="skill-header">
                <div>
                    <div class="skill-name">${skill.completed ? '🏆 ' : ''}${escapeSkillHTML(skill.name)}</div>
                    <div class="card-label mt-10">${capitalizeFirst(skill.category)}</div>
                </div>
                <span class="skill-progress">${skill.progress}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width:${skill.progress}%"></div>
            </div>
            ${skill.description ? `<div class="card-label mt-10">${escapeSkillHTML(skill.description)}</div>` : ''}
            <div class="mt-20">
                <button class="btn-primary" onclick="showSkillProgressModal('${skill.id}')">
                    <i class="fas fa-arrow-up"></i> Update Progress
                </button>
                <button class="btn-secondary" onclick="deleteSkill('${skill.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

// ── Learning Tips ──────────────────────────
function renderLearningTips() {
    const tips = [
        'Practice consistently every day.',
        'Apply concepts through projects.',
        'Track progress weekly.',
        'Learn from communities.',
        'Teach others to strengthen memory.'
    ];
    return tips.map(tip => `
        <div class="skill-item">
            <div class="skill-header">
                <span class="skill-name">
                    <i class="fas fa-check-circle text-gold"></i> ${tip}
                </span>
            </div>
        </div>`).join('');
}

// ── Listeners ──────────────────────────────
function setupSkillsListeners() {
    document.getElementById('addSkillBtn')?.addEventListener('click', showSkillModal);
}

// ── Skill Modal ────────────────────────────
function showSkillModal() {
    document.getElementById('skillModal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'skillModal'; modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Add New Skill</h3>
                    <button class="reminder-btn" id="closeSkillModal"><i class="fas fa-times"></i></button>
                </div>
                <div class="card-body">
                    <div class="input-group">
                        <i class="fas fa-star input-icon"></i>
                        <input type="text" id="skillName" class="form-input" placeholder="Skill name">
                    </div>
                    <div class="input-group">
                        <i class="fas fa-tag input-icon"></i>
                        <select id="skillCategory" class="form-input">
                            <option value="programming">Programming</option>
                            <option value="design">Design</option>
                            <option value="business">Business</option>
                            <option value="language">Language</option>
                            <option value="health">Health</option>
                            <option value="creative">Creative</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <i class="fas fa-align-left input-icon"></i>
                        <textarea id="skillDescription" class="form-input" placeholder="Description (optional)"></textarea>
                    </div>
                    <div id="skillMessage" class="form-message mt-10"></div>
                    <button class="btn-royal mt-20" id="saveSkillBtn">
                        Add Skill <i class="fas fa-graduation-cap"></i>
                    </button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('show'));

    document.getElementById('closeSkillModal').addEventListener('click', closeSkillModal);
    document.getElementById('saveSkillBtn').addEventListener('click', handleAddSkill);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeSkillModal(); });
}

function closeSkillModal() {
    const modal = document.getElementById('skillModal');
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
}

// ── Add Skill ──────────────────────────────
async function handleAddSkill() {
    const currentUser = JSON.parse(localStorage.getItem('synapseCurrentUser'));
    const name        = document.getElementById('skillName')       ?.value.trim();
    const category    = document.getElementById('skillCategory')   ?.value;
    const description = document.getElementById('skillDescription')?.value.trim() || '';
    const msgEl       = document.getElementById('skillMessage');

    if (!name) { showSkillMessage(msgEl, 'Enter a skill name', 'error'); return; }

    try {
        const skills = await safeSkillsRead('skills.json');
        const exists = skills.some(s => s.userId === currentUser.id && s.name.toLowerCase() === name.toLowerCase());
        if (exists) { showSkillMessage(msgEl, 'Skill already exists', 'error'); return; }

        skills.push({
            id: generateSkillId(), userId: currentUser.id,
            name, category, description,
            progress: 0, completed: false,
            createdAt: new Date().toISOString()
        });
        await window.lifeOS.writeData('skills.json', skills);
        showToast('Skill added successfully', 'success');
        window.lifeOS?.showNotification?.({ title: 'Synapse Skills', body: `"${name}" added to skills` });
        closeSkillModal();
        loadSkillsPage();
    } catch (err) {
        console.error('[SKILLS] Add error:', err);
        showSkillMessage(msgEl, 'Unable to add skill', 'error');
    }
}

// ── Progress Modal ─────────────────────────
function showSkillProgressModal(skillId) {
    document.getElementById('skillProgressModal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'skillProgressModal'; modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Update Progress</h3>
                    <button class="reminder-btn" id="closeProgressModal"><i class="fas fa-times"></i></button>
                </div>
                <div class="card-body">
                    <div class="input-group">
                        <i class="fas fa-percent input-icon"></i>
                        <input type="number" id="skillProgress" class="form-input"
                            placeholder="Progress (0–100)" min="0" max="100">
                    </div>
                    <button class="btn-royal mt-20" id="saveProgressBtn">
                        Save Progress <i class="fas fa-check"></i>
                    </button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('show'));

    document.getElementById('closeProgressModal').addEventListener('click', closeProgressModal);
    document.getElementById('saveProgressBtn').addEventListener('click', () => handleUpdateProgress(skillId));
    modal.addEventListener('click', (e) => { if (e.target === modal) closeProgressModal(); });
}

function closeProgressModal() {
    const modal = document.getElementById('skillProgressModal');
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
}

async function handleUpdateProgress(skillId) {
    const progress = Number(document.getElementById('skillProgress')?.value);
    if (isNaN(progress) || progress < 0 || progress > 100) return;

    try {
        let skills = await safeSkillsRead('skills.json');
        skills = skills.map(s => s.id === skillId
            ? { ...s, progress, completed: progress >= 100, lastUpdated: new Date().toISOString() }
            : s);
        await window.lifeOS.writeData('skills.json', skills);
        showToast('Progress updated', 'success');
        closeProgressModal();
        loadSkillsPage();
    } catch (err) { console.error('[SKILLS] Progress update error:', err); }
}

// ── Delete ─────────────────────────────────
async function deleteSkill(skillId) {
    if (!confirm('Delete this skill?')) return;
    try {
        let skills = await safeSkillsRead('skills.json');
        skills = skills.filter(s => s.id !== skillId);
        await window.lifeOS.writeData('skills.json', skills);
        showToast('Skill deleted', 'success');
        loadSkillsPage();
    } catch (err) { console.error('[SKILLS] Delete error:', err); }
}

// ── Helpers ────────────────────────────────
function calculateAverageProgress(skills) {
    if (!skills.length) return 0;
    return Math.round(skills.reduce((sum, s) => sum + s.progress, 0) / skills.length);
}

function capitalizeFirst(text) {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function escapeSkillHTML(str) {
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function revealSkillsCards() {
    document.querySelectorAll('.card').forEach((card, i) => {
        card.style.opacity   = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = `opacity 0.5s ease ${i * 100}ms, transform 0.5s ease ${i * 100}ms`;
        requestAnimationFrame(() => { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; });
    });
}

function showSkillMessage(el, msg, type) {
    if (!el) return; el.textContent = msg; el.className = `form-message ${type}`;
}

async function safeSkillsRead(file) {
    try {
        const data = await window.lifeOS.readData(file);
        return Array.isArray(data) ? data : [];
    } catch { return []; }
}

function generateSkillId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// ── Global Exports ─────────────────────────
window.loadSkillsPage         = loadSkillsPage;
window.showSkillModal         = showSkillModal;
window.closeSkillModal        = closeSkillModal;
window.showSkillProgressModal = showSkillProgressModal;
window.closeProgressModal     = closeProgressModal;
window.deleteSkill            = deleteSkill;