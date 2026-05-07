// ============================================
// wellness.js — Synapse Royal Wellness Module (FIXED)
// ============================================
//
// SCORING LOGIC (Total 100 points):
//   Calories        → 20 pts  (target: 2000 kcal consumed)
//   Water           → 20 pts  (target: 4 litres/day)
//   Exercise        → 20 pts  (target: 400 calories burned)
//   Sleep           → 20 pts  (target: 8 hrs; penalty for <6 hrs)
//   Mood            → 20 pts  (energetic=20, happy=18, neutral=12, sad=6, angry=2)
//
// WATER TIER SCORING (litres):
//   0 – <1 L  → proportional,    max  5 pts
//   1 – <2 L  → proportional,    max 10 pts
//   2 – <3 L  → proportional,    max 15 pts
//   3 – <4 L  → proportional,    max 19 pts
//   4 L+      → full             20 pts
//
// EXERCISE CALORIES BURNED TIER SCORING:
//   0 – <100 cal  → proportional, max  5 pts
//   100 – <200    → proportional, max 10 pts
//   200 – <300    → proportional, max 15 pts
//   300 – <400    → proportional, max 19 pts
//   400+ cal      → full          20 pts
// ============================================

let wellnessChart = null;

// ── Scoring Constants ──────────────────────
const WELLNESS_TARGETS = {
    calories:         2000,   // kcal/day consumed
    waterLitres:      4,      // litres/day
    exerciseCalories: 400,    // calories burned/day
    sleepHours:       8       // hours/night
};

const MOOD_SCORES = {
    energetic: 20,
    happy:     18,
    neutral:   12,
    sad:       6,
    angry:     2
};

// ── Tiered Water Score (0–20 pts for 0–4+ litres) ─
function computeWaterScore(litres) {
    const L = litres || 0;
    let score;
    if      (L >= 4)  score = 20;
    else if (L >= 3)  score = Math.round(15 + ((L - 3) / 1) * 4);   // 15–19 pts
    else if (L >= 2)  score = Math.round(10 + ((L - 2) / 1) * 5);   // 10–14 pts
    else if (L >= 1)  score = Math.round(5  + ((L - 1) / 1) * 5);   //  5– 9 pts
    else              score = Math.round((L / 1) * 5);               //  0– 4 pts
    return Math.min(20, Math.max(0, score));
}

// ── Tiered Exercise Calories Score (0–20 pts for 0–400+ kcal burned) ─
function computeExerciseScore(calsBurned) {
    const C = calsBurned || 0;
    let score;
    if      (C >= 400) score = 20;
    else if (C >= 300) score = Math.round(15 + ((C - 300) / 100) * 4);  // 15–19 pts
    else if (C >= 200) score = Math.round(10 + ((C - 200) / 100) * 5);  // 10–14 pts
    else if (C >= 100) score = Math.round(5  + ((C - 100) / 100) * 5);  //  5– 9 pts
    else               score = Math.round((C / 100) * 5);               //  0– 4 pts
    return Math.min(20, Math.max(0, score));
}

// ── Score Calculator ───────────────────────
function computeWellnessScore(item) {
    // Calories consumed: 20 pts — full score at target, proportional below
    const calScore = Math.min(20, Math.round((item.calories / WELLNESS_TARGETS.calories) * 20));

    // Water: tiered scoring (litres)
    const waterScore = computeWaterScore(item.waterLitres);

    // Exercise: tiered scoring (calories burned)
    const exScore = computeExerciseScore(item.exerciseCalories);

    // Sleep: 20 pts — full at 8 hrs
    //   < 6 hrs → heavy penalty (max 8 pts)
    //   6–7 hrs → partial (max 14 pts)
    //   7–8 hrs → good (max 18 pts)
    //   8+ hrs  → full 20 pts
    let sleepScore;
    const sleep = item.sleepHours || 0;
    if      (sleep >= 8)  sleepScore = 20;
    else if (sleep >= 7)  sleepScore = Math.round(14 + ((sleep - 7) / 1) * 6);
    else if (sleep >= 6)  sleepScore = Math.round(8  + ((sleep - 6) / 1) * 6);
    else                  sleepScore = Math.round((sleep / 6) * 8);
    sleepScore = Math.min(20, Math.max(0, sleepScore));

    // Mood: fixed lookup
    const moodScore = MOOD_SCORES[item.mood] || MOOD_SCORES.neutral;

    const total = calScore + waterScore + exScore + sleepScore + moodScore;

    return {
        total:     Math.min(100, total),
        breakdown: { calScore, waterScore, exScore, sleepScore, moodScore }
    };
}

async function loadWellnessPage() {
    const pageContent = document.getElementById('pageContent');
    if (!pageContent) return;

    const currentUser = JSON.parse(localStorage.getItem('synapseCurrentUser'));
    if (!currentUser) {
        pageContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-lock"></i>
                <h3>Authentication Required</h3>
                <p>Please login to access wellness.</p>
            </div>`;
        return;
    }

    pageContent.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;

    try {
        const wellnessData = await safeWellnessRead('wellness.json');
        const userWellness = wellnessData.filter(item => item.userId === currentUser.id);
        const todayData    = getTodayWellness(userWellness);
        const streak       = calculateWellnessStreak(userWellness);
        const scoreInfo    = computeWellnessScore(todayData);

        pageContent.innerHTML = `
            <div class="page-header">
                <h2 class="page-title">Wellness</h2>
                <p class="page-subtitle">Your royal health command centre</p>
            </div>

            <!-- Wellness Stats -->
            <div class="wellness-cards">
                ${createWellnessCard('Calories',         'fa-utensils',  todayData.calories          || 0,   'calories',  `Goal: ${WELLNESS_TARGETS.calories} kcal`,        scoreInfo.breakdown.calScore)}
                ${createWellnessCard('Water (L)',         'fa-water',     (todayData.waterLitres       || 0).toFixed(1), 'water',     `Goal: ${WELLNESS_TARGETS.waterLitres} litres`,   scoreInfo.breakdown.waterScore)}
                ${createWellnessCard('Calories Burned',  'fa-dumbbell',  todayData.exerciseCalories   || 0,   'exercise',  `Goal: ${WELLNESS_TARGETS.exerciseCalories} kcal burned`, scoreInfo.breakdown.exScore)}
                ${createWellnessCard('Sleep (hrs)',       'fa-bed',       todayData.sleepHours         || 0,   'sleep',     `Goal: ${WELLNESS_TARGETS.sleepHours} hrs`,       scoreInfo.breakdown.sleepScore)}
            </div>

            <!-- Mood Tracker -->
            <div class="card mt-20 stagger-item">
                <div class="card-header">
                    <h3 class="card-title">Mood Tracker</h3>
                    <div class="card-icon"><i class="fas fa-face-smile"></i></div>
                </div>
                <div class="card-body">
                    <div class="brand-features">
                        ${createMoodButton('happy',    'fa-smile',     todayData.mood, 18)}
                        ${createMoodButton('neutral',  'fa-meh',       todayData.mood, 12)}
                        ${createMoodButton('sad',      'fa-frown',     todayData.mood, 6)}
                        ${createMoodButton('angry',    'fa-angry',     todayData.mood, 2)}
                        ${createMoodButton('energetic','fa-grin-stars',todayData.mood, 20)}
                    </div>
                    <p class="card-label mt-20">
                        <strong class="text-gold">Current Mood:</strong>
                        <span id="currentMood"> ${capitalize(todayData.mood || 'neutral')}</span>
                        <span class="text-gold" style="margin-left:8px;">(${scoreInfo.breakdown.moodScore}/20 pts)</span>
                    </p>
                </div>
            </div>

            <!-- Score Breakdown & Streak -->
            <div class="dashboard-cards mt-20">
                <div class="card stagger-item">
                    <div class="card-header">
                        <h3 class="card-title">Wellness Score</h3>
                        <div class="card-icon"><i class="fas fa-star"></i></div>
                    </div>
                    <div class="card-body">
                        <div class="card-value">${scoreInfo.total}<span style="font-size:1rem;color:var(--text-secondary)">/100</span></div>
                        <div class="card-label">Today's wellness score</div>
                        <!-- Score Breakdown -->
                        <div class="skills-list mt-20">
                            ${scoreBreakdownBar('Calories',        scoreInfo.breakdown.calScore,   20)}
                            ${scoreBreakdownBar('Water (L)',        scoreInfo.breakdown.waterScore, 20)}
                            ${scoreBreakdownBar('Cal. Burned',      scoreInfo.breakdown.exScore,    20)}
                            ${scoreBreakdownBar('Sleep',            scoreInfo.breakdown.sleepScore, 20)}
                            ${scoreBreakdownBar('Mood',             scoreInfo.breakdown.moodScore,  20)}
                        </div>
                        <button class="btn-royal mt-20" id="calculateScoreBtn">
                            Recalculate Score <i class="fas fa-calculator"></i>
                        </button>
                    </div>
                </div>
                <div class="card stagger-item">
                    <div class="card-header">
                        <h3 class="card-title">Wellness Streak</h3>
                        <div class="card-icon"><i class="fas fa-fire"></i></div>
                    </div>
                    <div class="card-body">
                        <div class="card-value">${streak}</div>
                        <div class="card-label">Consecutive days tracked</div>
                        <div class="card-label mt-20" style="font-size:0.85rem;">
                            <strong class="text-gold">Sleep tip:</strong>
                            ${getSleepTip(todayData.sleepHours || 0)}
                        </div>
                        <div class="card-label mt-10" style="font-size:0.85rem;">
                            <strong class="text-gold">Exercise tip:</strong>
                            ${getExerciseTip(todayData.exerciseCalories || 0)}
                        </div>
                        <div class="card-label mt-10" style="font-size:0.85rem;">
                            <strong class="text-gold">Water tip:</strong>
                            ${getWaterTip(todayData.waterLitres || 0)}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Chart -->
            <div class="chart-container mt-20">
                <div class="chart-header">
                    <h3 class="chart-title">Wellness Trends</h3>
                    <div class="chart-selector">
                        <button class="chart-btn active" data-chart="week">Week</button>
                        <button class="chart-btn" data-chart="month">Month</button>
                    </div>
                </div>
                <div class="chart-wrapper">
                    <canvas id="wellnessChart"></canvas>
                </div>
            </div>

            <!-- Tips -->
            <div class="card mt-20 stagger-item">
                <div class="card-header">
                    <h3 class="card-title">Royal Wellness Tips</h3>
                    <div class="card-icon"><i class="fas fa-lightbulb"></i></div>
                </div>
                <div class="card-body">
                    <div class="skills-list">${renderWellnessTips()}</div>
                </div>
            </div>
        `;

        setupWellnessListeners(userWellness, currentUser);
        initWellnessChart(userWellness);
        animateWellnessCards();

    } catch (err) {
        console.error('[WELLNESS] Load error:', err);
        pageContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-triangle-exclamation"></i>
                <h3>Error Loading Wellness</h3>
                <p>Please try again later.</p>
            </div>`;
    }
}

// ── Score Breakdown Bar ────────────────────
function scoreBreakdownBar(label, score, max) {
    const pct = Math.round((score / max) * 100);
    return `
        <div class="skill-item">
            <div class="skill-header">
                <span class="skill-name">${label}</span>
                <span class="skill-progress">${score}/${max} pts</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width:${pct}%"></div>
            </div>
        </div>`;
}

// ── Sleep Tip ──────────────────────────────
function getSleepTip(hours) {
    if (hours === 0)  return 'Log your sleep to get a score.';
    if (hours < 5)    return '⚠️ Very low sleep — heavily impacts your score and health.';
    if (hours < 6)    return '😴 Try to get at least 6 hours for a better score.';
    if (hours < 7)    return '🌙 Good start! 7–8 hrs is the sweet spot.';
    if (hours < 8)    return '👍 Almost perfect! Aim for 8 hrs for full points.';
    return '✅ Excellent sleep! Full points earned.';
}

// ── Exercise Calories Tip ──────────────────
function getExerciseTip(calsBurned) {
    if (calsBurned === 0)  return 'Log your workout calories to earn exercise points.';
    if (calsBurned < 100)  return '🔥 Good start! Keep moving — aim for 100+ kcal.';
    if (calsBurned < 200)  return '💪 Nice effort! Push towards 200 kcal for more points.';
    if (calsBurned < 300)  return '🏃 Great work! 300 kcal is within reach.';
    if (calsBurned < 400)  return '🚀 Almost there! 400 kcal burned = full score.';
    return '🏆 Outstanding! Full exercise points earned.';
}

// ── Water Tip (litres) ─────────────────────
function getWaterTip(litres) {
    if (litres === 0)   return 'Log your water intake to earn hydration points.';
    if (litres < 1)     return '💧 Very low — try to drink at least 1 litre.';
    if (litres < 2)     return '💧💧 Keep sipping! Aim for 2–3 litres.';
    if (litres < 3)     return '🥤 Good hydration! 3 litres earns you 15 pts.';
    if (litres < 4)     return '💦 Almost there! 4 litres = full 20 pts.';
    return '✅ Perfectly hydrated! Full water points earned.';
}

// ── Component Builders ─────────────────────
function createWellnessCard(title, icon, value, type, goal, pts) {
    return `
        <div class="wellness-card stagger-item">
            <i class="fas ${icon} wellness-icon"></i>
            <div class="wellness-value">${value}</div>
            <div class="wellness-label">${title}</div>
            <div style="font-size:0.75rem;color:var(--text-secondary);margin:4px 0;">${goal}</div>
            <div style="font-size:0.8rem;color:#c9a84c;font-weight:600;">${pts}/20 pts</div>
            <button class="btn-primary mt-10" onclick="showWellnessModal('${type}')">
                Update
            </button>
        </div>`;
}

function createMoodButton(mood, icon, currentMood, pts) {
    return `
        <button class="feature-pill mood-pill ${currentMood === mood ? 'active' : ''}"
            onclick="updateMood('${mood}')"
            title="${pts} points">
            <i class="fas ${icon}"></i> ${capitalize(mood)}
        </button>`;
}

function renderWellnessTips() {
    const tips = [
        `Drink ${WELLNESS_TARGETS.waterLitres} litres of water daily for full water points (3 L = 15 pts, 4 L = 20 pts).`,
        `Sleep ${WELLNESS_TARGETS.sleepHours} hours for maximum sleep score. Below 6 hrs = heavy penalty.`,
        `Burn ${WELLNESS_TARGETS.exerciseCalories} kcal through exercise for full points — every 100 kcal adds ~5 pts.`,
        'Choose "Energetic" or "Happy" mood to maximise your mood score.',
        `Eat around ${WELLNESS_TARGETS.calories} kcal per day — log it to earn full calorie points.`
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
function setupWellnessListeners(userWellness, currentUser) {
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateWellnessChart(btn.dataset.chart, currentUser);
        });
    });
    document.getElementById('calculateScoreBtn')?.addEventListener('click', calculateWellnessScore);
}

// ── Chart ──────────────────────────────────
function initWellnessChart(data) {
    const canvas = document.getElementById('wellnessChart');
    if (!canvas) return;
    if (wellnessChart) { wellnessChart.destroy(); wellnessChart = null; }

    const recent = [...data].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-7);

    const labels = recent.length
        ? recent.map(item => new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }))
        : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

    const scores = recent.length
        ? recent.map(item => item.overallScore || computeWellnessScore(item).total)
        : [0, 0, 0, 0, 0, 0, 0];

    wellnessChart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Wellness Score',
                data: scores,
                borderColor: '#c9a84c',
                backgroundColor: 'rgba(201,168,76,0.1)',
                tension: 0.4, fill: true, borderWidth: 3,
                pointRadius: 5, pointHoverRadius: 7,
                pointBackgroundColor: '#c9a84c'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#f0e6d3', font: { family: 'Raleway' } } },
                tooltip: {
                    backgroundColor: 'rgba(17,34,64,0.95)',
                    titleColor: '#c9a84c',
                    bodyColor: '#f0e6d3',
                    callbacks: {
                        label: ctx => `Score: ${ctx.parsed.y}/100`
                    }
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

async function updateWellnessChart(period, currentUser) {
    if (!wellnessChart) return;
    try {
        const wellnessData = await safeWellnessRead('wellness.json');
        const userData = wellnessData
            .filter(item => item.userId === currentUser.id)
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        const limit    = period === 'week' ? 7 : 30;
        const filtered = userData.slice(-limit);

        wellnessChart.data.labels = filtered.map(item =>
            new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        );
        wellnessChart.data.datasets[0].data = filtered.map(item =>
            item.overallScore || computeWellnessScore(item).total
        );
        wellnessChart.update();
    } catch (err) { console.error('[WELLNESS] Chart update error:', err); }
}

// ── Wellness Modal ─────────────────────────
function showWellnessModal(type) {
    document.getElementById('wellnessModal')?.remove();

    const labels = {
        calories: 'Calories Consumed (kcal)',
        water:    'Water Intake (litres)',
        exercise: 'Calories Burned (kcal)',
        sleep:    'Sleep (hours)'
    };
    const placeholders = {
        calories: `e.g. 1800 (goal: ${WELLNESS_TARGETS.calories} kcal)`,
        water:    `e.g. 2.5 (goal: ${WELLNESS_TARGETS.waterLitres} litres)`,
        exercise: `e.g. 250 (goal: ${WELLNESS_TARGETS.exerciseCalories} kcal burned)`,
        sleep:    `e.g. 7.5 (goal: ${WELLNESS_TARGETS.sleepHours} hrs)`
    };
    // Step hints shown below the input
    const hints = {
        water:    '💡 Tip: 3 L = 15 pts · 3.5 L = 17 pts · 4 L = full 20 pts',
        exercise: '💡 Tip: Every 100 kcal burned ≈ 5 pts · 400 kcal = full 20 pts'
    };

    const modal = document.createElement('div');
    modal.id = 'wellnessModal'; modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Update ${labels[type] || capitalize(type)}</h3>
                    <button class="reminder-btn" id="closeWellnessModal"><i class="fas fa-times"></i></button>
                </div>
                <div class="card-body">
                    <div class="input-group">
                        <i class="fas fa-hashtag input-icon"></i>
                        <input type="number" id="wellnessValue" class="form-input"
                            placeholder="${placeholders[type] || 'Enter value'}" min="0" step="0.1">
                    </div>
                    ${hints[type] ? `<p style="font-size:0.8rem;color:var(--text-secondary);margin-top:8px;">${hints[type]}</p>` : ''}
                    <div id="wellnessModalMsg" class="form-message mt-10"></div>
                    <button class="btn-royal mt-20" id="saveWellnessBtn">
                        Save <i class="fas fa-check"></i>
                    </button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('show'));

    document.getElementById('closeWellnessModal').addEventListener('click', closeWellnessModal);
    document.getElementById('saveWellnessBtn').addEventListener('click', () => {
        const value = parseFloat(document.getElementById('wellnessValue')?.value);
        const msgEl = document.getElementById('wellnessModalMsg');
        if (isNaN(value) || value < 0) {
            if (msgEl) { msgEl.textContent = 'Enter a valid number.'; msgEl.className = 'form-message error'; }
            return;
        }
        updateWellnessData(type, value);
    });
    modal.addEventListener('click', (e) => { if (e.target === modal) closeWellnessModal(); });
}

function closeWellnessModal() {
    const modal = document.getElementById('wellnessModal');
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
}

// ── Update Wellness Data ───────────────────
async function updateWellnessData(type, value) {
    const currentUser = JSON.parse(localStorage.getItem('synapseCurrentUser'));
    const today = new Date().toISOString().split('T')[0];

    // Map UI type → JSON field name
    const fieldMap = {
        exercise: 'exerciseCalories',  // calories burned
        water:    'waterLitres',        // litres
        sleep:    'sleepHours'
    };
    const field = fieldMap[type] || type;

    try {
        let data  = await safeWellnessRead('wellness.json');
        let found = false;
        data = data.map(item => {
            if (item.userId === currentUser.id && item.date === today) {
                found = true;
                const updated = { ...item, [field]: value };
                updated.overallScore = computeWellnessScore(updated).total;
                return updated;
            }
            return item;
        });
        if (!found) {
            const newEntry = {
                id: generateWellnessId(), userId: currentUser.id, date: today,
                calories: 0, waterLitres: 0, exerciseCalories: 0, sleepHours: 0,
                overallScore: 0, mood: 'neutral', [field]: value
            };
            newEntry.overallScore = computeWellnessScore(newEntry).total;
            data.push(newEntry);
        }
        await window.lifeOS.writeData('wellness.json', data);
        showToast('Wellness updated ✅', 'success');
        closeWellnessModal();
        loadWellnessPage();
    } catch (err) {
        console.error('[WELLNESS] Update error:', err);
        showToast('Failed to save. Please try again.', 'error');
    }
}

// ── Mood ───────────────────────────────────
async function updateMood(mood) {
    const currentUser = JSON.parse(localStorage.getItem('synapseCurrentUser'));
    const today = new Date().toISOString().split('T')[0];
    try {
        let data  = await safeWellnessRead('wellness.json');
        let found = false;
        data = data.map(item => {
            if (item.userId === currentUser.id && item.date === today) {
                found = true;
                const updated = { ...item, mood };
                updated.overallScore = computeWellnessScore(updated).total;
                return updated;
            }
            return item;
        });
        if (!found) {
            const newEntry = {
                id: generateWellnessId(), userId: currentUser.id, date: today,
                calories: 0, waterLitres: 0, exerciseCalories: 0, sleepHours: 0,
                overallScore: 0, mood
            };
            newEntry.overallScore = computeWellnessScore(newEntry).total;
            data.push(newEntry);
        }
        await window.lifeOS.writeData('wellness.json', data);
        showToast(`Mood set to ${capitalize(mood)} ✅`, 'success');
        loadWellnessPage();
    } catch (err) { console.error('[WELLNESS] Mood update error:', err); }
}

// ── Score Re-Calculator (manual button) ───
async function calculateWellnessScore() {
    const currentUser = JSON.parse(localStorage.getItem('synapseCurrentUser'));
    const today = new Date().toISOString().split('T')[0];
    try {
        let data = await safeWellnessRead('wellness.json');
        let updated = false;
        data = data.map(item => {
            if (item.userId === currentUser.id && item.date === today) {
                updated = true;
                const result = computeWellnessScore(item);
                return { ...item, overallScore: result.total };
            }
            return item;
        });
        if (!updated) {
            showToast("No today's data to score. Update a metric first.", 'error');
            return;
        }
        await window.lifeOS.writeData('wellness.json', data);
        showToast('Wellness score calculated! 🎯', 'success');
        loadWellnessPage();
    } catch (err) { console.error('[WELLNESS] Score calc error:', err); }
}

// ── Helpers ────────────────────────────────
function getTodayWellness(data) {
    const today = new Date().toISOString().split('T')[0];
    return data.find(item => item.date === today) || {};
}

function calculateWellnessStreak(data) {
    if (!data.length) return 0;
    const sorted = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
    let streak = 0;
    let expected = new Date();
    expected.setHours(0, 0, 0, 0);
    for (const entry of sorted) {
        const entryDate = new Date(entry.date);
        entryDate.setHours(0, 0, 0, 0);
        const diff = (expected - entryDate) / (1000 * 60 * 60 * 24);
        if (diff === 0 || diff === 1) {
            streak++;
            expected = entryDate;
        } else {
            break;
        }
    }
    return streak;
}

function capitalize(text) {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function animateWellnessCards() {
    document.querySelectorAll('.card, .wellness-card').forEach((card, i) => {
        card.style.opacity    = '0';
        card.style.transform  = 'translateY(20px)';
        card.style.transition = `opacity 0.5s ease ${i * 80}ms, transform 0.5s ease ${i * 80}ms`;
        requestAnimationFrame(() => { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; });
    });
}

async function safeWellnessRead(file) {
    try {
        const data = await window.lifeOS.readData(file);
        return Array.isArray(data) ? data : [];
    } catch { return []; }
}

function generateWellnessId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// ── Global Exports ─────────────────────────
window.loadWellnessPage       = loadWellnessPage;
window.showWellnessModal      = showWellnessModal;
window.closeWellnessModal     = closeWellnessModal;
window.updateMood             = updateMood;
window.calculateWellnessScore = calculateWellnessScore;
window.computeWellnessScore   = computeWellnessScore;