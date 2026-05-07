// ============================================
// finance.js — Synapse Royal Finance Module (FIXED v2)
// ============================================

let financeChart = null;

// ── Load Finance Page ──────────────────────
async function loadFinancePage() {
    const pageContent = document.getElementById('pageContent');
    if (!pageContent) return;

    const currentUser = JSON.parse(localStorage.getItem('synapseCurrentUser'));
    if (!currentUser) {
        pageContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-lock"></i>
                <h3>Authentication Required</h3>
                <p>Please login to access your finance dashboard.</p>
            </div>`;
        return;
    }

    pageContent.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;

    try {
        let financeData = await safeFinanceRead('finance.json');
        let userFinance = financeData.find(item => item.userId === currentUser.id);

        if (!userFinance) {
            userFinance = {
                id: generateFinanceId(),
                userId: currentUser.id,
                balance: 0, monthlyIncome: 0, monthlyExpenses: 0,
                savings: 0, investments: 0, budgetGoal: 0,
                transactions: [],
                lastUpdated: new Date().toISOString()
            };
            financeData.push(userFinance);
            await window.lifeOS.writeData('finance.json', financeData);
        }

        userFinance.transactions = userFinance.transactions || [];
        const budgetPct       = calculateBudgetPercentage(userFinance);
        const remainingBudget = (userFinance.budgetGoal || 0) - userFinance.monthlyExpenses;
        const budgetBarColor  = budgetPct >= 90 ? '#e74c3c' : budgetPct >= 70 ? '#f39c12' : '#c9a84c';
        const budgetSet       = userFinance.budgetGoal > 0;

        const recentTxns = [...userFinance.transactions]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        pageContent.innerHTML = `
            <div class="page-header">
                <h2 class="page-title">Finance</h2>
                <p class="page-subtitle">Manage your royal treasury</p>
            </div>

            <div class="dashboard-cards">
                <!-- Financial Overview -->
                <div class="card stagger-item">
                    <div class="card-header">
                        <h3 class="card-title">Royal Treasury</h3>
                        <div class="card-icon"><i class="fas fa-wallet"></i></div>
                    </div>
                    <div class="card-body">
                        <div class="finance-summary">
                            <div class="finance-item">
                                <div class="finance-label">Current Balance</div>
                                <div class="finance-value">₹${formatCurrency(userFinance.balance)}</div>
                            </div>
                            <div class="finance-item">
                                <div class="finance-label">Monthly Income</div>
                                <div class="finance-value finance-income">+₹${formatCurrency(userFinance.monthlyIncome)}</div>
                            </div>
                            <div class="finance-item">
                                <div class="finance-label">Monthly Expenses</div>
                                <div class="finance-value finance-expense">−₹${formatCurrency(userFinance.monthlyExpenses)}</div>
                            </div>
                            <div class="finance-item">
                                <div class="finance-label">Savings</div>
                                <div class="finance-value">₹${formatCurrency(userFinance.savings)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Add Transaction -->
                <div class="card stagger-item">
                    <div class="card-header">
                        <h3 class="card-title">Add Transaction</h3>
                        <div class="card-icon"><i class="fas fa-coins"></i></div>
                    </div>
                    <div class="card-body">
                        <div class="input-group">
                            <i class="fas fa-indian-rupee-sign input-icon"></i>
                            <input type="number" id="transactionAmount" class="form-input"
                                placeholder="Amount (₹)" min="1" step="0.01">
                        </div>
                        <div class="input-group">
                            <i class="fas fa-tag input-icon"></i>
                            <select id="transactionType" class="form-input">
                                <option value="income">Income</option>
                                <option value="expense">Expense</option>
                                <option value="savings">Savings</option>
                                <option value="investment">Investment</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <i class="fas fa-pen input-icon"></i>
                            <input type="text" id="transactionDescription" class="form-input"
                                placeholder="Description (optional)">
                        </div>
                        <div id="financeMessage" class="form-message mt-10"></div>
                        <button class="btn-royal mt-20" id="addTransactionBtn">
                            Add Transaction <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- ── Budget Tracker ── -->
            <div class="card mt-20 stagger-item">
                <div class="card-header">
                    <h3 class="card-title">Budget Tracker</h3>
                    <div class="card-icon"><i class="fas fa-chart-pie"></i></div>
                </div>
                <div class="card-body">

                    <!-- Inline Budget Goal Input (replaces broken prompt()) -->
                    <div style="background:rgba(201,168,76,0.07);border:1px solid rgba(201,168,76,0.25);border-radius:12px;padding:18px;margin-bottom:20px;">
                        <p style="color:#c9a84c;font-weight:600;margin-bottom:12px;">
                            <i class="fas fa-bullseye" style="margin-right:6px;"></i>
                            ${budgetSet ? 'Update Monthly Budget Goal' : 'Set Your Monthly Budget Goal'}
                        </p>
                        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                            <div class="input-group" style="flex:1;min-width:160px;margin-bottom:0;">
                                <i class="fas fa-indian-rupee-sign input-icon"></i>
                                <input
                                    type="number"
                                    id="budgetGoalInput"
                                    class="form-input"
                                    placeholder="Enter budget (e.g. 15000)"
                                    value="${budgetSet ? userFinance.budgetGoal : ''}"
                                    min="1" step="100">
                            </div>
                            <button class="btn-royal" id="saveBudgetBtn" style="padding:10px 18px;white-space:nowrap;">
                                <i class="fas fa-check"></i> ${budgetSet ? 'Update' : 'Save Goal'}
                            </button>
                        </div>
                        <div id="budgetMessage" class="form-message mt-10"></div>
                    </div>

                    <!-- Budget Summary -->
                    <div class="finance-summary">
                        <div class="finance-item">
                            <div class="finance-label">Budget Goal</div>
                            <div class="finance-value">
                                ${budgetSet
                                    ? '₹' + formatCurrency(userFinance.budgetGoal)
                                    : '<span style="color:#a89070;font-size:0.9rem;font-weight:400;">Not set yet</span>'}
                            </div>
                        </div>
                        <div class="finance-item">
                            <div class="finance-label">Spent This Month</div>
                            <div class="finance-value finance-expense">₹${formatCurrency(userFinance.monthlyExpenses)}</div>
                        </div>
                        <div class="finance-item">
                            <div class="finance-label">Remaining</div>
                            <div class="finance-value ${budgetSet && remainingBudget < 0 ? 'finance-expense' : ''}">
                                ${!budgetSet
                                    ? '<span style="color:#a89070;font-size:0.9rem;font-weight:400;">—</span>'
                                    : (remainingBudget < 0 ? '−' : '') + '₹' + formatCurrency(Math.abs(remainingBudget))}
                            </div>
                        </div>
                        <div class="finance-item">
                            <div class="finance-label">Used</div>
                            <div class="finance-value" style="color:${budgetSet ? budgetBarColor : '#a89070'};">
                                ${budgetSet ? budgetPct + '%' : '—'}
                            </div>
                        </div>
                    </div>

                    ${budgetSet ? `
                    <div class="skills-list mt-20">
                        <div class="skill-item">
                            <div class="skill-header">
                                <span class="skill-name">Monthly Budget Usage</span>
                                <span class="skill-progress" style="color:${budgetBarColor};">${budgetPct}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill"
                                    style="width:${budgetPct}%;background:${budgetBarColor};transition:width 0.7s ease;">
                                </div>
                            </div>
                            <div style="font-size:0.8rem;margin-top:8px;color:${budgetBarColor};">
                                ${budgetPct >= 100
                                    ? '<i class="fas fa-times-circle"></i> Budget exceeded!'
                                    : budgetPct >= 90
                                        ? '<i class="fas fa-exclamation-triangle"></i> Warning: Budget almost exhausted!'
                                        : budgetPct >= 70
                                            ? '<i class="fas fa-exclamation-circle"></i> Approaching budget limit.'
                                            : '<i class="fas fa-check-circle"></i> Spending is on track.'}
                            </div>
                        </div>
                    </div>` : `
                    <div style="color:#a89070;font-size:0.85rem;margin-top:10px;">
                        <i class="fas fa-info-circle"></i>
                        Enter a budget goal above and click Save to track your monthly spending.
                    </div>`}
                </div>
            </div>

            <!-- Finance Chart -->
            <div class="chart-container mt-20">
                <div class="chart-header">
                    <h3 class="chart-title">Financial Analytics</h3>
                    <div class="chart-selector">
                        <button class="chart-btn active" data-period="month">Monthly</button>
                        <button class="chart-btn" data-period="year">Yearly</button>
                    </div>
                </div>
                <div class="chart-wrapper">
                    <canvas id="financeChart"></canvas>
                </div>
            </div>

            <!-- Recent Transactions -->
            <div class="card mt-20 stagger-item">
                <div class="card-header">
                    <h3 class="card-title">Recent Transactions</h3>
                    <div class="card-icon"><i class="fas fa-list"></i></div>
                </div>
                <div class="card-body">
                    <div class="skills-list">
                        ${recentTxns.length
                            ? recentTxns.map(t => renderTransaction(t)).join('')
                            : `<div class="empty-state" style="padding:20px 0;">
                                <i class="fas fa-receipt"></i>
                                <p>No transactions yet. Add your first one above!</p>
                               </div>`}
                    </div>
                </div>
            </div>
        `;

        setupFinanceListeners(userFinance);
        initializeFinanceChart(userFinance);
        revealFinanceCards();

    } catch (err) {
        console.error('[FINANCE] Load error:', err);
        pageContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-triangle-exclamation"></i>
                <h3>Finance Module Error</h3>
                <p>Unable to load finance data.</p>
            </div>`;
    }
}

// ── Render Transaction Row ─────────────────
function renderTransaction(t) {
    const typeColors = { income:'#2ecc71', expense:'#e74c3c', savings:'#3498db', investment:'#9b59b6' };
    const typeIcons  = { income:'fa-arrow-down', expense:'fa-arrow-up', savings:'fa-piggy-bank', investment:'fa-chart-line' };
    const sign = t.type === 'income' ? '+' : '−';
    return `
        <div class="skill-item" style="border-left:3px solid ${typeColors[t.type]||'#c9a84c'};padding-left:12px;">
            <div class="skill-header">
                <span class="skill-name">
                    <i class="fas ${typeIcons[t.type]||'fa-coins'}" style="color:${typeColors[t.type]};margin-right:6px;"></i>
                    ${t.description || capitalize(t.type)}
                </span>
                <span class="skill-progress" style="color:${typeColors[t.type]};">
                    ${sign}₹${formatCurrency(t.amount)}
                </span>
            </div>
            <div class="card-label" style="font-size:0.75rem;margin-top:4px;">
                ${capitalize(t.type)} · ${new Date(t.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
            </div>
        </div>`;
}

// ── Event Listeners ────────────────────────
function setupFinanceListeners(userFinance) {
    document.getElementById('addTransactionBtn')?.addEventListener('click', handleTransaction);
    document.getElementById('saveBudgetBtn')    ?.addEventListener('click', handleBudgetGoal);

    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateFinanceChart(btn.dataset.period, userFinance);
        });
    });
}

// ── Budget Goal (inline, no prompt()) ─────
async function handleBudgetGoal() {
    const input = document.getElementById('budgetGoalInput');
    const msgEl = document.getElementById('budgetMessage');
    const num   = parseFloat(input?.value);

    if (!input || isNaN(num) || num <= 0) {
        if (msgEl) { msgEl.textContent = 'Please enter a valid amount (e.g. 15000).'; msgEl.className = 'form-message error'; }
        return;
    }

    try {
        const currentUser = JSON.parse(localStorage.getItem('synapseCurrentUser'));
        let financeData   = await safeFinanceRead('finance.json');
        const index = financeData.findIndex(item => item.userId === currentUser.id);
        if (index === -1) {
            if (msgEl) { msgEl.textContent = 'Finance record not found.'; msgEl.className = 'form-message error'; }
            return;
        }

        financeData[index].budgetGoal = num;
        await window.lifeOS.writeData('finance.json', financeData);

        if (msgEl) { msgEl.textContent = `✅ Budget goal saved: ₹${formatCurrency(num)}`; msgEl.className = 'form-message success'; }
        window.showToast?.(`Budget goal set to ₹${formatCurrency(num)}`, 'success');

        setTimeout(() => loadFinancePage(), 900);
    } catch (err) {
        console.error('[FINANCE] Budget goal error:', err);
        if (msgEl) { msgEl.textContent = 'Failed to save. Please try again.'; msgEl.className = 'form-message error'; }
    }
}

// Legacy alias
function showBudgetPrompt() { handleBudgetGoal(); }

// ── Handle Transaction ─────────────────────
async function handleTransaction() {
    const currentUser = JSON.parse(localStorage.getItem('synapseCurrentUser'));
    const amount      = parseFloat(document.getElementById('transactionAmount')?.value);
    const type        = document.getElementById('transactionType')?.value;
    const description = document.getElementById('transactionDescription')?.value?.trim() || '';
    const msgEl       = document.getElementById('financeMessage');

    if (!amount || amount <= 0) {
        showFinanceMessage(msgEl, 'Enter a valid amount greater than 0.', 'error');
        return;
    }

    try {
        let financeData = await safeFinanceRead('finance.json');
        const index = financeData.findIndex(item => item.userId === currentUser.id);
        if (index === -1) { showFinanceMessage(msgEl, 'Finance record not found.', 'error'); return; }

        const finance = { ...financeData[index] };
        finance.transactions = finance.transactions || [];

        switch (type) {
            case 'income':     finance.balance += amount; finance.monthlyIncome   += amount; break;
            case 'expense':    finance.balance -= amount; finance.monthlyExpenses += amount; break;
            case 'savings':    finance.balance -= amount; finance.savings         += amount; break;
            case 'investment': finance.balance -= amount; finance.investments     += amount; break;
        }

        finance.lastUpdated = new Date().toISOString();
        finance.transactions.push({ id: generateFinanceId(), type, amount, description, createdAt: new Date().toISOString() });
        financeData[index] = finance;
        await window.lifeOS.writeData('finance.json', financeData);

        showFinanceMessage(msgEl, '✅ Transaction added successfully!', 'success');
        window.lifeOS?.showNotification?.({ title: 'Synapse Finance', body: `${capitalize(type)} ₹${amount} added` });

        const amtEl  = document.getElementById('transactionAmount');
        const descEl = document.getElementById('transactionDescription');
        if (amtEl)  amtEl.value  = '';
        if (descEl) descEl.value = '';

        setTimeout(() => loadFinancePage(), 700);
    } catch (err) {
        console.error('[FINANCE] Transaction error:', err);
        showFinanceMessage(document.getElementById('financeMessage'), 'Unable to add transaction.', 'error');
    }
}

// ── Finance Chart ──────────────────────────
function initializeFinanceChart(financeData) {
    const canvas = document.getElementById('financeChart');
    if (!canvas) return;
    if (financeChart) { financeChart.destroy(); financeChart = null; }

    const { labels, incomeData, expenseData, balanceData } = buildMonthlyChartData(financeData);

    financeChart = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label:'Income',   data:incomeData,  backgroundColor:'rgba(46,204,113,0.7)', borderColor:'#2ecc71', borderWidth:2, borderRadius:4 },
                { label:'Expenses', data:expenseData, backgroundColor:'rgba(231,76,60,0.7)',  borderColor:'#e74c3c', borderWidth:2, borderRadius:4 },
                { label:'Balance',  data:balanceData, type:'line', borderColor:'#c9a84c',
                  backgroundColor:'rgba(201,168,76,0.1)', borderWidth:2, fill:false, tension:0.4,
                  pointRadius:4, pointBackgroundColor:'#c9a84c', yAxisID:'y' }
            ]
        },
        options: {
            responsive:true, maintainAspectRatio:false,
            plugins: {
                legend: { labels:{ color:'#f0e6d3', font:{family:'Raleway'} } },
                tooltip: { backgroundColor:'rgba(17,34,64,0.95)', titleColor:'#c9a84c', bodyColor:'#f0e6d3',
                    callbacks:{ label: ctx=>`${ctx.dataset.label}: ₹${Number(ctx.parsed.y).toLocaleString('en-IN')}` } }
            },
            scales: {
                x: { ticks:{color:'#a89070'}, grid:{color:'rgba(255,255,255,0.05)'} },
                y: { ticks:{color:'#a89070', callback:v=>'₹'+Number(v).toLocaleString('en-IN')}, grid:{color:'rgba(255,255,255,0.05)'} }
            }
        }
    });
}

function buildMonthlyChartData(financeData, numMonths=6) {
    const transactions = financeData.transactions || [];
    const months=[]; const incomeData=[]; const expenseData=[]; const balanceData=[];
    for(let i=numMonths-1;i>=0;i--){
        const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-i);
        months.push({ key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
                      label:d.toLocaleDateString('en-IN',{month:'short',year:'2-digit'}) });
    }
    let running=0;
    months.forEach(({key})=>{
        const mt=transactions.filter(t=>{ const d=new Date(t.createdAt); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`===key; });
        const inc=mt.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
        const exp=mt.filter(t=>t.type!=='income').reduce((s,t)=>s+t.amount,0);
        running+=inc-exp; incomeData.push(inc); expenseData.push(exp); balanceData.push(Math.max(0,running));
    });
    const hasAny=incomeData.some(v=>v>0)||expenseData.some(v=>v>0);
    if(!hasAny&&(financeData.monthlyIncome>0||financeData.monthlyExpenses>0)){
        const l=incomeData.length-1;
        incomeData[l]=financeData.monthlyIncome||0; expenseData[l]=financeData.monthlyExpenses||0; balanceData[l]=financeData.balance||0;
    }
    return { labels:months.map(m=>m.label), incomeData, expenseData, balanceData };
}

function buildYearlyChartData(financeData) {
    const transactions=financeData.transactions||[]; const yr=new Date().getFullYear();
    const mn=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const inc=Array(12).fill(0); const exp=Array(12).fill(0); const bal=Array(12).fill(0);
    transactions.filter(t=>new Date(t.createdAt).getFullYear()===yr).forEach(t=>{
        const m=new Date(t.createdAt).getMonth();
        if(t.type==='income') inc[m]+=t.amount; else exp[m]+=t.amount;
    });
    let run=0; for(let i=0;i<12;i++){ run+=inc[i]-exp[i]; bal[i]=Math.max(0,run); }
    return { labels:mn, incomeData:inc, expenseData:exp, balanceData:bal };
}

function updateFinanceChart(period,financeData) {
    if(!financeChart) return;
    const built=period==='month'?buildMonthlyChartData(financeData):buildYearlyChartData(financeData);
    financeChart.data.labels=built.labels;
    financeChart.data.datasets[0].data=built.incomeData;
    financeChart.data.datasets[1].data=built.expenseData;
    financeChart.data.datasets[2].data=built.balanceData;
    financeChart.update();
}

// ── Helpers ────────────────────────────────
function calculateBudgetPercentage(finance) {
    if(!finance.budgetGoal) return 0;
    return Math.min(Math.round((finance.monthlyExpenses/finance.budgetGoal)*100),100);
}
function formatCurrency(value) {
    return Number(value||0).toLocaleString('en-IN',{minimumFractionDigits:0,maximumFractionDigits:2});
}
function capitalize(text) { return text?text.charAt(0).toUpperCase()+text.slice(1):''; }
function revealFinanceCards() {
    document.querySelectorAll('.card').forEach((card,i)=>{
        card.style.opacity='0'; card.style.transform='translateY(20px)';
        card.style.transition=`opacity 0.5s ease ${i*100}ms, transform 0.5s ease ${i*100}ms`;
        requestAnimationFrame(()=>{ card.style.opacity='1'; card.style.transform='translateY(0)'; });
    });
}
function showFinanceMessage(el,message,type) {
    if(!el) return; el.textContent=message; el.className=`form-message ${type}`;
}
async function safeFinanceRead(file) {
    try { const data=await window.lifeOS.readData(file); return Array.isArray(data)?data:[]; } catch { return []; }
}
function generateFinanceId() {
    return Date.now().toString(36)+Math.random().toString(36).substring(2,9);
}

// ── Global Exports ─────────────────────────
window.loadFinancePage   = loadFinancePage;
window.showBudgetPrompt  = showBudgetPrompt;
window.handleTransaction = handleTransaction;
window.handleBudgetGoal  = handleBudgetGoal;