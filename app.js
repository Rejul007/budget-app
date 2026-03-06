import { auth, db } from './firebase-config.js';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  doc,
  getDoc,
  setDoc
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

// ---- State ----
let currentUid = null;
let state = { balance: 0, transactions: [], subscriptions: [] };

// ---- Currency ----
const fmt = (n) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR',
  minimumFractionDigits: 2, maximumFractionDigits: 2
}).format(Math.abs(n));
const today = () => new Date().toISOString().split('T')[0];

// ---- Firestore ----
async function loadData() {
  const snap = await getDoc(doc(db, 'users', currentUid));
  state = snap.exists()
    ? snap.data()
    : { balance: 0, transactions: [], subscriptions: [] };
}

async function save() {
  await setDoc(doc(db, 'users', currentUid), state);
}

// ---- Auth State ----
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUid = user.uid;
    document.getElementById('auth-overlay').style.display  = 'none';
    document.getElementById('app-header').style.display    = '';
    document.getElementById('app-body').style.display      = '';
    document.getElementById('user-email').textContent      = user.email;
    document.getElementById('header-date').textContent     = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
    document.getElementById('sub-date').value = today();
    await loadData();
    render();
  } else {
    currentUid = null;
    document.getElementById('auth-overlay').style.display = '';
    document.getElementById('app-header').style.display   = 'none';
    document.getElementById('app-body').style.display     = 'none';
  }
});

// ---- Auth UI ----
const loginForm  = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const authError  = document.getElementById('auth-error');

function showAuthError(msg) {
  authError.textContent = msg;
  authError.style.display = 'block';
}
function clearAuthError() {
  authError.textContent = '';
  authError.style.display = 'none';
}

document.getElementById('tab-login').addEventListener('click', () => {
  document.getElementById('tab-login').classList.add('active');
  document.getElementById('tab-signup').classList.remove('active');
  loginForm.style.display  = '';
  signupForm.style.display = 'none';
  clearAuthError();
});

document.getElementById('tab-signup').addEventListener('click', () => {
  document.getElementById('tab-signup').classList.add('active');
  document.getElementById('tab-login').classList.remove('active');
  signupForm.style.display = '';
  loginForm.style.display  = 'none';
  clearAuthError();
});

document.getElementById('btn-login').addEventListener('click', async () => {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) { showAuthError('Please fill in all fields.'); return; }
  try {
    await signInWithEmailAndPassword(auth, email, password);
    clearAuthError();
  } catch (e) {
    showAuthError(friendlyError(e.code));
  }
});

document.getElementById('btn-signup').addEventListener('click', async () => {
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const confirm  = document.getElementById('signup-confirm').value;
  if (!email || !password || !confirm) { showAuthError('Please fill in all fields.'); return; }
  if (password !== confirm) { showAuthError('Passwords do not match.'); return; }
  if (password.length < 6)  { showAuthError('Password must be at least 6 characters.'); return; }
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    clearAuthError();
  } catch (e) {
    showAuthError(friendlyError(e.code));
  }
});

document.getElementById('btn-google').addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
    clearAuthError();
  } catch (e) {
    showAuthError(friendlyError(e.code));
  }
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  await signOut(auth);
});

function friendlyError(code) {
  const map = {
    'auth/user-not-found':           'No account found with that email.',
    'auth/wrong-password':           'Incorrect password.',
    'auth/invalid-email':            'Invalid email address.',
    'auth/email-already-in-use':     'An account with this email already exists.',
    'auth/invalid-credential':       'Incorrect email or password.',
    'auth/too-many-requests':        'Too many attempts. Try again later.',
    'auth/popup-blocked':            'Popup was blocked — please allow popups for this site.',
    'auth/popup-closed-by-user':     'Sign-in cancelled.',
    'auth/cancelled-popup-request':  'Sign-in cancelled.',
    'auth/operation-not-allowed':    'Google sign-in is not enabled. Enable it in the Firebase Console.',
  };
  return map[code] || `Something went wrong (${code}). Please try again.`;
}

// ---- Toast ----
function showToast(msg, color = '#5b52e8') {
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style, {
    position: 'fixed', bottom: '24px', right: '24px',
    background: color, color: '#fff',
    padding: '12px 20px', borderRadius: '10px',
    fontSize: '0.88rem', fontWeight: '700',
    zIndex: 9999, boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
    transition: 'opacity 0.3s'
  });
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2200);
}

// ---- Render ----
function render() {
  document.getElementById('balance-display').textContent  = fmt(state.balance);
  document.getElementById('balance-display').style.color = state.balance < 0 ? '#fca5a5' : '#fff';

  const now      = new Date();
  const monthTxs = state.transactions.filter(tx => {
    const d = new Date(tx.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthInc = monthTxs.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const monthExp = monthTxs.filter(t => t.type !== 'income').reduce((a, t) => a + t.amount, 0);
  document.getElementById('month-income').textContent  = fmt(monthInc);
  document.getElementById('month-expense').textContent = fmt(monthExp);

  const monthlySubs  = state.subscriptions.filter(s => s.cycle === 'monthly');
  const yearlySubs   = state.subscriptions.filter(s => s.cycle === 'yearly');
  const monthlyTotal = monthlySubs.reduce((a, s) => a + s.amount, 0);
  const yearlyTotal  = yearlySubs.reduce((a, s) => a + s.amount, 0);
  const yearlyPerMo  = yearlyTotal / 12;

  document.getElementById('stat-monthly').textContent       = fmt(monthlyTotal);
  document.getElementById('stat-monthly-count').textContent = monthlySubs.length + ' subscription' + (monthlySubs.length !== 1 ? 's' : '');
  document.getElementById('stat-yearly-mo').textContent     = fmt(yearlyPerMo);
  document.getElementById('stat-yearly-count').textContent  = yearlySubs.length + ' subscription' + (yearlySubs.length !== 1 ? 's' : '');
  document.getElementById('stat-total-mo').textContent      = fmt(monthlyTotal + yearlyPerMo);
  document.getElementById('monthly-total').textContent      = fmt(monthlyTotal);
  document.getElementById('yearly-total').textContent       = fmt(yearlyTotal);

  renderSubList('monthly', monthlySubs);
  renderSubList('yearly',  yearlySubs);
  renderTransactions();
}

function renderSubList(type, subs) {
  const el = document.getElementById(type + '-list');
  if (subs.length === 0) {
    el.innerHTML = '<div class="empty-state">No ' + type + ' subscriptions yet.<br>Tap + to add one.</div>';
    return;
  }
  el.innerHTML = subs.map((s) => {
    const globalIdx = state.subscriptions.indexOf(s);
    const daysUntil = Math.ceil((new Date(s.nextDate) - new Date()) / 86400000);
    const dueSoon   = daysUntil <= 7 && daysUntil >= 0;
    const icon      = s.icon || '📋';
    return `
      <div class="sub-item">
        <div class="sub-icon">${icon}</div>
        <div class="sub-info">
          <div class="sub-name">${escHtml(s.name)}</div>
          <div class="sub-date">
            Next: ${s.nextDate}
            ${dueSoon ? '<span style="color:var(--warning);margin-left:6px;font-weight:700;">Due in ' + daysUntil + 'd</span>' : ''}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="sub-amount">${fmt(s.amount)}</span>
          <button class="btn btn-danger" onclick="removeSub(${globalIdx})">&#x2715;</button>
        </div>
      </div>`;
  }).join('');
}

function renderTransactions() {
  const el = document.getElementById('tx-list');
  if (state.transactions.length === 0) {
    el.innerHTML = '<div class="empty-state">No transactions yet.</div>';
    return;
  }
  const sorted = [...state.transactions].reverse();
  el.innerHTML = sorted.map(tx => {
    const icons = { income: '↑', expense: '↓', sub: '~' };
    const sign  = tx.type === 'income' ? '+' : '-';
    return `
      <div class="tx-item">
        <div class="tx-icon ${tx.type}">${icons[tx.type] || '?'}</div>
        <div class="tx-details">
          <div class="tx-desc">${escHtml(tx.desc)}</div>
          <div class="tx-date">${tx.date}</div>
        </div>
        <div class="tx-amount ${tx.type}">${sign}${fmt(tx.amount)}</div>
      </div>`;
  }).join('');
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---- Actions (exposed globally for onclick attributes) ----
window.addIncome = async function () {
  const desc   = document.getElementById('income-desc').value.trim();
  const amount = parseFloat(document.getElementById('income-amount').value);
  if (!desc)                    { showToast('Enter a description', '#dc2626'); return; }
  if (!amount || amount <= 0)   { showToast('Enter a valid amount', '#dc2626'); return; }
  state.balance += amount;
  state.transactions.push({ type: 'income', desc, amount, date: today() });
  await save(); render();
  document.getElementById('income-desc').value   = '';
  document.getElementById('income-amount').value = '';
  showToast('+' + fmt(amount) + ' added', '#16a34a');
};

window.addExpense = async function () {
  const desc   = document.getElementById('expense-desc').value.trim();
  const amount = parseFloat(document.getElementById('expense-amount').value);
  if (!desc)                    { showToast('Enter a description', '#dc2626'); return; }
  if (!amount || amount <= 0)   { showToast('Enter a valid amount', '#dc2626'); return; }
  state.balance -= amount;
  state.transactions.push({ type: 'expense', desc, amount, date: today() });
  await save(); render();
  document.getElementById('expense-desc').value   = '';
  document.getElementById('expense-amount').value = '';
  showToast('-' + fmt(amount) + ' logged', '#5b52e8');
};

window.addSubscription = async function () {
  const name     = document.getElementById('sub-name').value.trim();
  const amount   = parseFloat(document.getElementById('sub-amount').value);
  const cycle    = document.getElementById('sub-cycle').value;
  const nextDate = document.getElementById('sub-date').value;
  if (!name)                    { showToast('Enter subscription name', '#dc2626'); return; }
  if (!amount || amount <= 0)   { showToast('Enter a valid amount', '#dc2626'); return; }
  if (!nextDate)                { showToast('Select next billing date', '#dc2626'); return; }
  state.subscriptions.push({ name, amount, cycle, nextDate, icon: '📋' });
  await save(); render();
  document.getElementById('sub-name').value   = '';
  document.getElementById('sub-amount').value = '';
  document.getElementById('sub-date').value   = today();
  switchTab(cycle);
  showToast(name + ' added', '#5b52e8');
};

window.removeSub = async function (idx) {
  const sub = state.subscriptions[idx];
  state.subscriptions.splice(idx, 1);
  await save(); render();
  showToast(sub.name + ' removed', '#dc2626');
};

window.clearHistory = async function () {
  if (!confirm('Clear all transactions? Your balance will reset to \u20B90.')) return;
  state.transactions = [];
  state.balance = 0;
  await save(); render();
};

// ---- Tabs ----
window.switchTab = function (name) {
  document.querySelectorAll('.tab').forEach((t, i) => {
    const names = ['monthly', 'yearly', 'add-sub'];
    t.classList.toggle('active', names[i] === name);
  });
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
};
