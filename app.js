// Helix Overdraft Interest Optimizer - Client Application Logic

// Local State
let state = {
  clientName: '',
  interestRate: 1.00,
  endDate: '',
  transactions: []
};


// Elements
const clientNameInput = document.getElementById('client-name');
const interestRateInput = document.getElementById('interest-rate');
const endDateInput = document.getElementById('end-date');
const endDatePlusOneCheckbox = document.getElementById('end-date-plus-one');

const addTxForm = document.getElementById('add-transaction-form');
const txDateInput = document.getElementById('tx-date');
const txTypeInput = document.getElementById('tx-type');
const txAmountInput = document.getElementById('tx-amount');
const txDescInput = document.getElementById('tx-desc');

const ledgerBody = document.getElementById('ledger-body');
const ledgerEmpty = document.getElementById('ledger-empty');
const clearLedgerBtn = document.getElementById('clear-ledger-btn');
const calculateBtn = document.getElementById('calculate-btn');

const syncStatusBox = document.getElementById('sync-status');

// Helper to format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);
}

// 30/360 Day Count Calculation
function getDays30_360(date1Str, date2Str) {
  const d1 = new Date(date1Str);
  const d2 = new Date(date2Str);

  const y1 = d1.getFullYear();
  const m1 = d1.getMonth() + 1; // 1-indexed
  let day1 = d1.getDate();

  const y2 = d2.getFullYear();
  const m2 = d2.getMonth() + 1; // 1-indexed
  let day2 = d2.getDate();

  // Adjustments for 30/360 (US standard 30U/360)
  if (day1 === 31) {
    day1 = 30;
  }
  if (day2 === 31 && day1 >= 30) {
    day2 = 30;
  }

  return (y2 - y1) * 360 + (m2 - m1) * 30 + (day2 - day1);
}

// Initialize application
function init() {
  // Load settings from LocalStorage
  const savedState = localStorage.getItem('helix_calculator_state');
  if (savedState) {
    try {
      state = JSON.parse(savedState);
      
      // Force reset if legacy 'Aarthi Homes' test account is cached
      if (state.clientName === 'Aarthi Homes Business Account') {
        state.clientName = '';
        state.transactions = [];
        state.endDate = '';
        state.interestRate = 1.00;
        state.endDatePlusOne = false;
        localStorage.setItem('helix_calculator_state', JSON.stringify(state));
      }
    } catch (e) {
      console.error('Error loading saved state:', e);
    }
  } else {
    // Set default empty state
    state.clientName = '';
    state.interestRate = 1.00;
    state.endDate = '';
    state.transactions = [];
  }

  // Populate config fields
  clientNameInput.value = state.clientName || '';
  interestRateInput.value = state.interestRate || '1.00';
  endDateInput.value = state.endDate || '';
  endDatePlusOneCheckbox.checked = state.endDatePlusOne || false;

  // Set transaction date input default to today
  txDateInput.value = new Date().toISOString().split('T')[0];

  // Render transactions and do initial calculation
  renderLedger();
  calculateInterest();
}

// Save state to LocalStorage
function saveStateToLocalStorage() {
  state.clientName = clientNameInput.value;
  state.interestRate = parseFloat(interestRateInput.value) || 1.00;
  state.endDate = endDateInput.value;
  state.endDatePlusOne = endDatePlusOneCheckbox.checked;
  localStorage.setItem('helix_calculator_state', JSON.stringify(state));
}

// Render ledger list
function renderLedger() {
  ledgerBody.innerHTML = '';
  
  // Sort state transactions by date ascending
  state.transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

  if (state.transactions.length === 0) {
    ledgerEmpty.classList.remove('hidden');
  } else {
    ledgerEmpty.classList.add('hidden');
    
    state.transactions.forEach((tx) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${tx.date}</td>
        <td>${tx.desc || '—'}</td>
        <td><span class="badge badge-${tx.type}">${tx.type}</span></td>
        <td class="text-right ${tx.type === 'debit' ? 'text-accent' : 'text-primary'}">
          ${tx.type === 'debit' ? '-' : ''}${formatCurrency(tx.amount)}
        </td>
        <td class="text-center">
          <button class="btn-delete" data-id="${tx.id}" title="Remove Transaction">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </td>
      `;
      
      // Delete event handler
      row.querySelector('.btn-delete').addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        deleteTransaction(id);
      });

      ledgerBody.appendChild(row);
    });
  }
  
  saveStateToLocalStorage();
}

// Add transaction
addTxForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const newTx = {
    id: 'tx-' + Math.random().toString(36).substring(2, 9),
    date: txDateInput.value,
    type: txTypeInput.value,
    amount: parseFloat(txAmountInput.value),
    desc: txDescInput.value.trim()
  };

  state.transactions.push(newTx);
  txAmountInput.value = '';
  txDescInput.value = '';

  renderLedger();
  calculateInterest();
});

// Delete transaction
function deleteTransaction(id) {
  state.transactions = state.transactions.filter(tx => tx.id !== id);
  renderLedger();
  calculateInterest();
}

// Clear ledger
clearLedgerBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to clear all transactions in the ledger?')) {
    state.transactions = [];
    renderLedger();
    calculateInterest();
  }
});

// Update config properties on input
clientNameInput.addEventListener('input', saveStateToLocalStorage);
interestRateInput.addEventListener('input', saveStateToLocalStorage);
endDateInput.addEventListener('input', saveStateToLocalStorage);

// Core Calculation Engine
function calculateInterest() {
  const rate = parseFloat(interestRateInput.value) || 0;
  const endDateVal = endDateInput.value;
  
  if (state.transactions.length === 0) {
    updateKPIs(0, 0, 0, 0);
    renderBreakdown([]);
    renderChart([]);
    return;
  }

  if (!endDateVal) {
    document.getElementById('kpi-interest').querySelector('.kpi-value').textContent = "Select Date";
    document.getElementById('kpi-balance').querySelector('.kpi-value').textContent = "—";
    document.getElementById('kpi-peak').querySelector('.kpi-value').textContent = "—";
    document.getElementById('kpi-days').querySelector('.kpi-value').textContent = "—";
    
    const breakdownBody = document.getElementById('breakdown-body');
    breakdownBody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-6 text-warning">Please enter a valid Evaluation End Date to calculate interest.</td>
      </tr>
    `;
    
    // Clear chart
    const pathLine = document.getElementById('chart-line-path');
    const pathArea = document.getElementById('chart-area-path');
    if (pathLine) pathLine.setAttribute('d', '');
    if (pathArea) pathArea.setAttribute('d', '');
    return;
  }

  // 1. Sort transactions chronologically
  const sortedTx = [...state.transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // 2. Identify start date and setup running variables
  const startDateStr = sortedTx[0].date;
  
  // Determine final evaluation end date
  let lastTxDateStr = sortedTx[sortedTx.length - 1].date;
  let finalEndDateStr = endDateVal;

  // Ensure end date is not before the last transaction date
  if (new Date(finalEndDateStr) < new Date(lastTxDateStr)) {
    finalEndDateStr = lastTxDateStr;
    endDateInput.value = finalEndDateStr;
  }

  // Adjust calculations final date +1 day if checked
  let calculationEndDateStr = finalEndDateStr;
  if (endDatePlusOneCheckbox.checked) {
    const nextDay = new Date(finalEndDateStr);
    nextDay.setDate(nextDay.getDate() + 1);
    calculationEndDateStr = nextDay.toISOString().split('T')[0];
  }

  // 3. Build chronological balance checkpoints
  const checkpoints = [];
  let runningBalance = 0;
  
  // Group transactions by date to handle multiple transactions on the same day
  const txByDate = {};
  sortedTx.forEach(tx => {
    if (!txByDate[tx.date]) {
      txByDate[tx.date] = [];
    }
    txByDate[tx.date].push(tx);
  });

  const uniqueDates = Object.keys(txByDate).sort((a, b) => new Date(a) - new Date(b));

  uniqueDates.forEach((dateStr) => {
    const dayTxs = txByDate[dateStr];
    dayTxs.forEach(tx => {
      if (tx.type === 'debit') {
        runningBalance -= tx.amount; // Debit decreases account balance (overdraft increases)
      } else {
        runningBalance += tx.amount; // Credit increases balance (repay overdraft)
      }
    });
    checkpoints.push({
      date: dateStr,
      balance: runningBalance
    });
  });

  // 4. Calculate intervals & accrued interest
  const intervals = [];
  let peakOverdraft = 0;
  let totalOverdraftDays = 0;
  let totalAccruedInterest = 0;

  for (let i = 0; i < checkpoints.length; i++) {
    const startCheckpoint = checkpoints[i];
    const currentBalance = startCheckpoint.balance;

    // Define next checkpoint date (or the evaluation end date)
    let endPeriodDateStr = (i === checkpoints.length - 1) ? calculationEndDateStr : checkpoints[i+1].date;
    
    // Calculate days in this interval under 30/360 convention
    const intervalDays = getDays30_360(startCheckpoint.date, endPeriodDateStr);
    
    let intervalInterest = 0;
    
    if (intervalDays > 0) {
      if (currentBalance < 0) {
        // Negative balance represents overdraft. We calculate interest on the absolute debit amount.
        const overdraftAmount = Math.abs(currentBalance);
        intervalInterest = overdraftAmount * (rate / 100) * (intervalDays / 30);
        
        totalOverdraftDays += intervalDays;
        if (overdraftAmount > peakOverdraft) {
          peakOverdraft = overdraftAmount;
        }
      }
      
      totalAccruedInterest += intervalInterest;

      intervals.push({
        startDate: startCheckpoint.date,
        endDate: endPeriodDateStr,
        days: intervalDays,
        balance: currentBalance,
        interest: intervalInterest
      });
    }
  }

  // 5. Update dashboard
  updateKPIs(totalAccruedInterest, runningBalance, peakOverdraft, totalOverdraftDays);
  renderBreakdown(intervals);
  renderChart(checkpoints, calculationEndDateStr);
}

// Update KPI UI cards
function updateKPIs(interest, balance, peak, days) {
  document.getElementById('kpi-interest').querySelector('.kpi-value').textContent = formatCurrency(interest);
  
  const balanceEl = document.getElementById('kpi-balance').querySelector('.kpi-value');
  balanceEl.textContent = formatCurrency(balance);
  if (balance < 0) {
    balanceEl.className = 'kpi-value text-accent'; // Neon Teal for debit outstanding
  } else {
    balanceEl.className = 'kpi-value text-primary';
  }
  
  document.getElementById('kpi-peak').querySelector('.kpi-value').textContent = formatCurrency(peak);
  document.getElementById('kpi-days').querySelector('.kpi-value').textContent = `${days} day${days !== 1 ? 's' : ''}`;
  
  // Cache final numbers in state for API submission
  state.totalCalculatedInterest = parseFloat(interest.toFixed(2));
  state.finalNetBalance = parseFloat(balance.toFixed(2));
}

// Render Step-by-Step Ledger
function renderBreakdown(intervals) {
  const breakdownBody = document.getElementById('breakdown-body');
  breakdownBody.innerHTML = '';

  if (intervals.length === 0) {
    breakdownBody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-6 text-muted">No intervals calculated. Ensure you have transactions and valid dates.</td>
      </tr>
    `;
    return;
  }

  intervals.forEach(interval => {
    const row = document.createElement('tr');
    
    const isOverdrawn = interval.balance < 0;
    const balanceText = formatCurrency(interval.balance);
    const interestText = interval.interest > 0 ? `+${formatCurrency(interval.interest)}` : '₹0.00';

    row.innerHTML = `
      <td>${interval.startDate} &rarr; ${interval.endDate}</td>
      <td class="text-center">${interval.days} days</td>
      <td class="text-right ${isOverdrawn ? 'text-accent' : 'text-primary'}">${balanceText}</td>
      <td class="text-right ${interval.interest > 0 ? 'text-accent' : 'text-muted'}">${interestText}</td>
    `;
    breakdownBody.appendChild(row);
  });
}

// Render Balance SVG Chart
function renderChart(checkpoints, finalEndDateStr) {
  const svg = document.getElementById('balance-svg');
  const pathLine = document.getElementById('chart-line-path');
  const pathArea = document.getElementById('chart-area-path');
  const labelsContainer = document.getElementById('chart-dates-labels');
  
  // Clear previous axis dynamic lines
  const existingDots = svg.querySelectorAll('.chart-dot, .chart-gridline');
  existingDots.forEach(el => el.remove());
  labelsContainer.innerHTML = '';

  if (checkpoints.length === 0) {
    pathLine.setAttribute('d', '');
    pathArea.setAttribute('d', '');
    return;
  }

  // Include starting coordinate at time of first transaction
  const chartPoints = [];
  const startMs = new Date(checkpoints[0].date).getTime();
  const endMs = new Date(finalEndDateStr).getTime();
  const totalMs = endMs - startMs || 1; // avoid divide by zero

  // Find min and max balance for Y scaling
  let minBalance = 0;
  let maxBalance = 0;
  checkpoints.forEach(cp => {
    if (cp.balance < minBalance) minBalance = cp.balance;
    if (cp.balance > maxBalance) maxBalance = cp.balance;
  });

  // Give some padding in Y axis
  const maxAbs = Math.max(Math.abs(minBalance), Math.abs(maxBalance), 5000);
  const yRange = maxAbs * 1.25;

  const width = 600;
  const height = 240;
  const zeroY = height / 2; // Midpoint is zero balance

  // Position Zero Axis Dash Line
  const zeroAxis = document.getElementById('zero-axis');
  zeroAxis.setAttribute('y1', zeroY);
  zeroAxis.setAttribute('y2', zeroY);

  // Map function to translate (time, balance) -> (x, y)
  function getCoords(dateStr, balance) {
    const timeMs = new Date(dateStr).getTime();
    const x = ((timeMs - startMs) / totalMs) * width;
    
    // Y-axis translation: positive balance goes UP (lower Y value), negative goes DOWN (higher Y value)
    const y = zeroY - (balance / yRange) * (height / 2);
    return { x, y };
  }

  // Build list of coords including step-like transitions (balance changes instantly on tx dates)
  let prevDate = checkpoints[0].date;
  let prevBalance = 0;

  checkpoints.forEach((cp, index) => {
    if (index > 0) {
      // Step point: continue previous balance up to the new date
      chartPoints.push(getCoords(cp.date, prevBalance));
    } else {
      // Very first entry: start at zero balance right before transaction
      chartPoints.push(getCoords(cp.date, 0));
    }
    
    // Actual coordinate on date
    chartPoints.push(getCoords(cp.date, cp.balance));
    prevBalance = cp.balance;
  });

  // Connect to the final evaluation end date
  if (finalEndDateStr !== checkpoints[checkpoints.length - 1].date) {
    chartPoints.push(getCoords(finalEndDateStr, prevBalance));
  }

  // Build SVG Path String
  let pathD = '';
  chartPoints.forEach((pt, i) => {
    if (i === 0) {
      pathD += `M ${pt.x} ${pt.y}`;
    } else {
      pathD += ` L ${pt.x} ${pt.y}`;
    }
  });

  pathLine.setAttribute('d', pathD);

  // Area Path (closes path along the zero line)
  if (chartPoints.length > 0) {
    const firstPt = chartPoints[0];
    const lastPt = chartPoints[chartPoints.length - 1];
    const areaD = `${pathD} L ${lastPt.x} ${zeroY} L ${firstPt.x} ${zeroY} Z`;
    pathArea.setAttribute('d', areaD);
  }

  // Draw data point circles and vertical gridlines
  checkpoints.forEach(cp => {
    const coords = getCoords(cp.date, cp.balance);
    
    // Vertical line
    const gridline = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    gridline.setAttribute('x1', coords.x);
    gridline.setAttribute('y1', 0);
    gridline.setAttribute('x2', coords.x);
    gridline.setAttribute('y2', height);
    gridline.setAttribute('class', 'chart-gridline');
    gridline.setAttribute('stroke', 'rgba(255,255,255,0.03)');
    svg.appendChild(gridline);

    // Dynamic dot
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', coords.x);
    circle.setAttribute('cy', coords.y);
    circle.setAttribute('r', 4.5);
    circle.setAttribute('class', 'chart-dot');
    circle.setAttribute('fill', cp.balance < 0 ? 'var(--accent-neon)' : 'var(--accent-blue)');
    circle.setAttribute('stroke', 'var(--bg-dark)');
    circle.setAttribute('stroke-width', '1.5');
    
    // Tooltip simulation
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = `${cp.date}: Balance ${formatCurrency(cp.balance)}`;
    circle.appendChild(title);
    
    svg.appendChild(circle);
  });

  // Date labels at footer of chart
  if (checkpoints.length > 0) {
    const firstDate = checkpoints[0].date;
    const lastDate = finalEndDateStr;
    
    const d1El = document.createElement('span');
    d1El.textContent = firstDate;
    labelsContainer.appendChild(d1El);

    if (checkpoints.length > 2) {
      const midIdx = Math.floor(checkpoints.length / 2);
      const midDate = checkpoints[midIdx].date;
      const dMidEl = document.createElement('span');
      dMidEl.textContent = midDate;
      labelsContainer.appendChild(dMidEl);
    }

    const d2El = document.createElement('span');
    d2El.textContent = lastDate;
    labelsContainer.appendChild(d2El);
  }
}

// Send calculations to server (Supabase & Google Sheets sync)
async function syncDataToServer() {
  if (state.transactions.length === 0) {
    alert('Add some transactions to the ledger before syncing.');
    return;
  }

  const clientName = clientNameInput.value.trim();
  if (!clientName) {
    alert('Please enter an Account Name to identify this save.');
    clientNameInput.focus();
    return;
  }

  const endDateVal = endDateInput.value;
  if (!endDateVal) {
    alert('Please enter a valid Evaluation End Date before syncing.');
    endDateInput.focus();
    return;
  }

  // Toggle button loading state
  const btnText = calculateBtn.querySelector('.btn-text');
  const spinner = calculateBtn.querySelector('.spinner');
  
  calculateBtn.disabled = true;
  btnText.textContent = 'Syncing...';
  spinner.classList.remove('hidden');

  showSyncStatus('Syncing calculation logs to Supabase and Google Sheet...', false);

  try {
    const payload = {
      name: clientName,
      interestRate: state.interestRate,
      transactions: state.transactions,
      totalInterest: state.totalCalculatedInterest
    };

    const response = await fetch('/api/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.success) {
      // Highlight exact sync report
      let statusText = `Saved Successfully! ${result.message}`;
      showSyncStatus(statusText, false);
      
      // Clear status bar after 8 seconds
      setTimeout(() => {
        syncStatusBox.classList.add('hidden');
      }, 8000);
    } else {
      showSyncStatus(`Warning: ${result.message || 'Sync failed.'}`, true);
    }
  } catch (err) {
    console.error('Network sync error:', err);
    showSyncStatus(`Sync failed: Network error. Server could not be reached. Calculations cached locally.`, true);
  } finally {
    // Restore button state
    calculateBtn.disabled = false;
    btnText.textContent = 'Compute Interest & Sync Database';
    spinner.classList.add('hidden');
  }
}

// Display Toast/Status banner
function showSyncStatus(message, isError) {
  syncStatusBox.classList.remove('hidden');
  const messageEl = syncStatusBox.querySelector('.sync-message');
  messageEl.textContent = message;

  if (isError) {
    syncStatusBox.className = 'sync-banner error-sync';
  } else {
    syncStatusBox.className = 'sync-banner';
  }
}

// Calculate Button Trigger
calculateBtn.addEventListener('click', () => {
  calculateInterest();
  syncDataToServer();
});

// Watch settings form to trigger immediate visual recalculations
interestRateInput.addEventListener('input', () => { saveStateToLocalStorage(); calculateInterest(); });
endDateInput.addEventListener('input', () => { saveStateToLocalStorage(); calculateInterest(); });
endDatePlusOneCheckbox.addEventListener('change', () => { saveStateToLocalStorage(); calculateInterest(); });

// Start
init();
