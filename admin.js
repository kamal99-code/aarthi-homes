// Helix Admin Portal - Client Controller

// State
let records = [];
let isLocalDatabase = false;

// Elements
const historyBody = document.getElementById('history-body');
const recordCountEl = document.getElementById('record-count');
const searchInput = document.getElementById('search-input');
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const statusBox = document.getElementById('admin-status');

// Modal Elements
const modalOverlay = document.getElementById('details-modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalRate = document.getElementById('modal-rate');
const modalInterest = document.getElementById('modal-interest');
const modalDate = document.getElementById('modal-date');
const modalId = document.getElementById('modal-id');
const modalLedgerBody = document.getElementById('modal-ledger-body');
const modalCloseBtn = document.getElementById('modal-close-btn');

// Passcode Elements
const passcodeOverlay = document.getElementById('passcode-overlay');
const passcodeCardEl = document.getElementById('passcode-card-el');
const pinInputs = [
  document.getElementById('pin-1'),
  document.getElementById('pin-2'),
  document.getElementById('pin-3'),
  document.getElementById('pin-4')
];
const passcodeError = document.getElementById('passcode-error');
const backHomeBtn = document.getElementById('btn-back-home');

const CORRECT_PIN = '1848';

// Format Currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);
}

// Show/Hide Status Messages
function showStatus(message, isError) {
  statusBox.classList.remove('hidden');
  const msgEl = statusBox.querySelector('.sync-message');
  msgEl.textContent = message;

  if (isError) {
    statusBox.className = 'sync-banner error-sync';
  } else {
    statusBox.className = 'sync-banner';
  }
}

function hideStatus() {
  statusBox.classList.add('hidden');
}

// Fetch Records from API
async function fetchRegistry() {
  // Start loading animation
  refreshIcon.classList.add('spinning');
  showStatus('Loading calculation log database records...', false);
  
  try {
    const response = await fetch('/api/history');
    const result = await response.json();
    
    if (result.success) {
      records = result.data || [];
      isLocalDatabase = result.isLocal;
      
      hideStatus();
      renderHistoryTable(records);
    } else {
      showStatus(`Database Error: ${result.message}`, true);
    }
  } catch (err) {
    console.error('Failed to load calculations history:', err);
    showStatus('Failed to connect to local dev server. Make sure node server.js is running.', true);
  } finally {
    refreshIcon.classList.remove('spinning');
  }
}

// Render History Table
function renderHistoryTable(dataToRender) {
  historyBody.innerHTML = '';
  recordCountEl.textContent = `${dataToRender.length} Log${dataToRender.length !== 1 ? 's' : ''}`;

  if (dataToRender.length === 0) {
    historyBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-6 text-muted">No matching calculations saved in registry database.</td>
      </tr>
    `;
    return;
  }

  dataToRender.forEach(record => {
    const row = document.createElement('tr');
    
    const savedDate = new Date(record.createdAt).toLocaleString();
    const isLocalStr = isLocalDatabase ? 'Local File' : 'Supabase';
    const isLocalBadgeClass = isLocalDatabase ? 'badge-credit' : 'badge-debit';
    
    row.innerHTML = `
      <td style="white-space: nowrap;">${savedDate}</td>
      <td><strong>${record.name}</strong></td>
      <td class="text-center">${record.interestRate.toFixed(2)}%</td>
      <td class="text-right text-accent" style="font-weight:600;">${formatCurrency(record.totalInterest)}</td>
      <td class="text-center">${record.transactions ? record.transactions.length : 0}</td>
      <td class="text-center">
        <span class="badge ${isLocalBadgeClass}">${isLocalStr}</span>
      </td>
      <td class="text-center" style="white-space: nowrap;">
        <button class="btn btn-secondary btn-view-details" data-id="${record.id}" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;">
          View
        </button>
        <button class="btn btn-secondary btn-delete-log" data-id="${record.id}" style="padding: 0.35rem 0.65rem; font-size: 0.75rem; border-color: rgba(239, 68, 68, 0.15); color: var(--accent-danger);">
          Purge
        </button>
      </td>
    `;

    // Hook events
    row.querySelector('.btn-view-details').addEventListener('click', () => showDetails(record));
    row.querySelector('.btn-delete-log').addEventListener('click', () => purgeRecord(record.id, record.name));

    historyBody.appendChild(row);
  });
}

// Open Details Modal
function showDetails(record) {
  modalTitle.textContent = `${record.name} Ledger Details`;
  modalRate.textContent = `${record.interestRate.toFixed(2)}%`;
  modalInterest.textContent = formatCurrency(record.totalInterest);
  modalDate.textContent = new Date(record.createdAt).toLocaleString();
  modalId.textContent = record.id;

  // Build transactions list inside modal
  modalLedgerBody.innerHTML = '';
  
  if (!record.transactions || record.transactions.length === 0) {
    modalLedgerBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">No transactions recorded.</td></tr>`;
  } else {
    // Sort transactions chronologically
    const sorted = [...record.transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    sorted.forEach(tx => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${tx.date}</td>
        <td>${tx.desc || '—'}</td>
        <td><span class="badge badge-${tx.type}">${tx.type}</span></td>
        <td class="text-right ${tx.type === 'debit' ? 'text-accent' : 'text-primary'}">
          ${tx.type === 'debit' ? '-' : ''}${formatCurrency(tx.amount)}
        </td>
      `;
      modalLedgerBody.appendChild(row);
    });
  }

  // Display modal overlay
  modalOverlay.classList.add('active');
}

// Close Details Modal
function closeModal() {
  modalOverlay.classList.remove('active');
}

modalCloseBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

// Purge (Delete) Record
async function purgeRecord(id, name) {
  if (!confirm(`Are you sure you want to permanently delete the logs for "${name}"?\nThis action cannot be undone.`)) {
    return;
  }

  showStatus(`Purging calculations record ID: ${id}...`, false);

  try {
    const response = await fetch('/api/delete-calculation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showStatus(`Deleted successfully: ${result.message}`, false);
      setTimeout(hideStatus, 4000);
      
      // Reload calculations logs
      fetchRegistry();
    } else {
      showStatus(`Delete failed: ${result.message}`, true);
    }
  } catch (err) {
    console.error('Delete call failed:', err);
    showStatus('Failed to send delete request. Check network connection.', true);
  }
}

// Search filtering logic
searchInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim();
  if (!query) {
    renderHistoryTable(records);
    return;
  }
  
  const filtered = records.filter(record => {
    return record.name.toLowerCase().includes(query);
  });
  
  renderHistoryTable(filtered);
});

// Refresh button trigger
refreshBtn.addEventListener('click', () => {
  if (sessionStorage.getItem('helix_admin_authenticated') === 'true') {
    fetchRegistry();
  }
});

// Passcode PIN Authorization Controller
function initPasscodeModule() {
  // Check if already authenticated in this session
  if (sessionStorage.getItem('helix_admin_authenticated') === 'true') {
    passcodeOverlay.classList.add('fade-out');
    fetchRegistry();
    return;
  }

  // Focus the first input box
  setTimeout(() => pinInputs[0].focus(), 150);

  // Setup input key listeners for PIN entry
  pinInputs.forEach((input, index) => {
    // Keydown for backspace
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        if (input.value === '' && index > 0) {
          pinInputs[index - 1].value = '';
          pinInputs[index - 1].focus();
        } else {
          input.value = '';
        }
        passcodeError.classList.add('hidden');
      }
    });

    // Input listener to auto-progress
    input.addEventListener('input', (e) => {
      const val = e.target.value;
      
      // Allow only digits
      if (!/^\d*$/.test(val)) {
        input.value = '';
        return;
      }

      if (val !== '') {
        // Auto progress to next input
        if (index < 3) {
          pinInputs[index + 1].focus();
        } else {
          // Reached final character, trigger verification
          verifyPin();
        }
      }
    });

    // Select input content on focus
    input.addEventListener('focus', () => {
      input.select();
    });
  });

  // Back button redirect
  backHomeBtn.addEventListener('click', () => {
    window.location.href = '/';
  });
}

// Check PIN validity
function verifyPin() {
  const enteredPin = pinInputs.map(input => input.value).join('');
  
  if (enteredPin === CORRECT_PIN) {
    // Store auth status in session storage
    sessionStorage.setItem('helix_admin_authenticated', 'true');
    
    // Hide error
    passcodeError.classList.add('hidden');
    
    // Fade out overlay
    passcodeOverlay.classList.add('fade-out');
    
    // Fetch data
    fetchRegistry();
  } else {
    // Access denied: trigger shake animation & clear inputs
    passcodeCardEl.classList.add('shake');
    pinInputs.forEach(input => {
      input.classList.add('shake');
    });
    passcodeError.classList.remove('hidden');

    // Reset fields and refocus first digit
    setTimeout(() => {
      pinInputs.forEach(input => {
        input.value = '';
        input.classList.remove('shake');
      });
      passcodeCardEl.classList.remove('shake');
      pinInputs[0].focus();
    }, 450);
  }
}

// Start
initPasscodeModule();
