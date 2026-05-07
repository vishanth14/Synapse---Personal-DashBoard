// ============================================
// dashboard.js — Synapse Royal Dashboard (FIXED)
// ============================================

let dashboardChart = null;

async function loadDashboard() {
    const pageContent = document.getElementById('pageContent');
    if (!pageContent) return;

    pageContent.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;

    try {
        const currentUser = JSON.parse(localStorage.getItem('synapseCurrentUser'));
        if (!currentUser) {
            pageContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-lock"></i>
                    <h3>Authentication Required</h3>
                    <p>Please login to continue.</p>
                </div>`;
            return;
        }

        // Parallel data fetch
        const [wellnessData, financeData, remindersData, skillsData] = await Promise.all([
            safeRead('wellness.json'),
            safeRead('finance.json'),
            safeRead('reminders.json'),
            safeRead('skills.json')
        ]);

        const uid           = currentUser.id;
        const userWellness  = (wellnessData  || []).filter(i => i.userId === uid);
        const userFinance   = (financeData   || []).find(i => i.userId === uid) || {};
        const userReminders = (remindersData || []).filter(i => i.userId === uid);
        const userSkills    = (skillsData    || []).filter(i => i.userId === uid);
        const pendingCount  = userReminders.filter(r => !r.completed).length;

        // Today's wellness
        const today       = new Date().toISOString().split('T')[0];
        const todayWell   = userWellness.find(w => w.date === today) || {};

        // Recompute score if available
        let wellScore = todayWell.overallScore || 0;
        if (typeof window.computeWellnessScore === 'function' && todayWell.date) {
            wellScore = window.computeWellnessScore(todayWell).total;
        }

        pageContent.innerHTML = `
            <div class="page-header">
                <h2 class="page-title">Dashboard</h2>
                <p class="page-subtitle">Welcome back, ${escapeHTML(currentUser.name)}! 👑</p>
            </div>

            <div class="dashboard-cards">
                <div class="card stagger-item">
                    <div class="card-header">
                        <h3 class="card-title">Wellness Score</h3>
                        <div class="card-icon"><i class="fas fa-heartbeat"></i></div>
                    </div>
                    <div class="card-body">
                        <div class="card-value counter" data-target="${wellScore}">0</div>
                        <div class="card-label">Your wellness score today</div>
                    </div>
                    <div class="card-footer">
                        <span>Track daily</span>
                        <a href="javascript:void(0)" onclick="navigateTo('wellness')" class="text-gold">View →</a>
                    </div>
                </div>

                <div class="card stagger-item">
                    <div class="card-header">
                        <h3 class="card-title">Finance Balance</h3>
                        <div class="card-icon"><i class="fas fa-coins"></i></div>
                    </div>
                    <div class="card-body">
                        <div class="card-value">₹${formatNumber(userFinance.balance || 0)}</div>
                        <div class="card-label">Current available balance</div>
                    </div>
                    <div class="card-footer">
                        <span>Last updated today</span>
                        <a href="javascript:void(0)" onclick="navigateTo('finance')" class="text-gold">View →</a>
                    </div>
                </div>

                <div class="card stagger-item">
                    <div class="card-header">
                        <h3 class="card-title">Skills</h3>
                        <div class="card-icon"><i class="fas fa-graduation-cap"></i></div>
                    </div>
                    <div class="card-body">
                        <div class="card-value">${userSkills.length}</div>
                        <div class="card-label">Active learning tracks</div>
                    </div>
                    <div class="card-footer">
                        <span>Keep learning</span>
                        <a href="javascript:void(0)" onclick="navigateTo('skills')" class="text-gold">View →</a>
                    </div>
                </div>

                <div class="card stagger-item">
                    <div class="card-header">
                        <h3 class="card-title">Reminders</h3>
                        <div class="card-icon"><i class="fas fa-bell"></i></div>
                    </div>
                    <div class="card-body">
                        <div class="card-value">${pendingCount}</div>
                        <div class="card-label">Pending reminders</div>
                    </div>
                    <div class="card-footer">
                        <span>Stay on track</span>
                        <a href="javascript:void(0)" onclick="navigateTo('reminders')" class="text-gold">View →</a>
                    </div>
                </div>
            </div>

            <!-- Productivity Analytics Chart -->
            <div class="chart-container mt-20">
                <div class="chart-header">
                    <h3 class="chart-title">Productivity Analytics</h3>
                    <div class="chart-selector">
                        <button class="chart-btn active" data-period="weekly">Weekly</button>
                        <button class="chart-btn" data-period="monthly">Monthly</button>
                    </div>
                </div>
                <div class="chart-wrapper">
                    <canvas id="dashboardChart"></canvas>
                </div>
            </div>
        `;

        animateCounters();
        initializeDashboardChart(userWellness, userFinance, userSkills);
        revealCards();
        updateNotificationBadge(pendingCount);

        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                updateChartPeriod(btn.dataset.period, userWellness, userSkills);
            });
        });

    } catch (err) {
        console.error('[DASHBOARD] Load error:', err);
        pageContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-triangle-exclamation"></i>
                <h3>Unable to Load Dashboard</h3>
                <p>Please try again later.</p>
            </div>`;
    }
}

// ── Chart (REAL DATA) ──────────────────────
function initializeDashboardChart(userWellness, userFinance, userSkills) {
    const canvas = document.getElementById('dashboardChart');
    if (!canvas) return;
    if (dashboardChart) { dashboardChart.destroy(); dashboardChart = null; }

    const { labels, wellnessScores, financeData, skillProgress } =
        buildWeeklyChartData(userWellness, userFinance, userSkills);

    dashboardChart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Wellness Score',
                    data: wellnessScores,
                    borderColor: '#c9a84c',
                    backgroundColor: 'rgba(201,168,76,0.12)',
                    tension: 0.4, fill: true, borderWidth: 3,
                    pointRadius: 4, pointHoverRadius: 7,
                    pointBackgroundColor: '#c9a84c',
                    yAxisID: 'y'
                },
                {
                    label: 'Avg Skill Progress (%)',
                    data: skillProgress,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52,152,219,0.08)',
                    tension: 0.4, fill: false, borderWidth: 2,
                    borderDash: [4, 4],
                    pointRadius: 3, pointHoverRadius: 6,
                    pointBackgroundColor: '#3498db',
                    yAxisID: 'y'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: '#f0e6d3', font: { family: 'Raleway' }, boxWidth: 14 } },
                tooltip: {
                    backgroundColor: 'rgba(17,34,64,0.95)',
                    titleColor: '#c9a84c',
                    bodyColor: '#f0e6d3'
                }
            },
            scales: {
                x: { ticks: { color: '#a89070' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: {
                    beginAtZero: true, max: 100,
                    ticks: { color: '#a89070', callback: v => v + ' pts' },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                }
            }
        }
    });
}

// ── Build Weekly Data ──────────────────────
function buildWeeklyChartData(userWellness, userFinance, userSkills) {
    const days   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const labels = [];
    const wellnessScores = [];
    const financeData    = [];

    // Get dates for last 7 days (Mon–Sun relative to today)
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        labels.push(dayName);

        // Wellness score for this date
        const wEntry = userWellness.find(w => w.date === dateStr);
        if (wEntry) {
            const score = wEntry.overallScore ||
                (typeof window.computeWellnessScore === 'function'
                    ? window.computeWellnessScore(wEntry).total
                    : 0);
            wellnessScores.push(score);
        } else {
            wellnessScores.push(0);
        }

        // Finance balance changes (optional line)
        const txnsDayTotal = (userFinance.transactions || [])
            .filter(t => new Date(t.createdAt).toISOString().split('T')[0] === dateStr)
            .reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum - t.amount, 0);
        financeData.push(txnsDayTotal);
    }

    // Average skill progress as a flat line (doesn't change per day)
    const avgSkill = userSkills.length
        ? Math.round(userSkills.reduce((s, sk) => s + (sk.progress || 0), 0) / userSkills.length)
        : 0;
    const skillProgress = labels.map(() => avgSkill);

    return { labels, wellnessScores, financeData, skillProgress };
}

function buildMonthlyChartData(userWellness, userSkills) {
    const labels         = [];
    const wellnessScores = [];

    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }));

        const wEntry = userWellness.find(w => w.date === dateStr);
        wellnessScores.push(wEntry
            ? (wEntry.overallScore || (window.computeWellnessScore ? window.computeWellnessScore(wEntry).total : 0))
            : 0
        );
    }

    const avgSkill = userSkills.length
        ? Math.round(userSkills.reduce((s, sk) => s + (sk.progress || 0), 0) / userSkills.length)
        : 0;

    return { labels, wellnessScores, skillProgress: labels.map(() => avgSkill) };
}

function updateChartPeriod(period, userWellness, userSkills) {
    if (!dashboardChart) return;

    const built = period === 'weekly'
        ? buildWeeklyChartData(userWellness, {}, userSkills)
        : buildMonthlyChartData(userWellness, userSkills);

    dashboardChart.data.labels                   = built.labels;
    dashboardChart.data.datasets[0].data         = built.wellnessScores;
    dashboardChart.data.datasets[1].data         = built.skillProgress;
    dashboardChart.update();
}

// ── navigateTo helper (called by card links) ─
function navigateTo(page) {
    if (typeof window.loadPage === 'function') window.loadPage(page);
}
window.navigateTo = navigateTo;

// ── Animations ─────────────────────────────
function animateCounters() {
    document.querySelectorAll('.counter').forEach(counter => {
        const target = Number(counter.dataset.target) || 0;
        if (target === 0) { counter.textContent = 0; return; }
        let current = 0;
        const step = target / 50;
        const tick = () => {
            current += step;
            if (current < target) { counter.textContent = Math.floor(current); requestAnimationFrame(tick); }
            else { counter.textContent = target; }
        };
        tick();
    });
}

function revealCards() {
    const observer = new IntersectionObserver(
        (entries) => entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.style.opacity   = '1';
                e.target.style.transform = 'translateY(0)';
                observer.unobserve(e.target);
            }
        }),
        { threshold: 0.1 }
    );
    document.querySelectorAll('.card').forEach((card, i) => {
        card.style.opacity    = '0';
        card.style.transform  = 'translateY(20px)';
        card.style.transition = `opacity 0.5s ease ${i * 80}ms, transform 0.5s ease ${i * 80}ms`;
        observer.observe(card);
    });
}

// ── Utilities ──────────────────────────────
function formatNumber(num) {
    return Number(num).toLocaleString('en-IN');
}

function escapeHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

async function safeRead(file) {
    try {
        if (window.lifeOS?.readData) {
            const data = await window.lifeOS.readData(file);
            return Array.isArray(data) ? data : [];
        }
        // localStorage fallback
        const raw = localStorage.getItem(`synapse_${file}`);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function updateNotificationBadge(count) {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    badge.textContent   = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
}

// ── Global Exports ─────────────────────────
window.loadDashboard       = loadDashboard;
window.initDashboardCharts = initializeDashboardChart;