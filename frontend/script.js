/**
 * CampusEcho — Frontend Application
 * Handles: Auth, JWT management, Queries, UI
 *
 * JWT FLOW:
 * 1. User logs in → receives token from server
 * 2. Token stored in localStorage
 * 3. Every API request includes: Authorization: Bearer <token>
 * 4. Server validates token → grants/denies access
 * 5. Logout → token removed from localStorage
 */

// ========================
// CONFIG
// ========================
const API_BASE = '/api'; // Change to 'http://localhost:5000/api' if serving separately
let currentUser = null;
let adminSearchTimeout = null;

// ========================
// UTILITY: API CALL WITH JWT
// ========================
async function apiCall(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('campusecho_token');

  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`; // Attach JWT to every request
  }

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    // If token expired, auto-logout
    if (response.status === 401) {
      const msg = data.error || '';
      if (msg.includes('expired') || msg.includes('invalid')) {
        logout(true);
      }
    }
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// ========================
// UTILITY: SHOW TOAST
// ========================
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3500);
}

// ========================
// UTILITY: SET BUTTON LOADING STATE
// ========================
function setLoading(btnId, isLoading, originalText = '') {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = isLoading;
  if (isLoading) {
    btn.innerHTML = `<div class="spinner" style="width:16px;height:16px;border-width:2px;margin:0 auto;"></div>`;
  } else {
    btn.innerHTML = originalText;
  }
}

// ========================
// AUTH: TAB SWITCHER
// ========================
function switchTab(tab) {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const tabs = document.querySelectorAll('.tab-btn');
  const indicator = document.querySelector('.tab-indicator');

  if (tab === 'login') {
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
    tabs[0].classList.add('active');
    tabs[1].classList.remove('active');
    indicator.classList.remove('right');
    indicator.style.transform = '';
  } else {
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
    tabs[1].classList.add('active');
    tabs[0].classList.remove('active');
    indicator.style.transform = 'translateX(100%)';
  }
}

// ========================
// AUTH: SHOW/HIDE ADMIN CODE FIELD
// ========================
function toggleAdminCode(role) {
  const adminGroup = document.getElementById('admin-code-group');
  const adminCodeInput = document.getElementById('reg-admincode');
  if (role === 'admin') {
    adminGroup.classList.remove('hidden');
    adminCodeInput.required = true;
  } else {
    adminGroup.classList.add('hidden');
    adminCodeInput.required = false;
    adminCodeInput.value = '';
  }
}

// ========================
// AUTH: TOGGLE PASSWORD VISIBILITY
// ========================
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = 'Hide';
  } else {
    input.type = 'password';
    btn.textContent = 'Show';
  }
}

// ========================
// AUTH: REGISTER
// ========================
async function register(event) {
  event.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const department = document.getElementById('reg-dept').value.trim();
  const role = document.getElementById('reg-role').value;
  const adminCode = document.getElementById('reg-admincode').value;
  const errorEl = document.getElementById('register-error');
  const successEl = document.getElementById('register-success');

  errorEl.classList.add('hidden');
  successEl.classList.add('hidden');

  // Frontend check — if admin selected, code must be filled
  if (role === 'admin' && !adminCode) {
    errorEl.textContent = 'Please enter the admin secret code.';
    errorEl.classList.remove('hidden');
    return;
  }

  const btnHTML = `<span>Create Account</span><svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>`;
  setLoading('register-btn', true);

  try {
    const data = await apiCall('/auth/register', 'POST', { name, email, password, department, role, adminCode });

    localStorage.setItem('campusecho_token', data.token);
    localStorage.setItem('campusecho_user', JSON.stringify(data.user));

    successEl.textContent = data.message;
    successEl.classList.remove('hidden');

    setTimeout(() => initDashboard(data.user), 1000);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
    setLoading('register-btn', false, btnHTML);
  }
}

// ========================
// AUTH: LOGIN
// ========================
async function login(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const role = document.getElementById('login-role').value;
  const errorEl = document.getElementById('login-error');

  errorEl.classList.add('hidden');

  const btnHTML = `<span>Sign In</span><svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>`;
  setLoading('login-btn', true);

  try {
    const data = await apiCall('/auth/login', 'POST', { email, password, role });

    localStorage.setItem('campusecho_token', data.token);
    localStorage.setItem('campusecho_user', JSON.stringify(data.user));

    initDashboard(data.user);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
    setLoading('login-btn', false, btnHTML);
  }
}

// ========================
// AUTH: LOGOUT
// ========================
function logout(silent = false) {
  // Ask for confirmation unless it's a silent/auto logout (token expired etc.)
  if (!silent) {
    const confirmed = confirm('Are you sure you want to log out?');
    if (!confirmed) return;
  }

  localStorage.removeItem('campusecho_token');
  localStorage.removeItem('campusecho_user');
  currentUser = null;
  document.body.classList.remove('is-admin');

  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');

  // Reset forms
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';

  const loginBtn = `<span>Sign In</span><svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>`;
  const loginBtnEl = document.getElementById('login-btn');
  if (loginBtnEl) { loginBtnEl.disabled = false; loginBtnEl.innerHTML = loginBtn; }

  if (!silent) showToast('Logged out successfully', 'info');
}

// ========================
// DASHBOARD: INITIALIZE
// ========================
function initDashboard(user) {
  currentUser = user;

  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');

  // Set user info in sidebar
  document.getElementById('sidebar-username').textContent = user.name;
  document.getElementById('sidebar-role').textContent =
    user.role === 'admin' ? '🛡 Admin' : '👤 Student';
  document.getElementById('user-avatar').textContent = user.name.charAt(0).toUpperCase();
  document.getElementById('topbar-username').textContent = `Hello, ${user.name.split(' ')[0]}!`;
  document.getElementById('section-subtitle').textContent = `${user.department || 'Campus'} | ${user.email}`;

  if (user.role === 'admin') {
    // Admin: show Admin Panel nav, hide student-only nav items
    document.body.classList.add('is-admin');
    document.getElementById('admin-nav-item').style.display = 'flex';
    document.getElementById('student-submit-nav').style.display = 'none';
    document.getElementById('student-queries-nav').style.display = 'none';
    document.getElementById('student-profile-nav').style.display = 'none';

    // Admin lands on Admin Panel directly
    fetchAdminQueries();
    showSection('admin', document.getElementById('admin-nav-item'));
  } else {
    // Student: load queries and land on overview
    document.body.classList.remove('is-admin');
    fetchQueries();
    showSection('overview', document.querySelector('.nav-item'));
  }
}

// ========================
// SECTION NAVIGATION
// ========================
function showSection(name, clickedEl) {
  // Hide all sections
  document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Show selected
  document.getElementById(`section-${name}`).classList.remove('hidden');
  if (clickedEl) clickedEl.classList.add('active');

  // Update topbar title
  const titles = {
    overview: ['Overview', 'Your query dashboard'],
    submit: ['New Query', 'Submit a campus query'],
    myqueries: ['My Queries', 'Track your submitted queries'],
    profile: ['My Profile', 'Edit your account details'],
    admin: ['Admin Panel', 'Manage all campus queries']
  };
  if (titles[name]) {
    document.getElementById('section-title').textContent = titles[name][0];
    document.getElementById('section-subtitle').textContent = titles[name][1];
  }

  // Load section-specific data
  if (name === 'admin') fetchAdminQueries();
  if (name === 'myqueries') fetchQueries();
  if (name === 'profile') loadProfileForm();

  // Close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');
}

// ========================
// SIDEBAR TOGGLE (Mobile)
// ========================
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ========================
// QUERIES: SUBMIT NEW QUERY
// ========================
async function submitQuery(event) {
  event.preventDefault();
  const title = document.getElementById('q-title').value.trim();
  const description = document.getElementById('q-description').value.trim();
  const category = document.getElementById('q-category').value;
  const priority = document.getElementById('q-priority').value;
  const errorEl = document.getElementById('query-error');
  const successEl = document.getElementById('query-success');

  errorEl.classList.add('hidden');
  successEl.classList.add('hidden');

  const btnHTML = `<span>Submit Query</span><svg viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/></svg>`;
  setLoading('submit-btn', true);

  try {
    const data = await apiCall('/queries', 'POST', { title, description, category, priority });
    successEl.textContent = data.message;
    successEl.classList.remove('hidden');
    document.getElementById('query-form').reset();
    document.getElementById('title-count').textContent = '0/100';
    document.getElementById('desc-count').textContent = '0/1000';
    showToast('Query submitted successfully!', 'success');
    fetchQueries(); // Refresh stats
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  } finally {
    setLoading('submit-btn', false, btnHTML);
  }
}

// ========================
// QUERIES: FETCH USER'S QUERIES
// ========================
async function fetchQueries() {
  const status = document.getElementById('filter-status')?.value || '';
  const category = document.getElementById('filter-category')?.value || '';
  const search = document.getElementById('search-queries')?.value || '';

  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (category) params.append('category', category);
  if (search) params.append('search', search);

  const queriesListEl = document.getElementById('queries-list');
  if (queriesListEl) {
    queriesListEl.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading queries...</span></div>';
  }

  try {
    const data = await apiCall(`/queries?${params.toString()}`);
    const { queries, stats } = data;

    // Update overview stats
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-pending').textContent = stats.pending;
    document.getElementById('stat-progress').textContent = stats.inProgress;
    document.getElementById('stat-resolved').textContent = stats.resolved;

    // Update recent queries (overview)
    renderRecentQueries(queries.slice(0, 5));

    // Render full queries list
    if (queriesListEl) {
      renderQueriesList(queries, queriesListEl, false);
    }
  } catch (err) {
    showToast(err.message, 'error');
    if (queriesListEl) {
      queriesListEl.innerHTML = `<div class="empty-state">Error loading queries. Please try again.</div>`;
    }
  }
}

// ========================
// QUERIES: RENDER QUERIES LIST
// ========================
function renderQueriesList(queries, container, isAdmin) {
  if (queries.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <p style="font-size:32px;margin-bottom:8px;">📭</p>
      <p>No queries found. ${!isAdmin ? 'Submit your first query!' : ''}</p>
    </div>`;
    return;
  }

  container.innerHTML = queries.map(q => `
    <div class="query-card status-${q.status.replace(' ','-')} ${isAdmin ? 'admin-query-card' : ''}"
         onclick="${isAdmin ? `openAdminQueryModal('${q._id}')` : `openQueryModal('${q._id}')`}">
      <div class="query-main">
        <div class="query-title">${escHtml(q.title)}</div>
        <div class="query-meta">
          <span class="query-category">${q.category}</span>
          <span class="query-date">${formatDate(q.createdAt)}</span>
          ${isAdmin && q.userId ? `<span class="admin-user">👤 ${escHtml(q.userId.name)} · ${escHtml(q.userId.department || '')}</span>` : ''}
        </div>
        <div class="query-desc">${escHtml(q.description)}</div>
        ${isAdmin ? `
          <div class="admin-actions" onclick="event.stopPropagation()">
            <select id="status-select-${q._id}">
              ${['Pending','In Progress','Resolved','Closed'].map(s => `<option ${s===q.status?'selected':''}>${s}</option>`).join('')}
            </select>
            <button class="btn-update" onclick="updateQueryStatus('${q._id}')">Update</button>
          </div>` : ''}
      </div>
      <div class="query-badges">
        <span class="badge badge-status-${q.status}">${q.status}</span>
        <span class="badge badge-priority-${q.priority}">${q.priority}</span>
      </div>
    </div>
  `).join('');
}

// ========================
// QUERIES: RENDER RECENT (Overview)
// ========================
function renderRecentQueries(queries) {
  const container = document.getElementById('recent-queries-list');
  if (!container) return;

  if (queries.length === 0) {
    container.innerHTML = '<div class="empty-state small">📭 No queries yet. Submit your first query!</div>';
    return;
  }

  const colors = { Pending: '#f59e0b', 'In Progress': '#0ea5e9', Resolved: '#10b981', Closed: '#64748b' };
  container.innerHTML = queries.map(q => `
    <div class="recent-item" onclick="openQueryModal('${q._id}')">
      <div class="recent-item-icon" style="background:${colors[q.status] || '#64748b'}"></div>
      <span class="recent-item-title">${escHtml(q.title)}</span>
      <span class="recent-item-meta">${q.status}</span>
    </div>
  `).join('');
}

// ========================
// MODAL: OPEN QUERY DETAIL
// ========================
let queriesCache = {};
let currentQueryId = null;

async function openQueryModal(queryId) {
  const modal = document.getElementById('query-modal');
  const content = document.getElementById('modal-content');
  const commentsSection = document.getElementById('comments-section');
  modal.classList.remove('hidden');
  currentQueryId = queryId;
  content.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading...</span></div>';
  commentsSection.classList.add('hidden');

  try {
    const data = await apiCall(`/queries/${queryId}`);
    const q = data.query;

    content.innerHTML = `
      <h3 class="modal-title">${escHtml(q.title)}</h3>
      <div class="modal-meta">
        <span class="badge badge-status-${q.status}">${q.status}</span>
        <span class="badge badge-priority-${q.priority}">${q.priority}</span>
        <span class="badge" style="background:rgba(74,122,181,0.1);color:#4a7ab5">${q.category}</span>
      </div>
      <div class="modal-desc">${escHtml(q.description)}</div>
      <div class="modal-info">
        <div class="modal-info-item"><label>Submitted</label><span>${formatDate(q.createdAt)}</span></div>
        <div class="modal-info-item"><label>Last Updated</label><span>${formatDate(q.updatedAt)}</span></div>
        <div class="modal-info-item"><label>Category</label><span>${q.category}</span></div>
        <div class="modal-info-item"><label>Query ID</label><span style="font-family:var(--font-mono);font-size:11px">${q._id}</span></div>
      </div>
      ${q.adminResponse ? `
        <div class="modal-response">
          <div class="modal-response-label">✅ Staff Response</div>
          <div class="modal-response-text">${escHtml(q.adminResponse)}</div>
        </div>` : `
        <div class="modal-response" style="border-color:rgba(245,158,11,0.2);background:rgba(245,158,11,0.03)">
          <div class="modal-response-label" style="color:var(--amber-400)">⏳ Awaiting Response</div>
          <div class="modal-response-text">Our team will respond to your query shortly.</div>
        </div>`}
    `;

    // Store query data for PDF
    queriesCache[queryId] = q;

    // Show comments section
    commentsSection.classList.remove('hidden');
    renderComments(q.comments || [], queryId);

  } catch (err) {
    content.innerHTML = `<div class="empty-state">Error loading query details.</div>`;
  }
}

function closeModal(event) {
  if (event.target === document.getElementById('query-modal')) {
    document.getElementById('query-modal').classList.add('hidden');
  }
}

// ========================
// COMMENTS: RENDER
// ========================
function renderComments(comments, queryId) {
  const list = document.getElementById('comments-list');
  if (comments.length === 0) {
    list.innerHTML = '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:8px">No comments yet. Ask a follow-up question!</div>';
    return;
  }
  list.innerHTML = comments.map(c => `
    <div class="comment-bubble ${c.role}">
      <div class="comment-meta">
        <span class="comment-name">${escHtml(c.userName)}</span>
        <span>${c.role === 'admin' ? '🛡 Admin' : '🎓 Student'}</span>
        <span>${formatDate(c.createdAt)}</span>
        ${c.userId === currentUser?.id ? `<button class="comment-delete" onclick="deleteComment('${queryId}','${c._id}')">✕</button>` : ''}
      </div>
      <div>${escHtml(c.text)}</div>
    </div>
  `).join('');
}

// ========================
// COMMENTS: ADD
// ========================
async function addComment(event) {
  event.preventDefault();
  const input = document.getElementById('comment-input');
  const text = input.value.trim();
  if (!text || !currentQueryId) return;

  try {
    await apiCall(`/queries/${currentQueryId}/comments`, 'POST', { text });
    input.value = '';
    // Refresh modal
    const data = await apiCall(`/queries/${currentQueryId}`);
    renderComments(data.query.comments || [], currentQueryId);
    queriesCache[currentQueryId] = data.query;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ========================
// COMMENTS: DELETE
// ========================
async function deleteComment(queryId, commentId) {
  try {
    await apiCall(`/queries/${queryId}/comments/${commentId}`, 'DELETE');
    const data = await apiCall(`/queries/${queryId}`);
    renderComments(data.query.comments || [], queryId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ========================
// PDF: DOWNLOAD QUERY
// ========================
function downloadQueryPDF() {
  if (!currentQueryId || !queriesCache[currentQueryId]) {
    showToast('No query selected', 'error');
    return;
  }
  const q = queriesCache[currentQueryId];

  const content = `
CampusEcho — Query Report
=========================

Title       : ${q.title}
Category    : ${q.category}
Priority    : ${q.priority}
Status      : ${q.status}
Submitted   : ${formatDate(q.createdAt)}
Last Updated: ${formatDate(q.updatedAt)}
Query ID    : ${q._id}

Description
-----------
${q.description}

${q.adminResponse ? `Staff Response\n--------------\n${q.adminResponse}` : 'Staff Response: Awaiting response'}

${q.comments && q.comments.length > 0 ? `\nComments\n--------\n${q.comments.map(c => `[${c.role.toUpperCase()}] ${c.userName} (${formatDate(c.createdAt)})\n${c.text}`).join('\n\n')}` : ''}

---
Generated by CampusEcho on ${new Date().toLocaleString('en-IN')}
  `.trim();

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `query-${q._id.slice(-6)}-${q.title.slice(0,20).replace(/\s+/g,'-')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Query downloaded!', 'success');
}

// ========================
// ADMIN: FETCH ALL QUERIES
// ========================
async function fetchAdminQueries() {
  const status = document.getElementById('admin-filter-status')?.value || '';
  const priority = document.getElementById('admin-filter-priority')?.value || '';
  const search = document.getElementById('admin-search')?.value || '';

  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (priority) params.append('priority', priority);
  if (search) params.append('search', search);

  const container = document.getElementById('admin-queries-list');
  if (container) {
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading all queries...</span></div>';
  }

  try {
    const data = await apiCall(`/admin/queries?${params.toString()}`);
    const { queries, stats } = data;

    // Admin stats bar
    const adminStatsEl = document.getElementById('admin-stats');
    if (adminStatsEl) {
      adminStatsEl.innerHTML = `
        <div class="admin-stat"><span class="admin-stat-num">${stats.total}</span><span class="admin-stat-label">Total</span></div>
        <div class="admin-stat"><span class="admin-stat-num" style="color:var(--amber-400)">${stats.pending}</span><span class="admin-stat-label">Pending</span></div>
        <div class="admin-stat"><span class="admin-stat-num" style="color:var(--sky-500)">${stats.inProgress}</span><span class="admin-stat-label">In Progress</span></div>
        <div class="admin-stat"><span class="admin-stat-num" style="color:var(--emerald-400)">${stats.resolved}</span><span class="admin-stat-label">Resolved</span></div>
        <div class="admin-stat"><span class="admin-stat-num" style="color:var(--rose-400)">${stats.urgent}</span><span class="admin-stat-label">Urgent</span></div>
      `;
    }

    if (container) renderQueriesList(queries, container, true);
  } catch (err) {
    showToast(err.message, 'error');
    if (container) container.innerHTML = `<div class="empty-state">Error loading queries.</div>`;
  }
}

// ========================
// ADMIN: UPDATE QUERY STATUS
// ========================
async function updateQueryStatus(queryId) {
  const statusSelect = document.getElementById(`status-select-${queryId}`);
  const newStatus = statusSelect.value;

  try {
    await apiCall(`/queries/${queryId}`, 'PUT', { status: newStatus });
    showToast(`Status updated to "${newStatus}"`, 'success');
    fetchAdminQueries();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Admin modal (read-only for admin too)
function openAdminQueryModal(queryId) {
  openQueryModal(queryId);
}

function debounceAdminSearch() {
  clearTimeout(adminSearchTimeout);
  adminSearchTimeout = setTimeout(fetchAdminQueries, 400);
}

// ========================
// FORM: RESET QUERY FORM
// ========================
function resetQueryForm() {
  document.getElementById('query-form').reset();
  document.getElementById('query-error').classList.add('hidden');
  document.getElementById('query-success').classList.add('hidden');
  document.getElementById('title-count').textContent = '0/100';
  document.getElementById('desc-count').textContent = '0/1000';
}

// ========================
// HELPERS
// ========================
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

// ========================
// CHAR COUNTERS
// ========================
document.addEventListener('DOMContentLoaded', () => {
  const titleInput = document.getElementById('q-title');
  const descInput = document.getElementById('q-description');

  if (titleInput) {
    titleInput.addEventListener('input', () => {
      document.getElementById('title-count').textContent = `${titleInput.value.length}/100`;
    });
  }
  if (descInput) {
    descInput.addEventListener('input', () => {
      document.getElementById('desc-count').textContent = `${descInput.value.length}/1000`;
    });
  }

  // ========================
  // KEYBOARD: Submit forms on Enter key
  // ========================
  document.getElementById('login-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('login-form').requestSubmit();
  });
  document.getElementById('login-email').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('login-form').requestSubmit();
  });
  document.getElementById('reg-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('register-form').requestSubmit();
  });
  document.getElementById('reg-email').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('register-form').requestSubmit();
  });
  document.getElementById('reg-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('register-form').requestSubmit();
  });

  // ========================
  // AUTO-LOGIN: Check if token exists in localStorage
  // This allows session to persist across page refreshes
  // ========================
  const savedToken = localStorage.getItem('campusecho_token');
  const savedUser = localStorage.getItem('campusecho_user');

  if (savedToken && savedUser) {
    try {
      const user = JSON.parse(savedUser);
      // Verify token is still valid by hitting /api/auth/me
      fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${savedToken}` }
      })
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          initDashboard(data.user);
        } else {
          logout(true);
        }
      })
      .catch(() => logout(true));
    } catch {
      logout(true);
    }
  }
});