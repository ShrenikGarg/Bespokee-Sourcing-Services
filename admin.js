// ─── Constants ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

// ─── State ───────────────────────────────────────────────────────────────────
let allCards       = [];   // full list fetched from API
let filteredCards  = [];   // after title-search filter applied
let currentPage    = 1;
let messageDismissTimer = null;

// ─── Messages ────────────────────────────────────────────────────────────────
function showAdminMessage(message, type = 'success') {
  const el = document.getElementById('admin-message');
  el.textContent = message;
  el.className = `admin-message ${type}`;
  el.style.display = 'block';

  // auto-dismiss after 4 s
  clearTimeout(messageDismissTimer);
  messageDismissTimer = setTimeout(() => {
    el.style.display = 'none';
  }, 4000);
}

function hideAdminMessage() {
  clearTimeout(messageDismissTimer);
  const el = document.getElementById('admin-message');
  el.style.display = 'none';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function postJson(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

async function fetchJson(url) {
  const res = await fetch(url, { credentials: 'include' });
  return res.json();
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function escAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── Image preview (add form) ─────────────────────────────────────────────────
function initAddImagePreview() {
  const input = document.getElementById('card-image');
  const wrap  = document.getElementById('image-preview-wrap');
  const img   = document.getElementById('image-preview');

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) { wrap.style.display = 'none'; return; }
    img.src = URL.createObjectURL(file);
    wrap.style.display = 'block';
  });
}

// ─── Image preview (edit modal) ───────────────────────────────────────────────
function initEditImagePreview() {
  const input = document.getElementById('edit-image');
  const wrap  = document.getElementById('edit-image-preview-wrap');
  const img   = document.getElementById('edit-image-preview');

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) { wrap.style.display = 'none'; return; }
    img.src = URL.createObjectURL(file);
    wrap.style.display = 'block';
  });
}

// ─── Render card list (current page) ─────────────────────────────────────────
function renderCardList() {
  const container = document.getElementById('card-list-container');

  if (!filteredCards || filteredCards.length === 0) {
    container.innerHTML = '<p>No card items found.</p>';
    document.getElementById('pagination-container').innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(filteredCards.length / PAGE_SIZE);
  if (currentPage > totalPages) currentPage = totalPages;

  const start    = (currentPage - 1) * PAGE_SIZE;
  const pageCards = filteredCards.slice(start, start + PAGE_SIZE);

  const rows = pageCards.map(card => `
    <div data-card-id="${card.id}" style="
      display:grid;
      grid-template-columns:110px 1fr auto;
      gap:12px;
      align-items:center;
      padding:10px 0;
      border-bottom:1px solid rgba(0,0,0,.08);
    ">
      <img
        src="${escAttr(card.image_url)}"
        alt="${escAttr(card.title)}"
        loading="lazy"
        style="width:100px;height:100px;object-fit:contain;border-radius:8px;background:#f5f5f5;padding:5px;">
      <div>
        <strong>${escAttr(card.title)}</strong>
        <div style="font-size:.95rem;color:#5b4969;">${escAttr(card.category)}</div>
        <div style="font-size:.82rem;color:#8a6fa8;margin-top:2px;">Sort: ${card.sort_order ?? 0}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
        <button class="edit-btn"
          data-id="${card.id}"
          data-title="${escAttr(card.title)}"
          data-category="${escAttr(card.category)}"
          data-sort="${card.sort_order ?? 0}">Edit</button>
        <button class="delete-btn"
          data-id="${card.id}"
          data-image-path="${escAttr(card.image_path ?? '')}">Delete</button>
      </div>
    </div>`).join('');

  container.innerHTML = rows;

  // Edit listeners
  container.querySelectorAll('button.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openEditModal(btn.dataset.id, btn.dataset.title, btn.dataset.category, btn.dataset.sort);
    });
  });

  // Delete listeners (show confirm state)
  container.querySelectorAll('button.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => showDeleteConfirm(btn));
  });

  renderPagination(totalPages);
}

// ─── Delete with inline confirmation ─────────────────────────────────────────
function showDeleteConfirm(deleteBtn) {
  const row = deleteBtn.closest('div[data-card-id]');
  const actionsDiv = deleteBtn.parentElement;

  // Swap buttons to confirm / cancel
  actionsDiv.innerHTML = `
    <span style="font-size:.88rem;color:#821d2d;font-weight:700;">Sure?</span>
    <button class="confirm-delete-btn"
      data-id="${deleteBtn.dataset.id}"
      data-image-path="${deleteBtn.dataset.imagePath}">Yes, delete</button>
    <button class="cancel-delete-btn">Cancel</button>
  `;

  actionsDiv.querySelector('.confirm-delete-btn').addEventListener('click', async () => {
    const id        = deleteBtn.dataset.id;
    const imagePath = deleteBtn.dataset.imagePath;
    try {
      await deleteCard(id, imagePath);
      showAdminMessage('Card deleted successfully.', 'success');
      await loadCards();
    } catch (err) {
      showAdminMessage(err.message || 'Delete failed.', 'error');
    }
  });

  actionsDiv.querySelector('.cancel-delete-btn').addEventListener('click', () => {
    // Re-render to restore original buttons
    renderCardList();
  });
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function renderPagination(totalPages) {
  const container = document.getElementById('pagination-container');
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  const start = (currentPage - 1) * PAGE_SIZE + 1;
  const end   = Math.min(currentPage * PAGE_SIZE, filteredCards.length);

  let html = `
    <button id="pg-prev" ${currentPage === 1 ? 'disabled' : ''}>← Prev</button>
    <span class="pagination-info">${start}–${end} of ${filteredCards.length}</span>`;

  for (let p = 1; p <= totalPages; p++) {
    html += `<button class="pg-num ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
  }

  html += `<button id="pg-next" ${currentPage === totalPages ? 'disabled' : ''}>Next →</button>`;
  container.innerHTML = html;

  container.querySelector('#pg-prev').addEventListener('click', () => { currentPage--; renderCardList(); });
  container.querySelector('#pg-next').addEventListener('click', () => { currentPage++; renderCardList(); });
  container.querySelectorAll('.pg-num').forEach(btn => {
    btn.addEventListener('click', () => { currentPage = Number(btn.dataset.page); renderCardList(); });
  });
}

// ─── Title search (client-side filter) ───────────────────────────────────────
function applyTitleFilter() {
  const query = document.getElementById('title-search').value.trim().toLowerCase();
  filteredCards = query
    ? allCards.filter(c => c.title.toLowerCase().includes(query))
    : [...allCards];
  currentPage = 1;
  renderCardList();
}

// ─── API calls ────────────────────────────────────────────────────────────────
async function deleteCard(id, imagePath) {
  const res = await fetch('/api/cards', {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, imagePath }),
  });
  const result = await res.json();
  if (!result.success) throw new Error(result.error || 'Unable to delete card.');
}

async function loadCards() {
  const container = document.getElementById('card-list-container');
  container.textContent = 'Loading cards…';
  document.getElementById('pagination-container').innerHTML = '';

  try {
    const filter = document.getElementById('category-filter');
    let url = '/api/cards';
    if (filter && filter.value) url += `?category=${encodeURIComponent(filter.value)}`;

    const result = await fetchJson(url);

    if (result.error) {
      if (result.error === 'Unauthorized') { showLogin(); return; }
      container.innerHTML = `<p>${result.error}</p>`;
      return;
    }

    allCards      = result;
    filteredCards = [...allCards];
    currentPage   = 1;

    // Re-apply any active title search
    const query = document.getElementById('title-search').value.trim().toLowerCase();
    if (query) filteredCards = allCards.filter(c => c.title.toLowerCase().includes(query));

    renderCardList();
  } catch (err) {
    container.innerHTML = `<p>${err.message}</p>`;
  }
}

// ─── Edit modal ───────────────────────────────────────────────────────────────
function openEditModal(id, title, category, sortOrder) {
  document.getElementById('edit-title').value        = title;
  document.getElementById('edit-category').value     = category;
  document.getElementById('edit-sort-order').value   = sortOrder ?? 0;
  document.getElementById('edit-image').value        = '';
  document.getElementById('edit-image-preview-wrap').style.display = 'none';
  document.getElementById('edit-save-btn').dataset.id = id;
  document.getElementById('edit-modal').classList.add('open');
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.remove('open');
}

async function saveCardEdit(id) {
  const title     = document.getElementById('edit-title').value.trim();
  const category  = document.getElementById('edit-category').value;
  const sortOrder = Number(document.getElementById('edit-sort-order').value) || 0;
  const fileInput = document.getElementById('edit-image');
  const file      = fileInput.files[0];

  if (!title) { showAdminMessage('Title cannot be empty.', 'error'); return; }

  try {
    let imageBase64 = null;
    let imageName   = null;
    if (file) {
      imageBase64 = await fileToBase64(file);
      imageName   = file.name;
    }

    const res = await fetch('/api/cards', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title, category, sortOrder, imageBase64, imageName }),
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Update failed.');

    closeEditModal();
    showAdminMessage('Card updated successfully.', 'success');
    await loadCards();
  } catch (err) {
    showAdminMessage(err.message || 'Update failed.', 'error');
  }
}

// ─── Auth views ───────────────────────────────────────────────────────────────
function showLogin() {
  document.getElementById('admin-login').style.display     = 'block';
  document.getElementById('admin-dashboard').style.display = 'none';
}

function showDashboard() {
  document.getElementById('admin-login').style.display     = 'none';
  document.getElementById('admin-dashboard').style.display = 'block';
  loadCards();
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function initAdminPage() {
  // Image previews
  initAddImagePreview();
  initEditImagePreview();

  // Category filter
  const filterCategory = document.getElementById('category-filter');
  if (filterCategory) filterCategory.addEventListener('change', loadCards);

  // Title search (debounced)
  const titleSearch = document.getElementById('title-search');
  let searchTimer;
  titleSearch.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyTitleFilter, 200);
  });

  // Edit modal buttons
  document.getElementById('edit-cancel-btn').addEventListener('click', closeEditModal);
  document.getElementById('edit-save-btn').addEventListener('click', () => {
    saveCardEdit(document.getElementById('edit-save-btn').dataset.id);
  });
  // Close modal on overlay click
  document.getElementById('edit-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('edit-modal')) closeEditModal();
  });

  // Logout
  document.getElementById('logout-button').addEventListener('click', async () => {
    await postJson('/api/logout', {});
    showLogin();
    showAdminMessage('Logged out.', 'success');
  });

  // Login form
  document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    hideAdminMessage();
    const password = document.getElementById('admin-password').value.trim();
    const result   = await postJson('/api/login', { password });
    if (result.success) {
      showDashboard();
      showAdminMessage('Login successful.', 'success');
      document.getElementById('login-form').reset();
    } else {
      showAdminMessage(result.error || 'Login failed.', 'error');
    }
  });

  // Add new card form
  document.getElementById('new-card-form').addEventListener('submit', async e => {
    e.preventDefault();
    hideAdminMessage();

    const title     = document.getElementById('card-title').value.trim();
    const category  = document.getElementById('card-category').value;
    const sortOrder = Number(document.getElementById('card-sort-order').value) || 0;
    const fileInput = document.getElementById('card-image');
    const file      = fileInput.files[0];

    if (!file) { showAdminMessage('Please select an image file.', 'error'); return; }

    try {
      const imageBase64 = await fileToBase64(file);
      const result      = await postJson('/api/cards', {
        title, category, sortOrder,
        imageName: file.name,
        imageBase64,
      });

      if (!result.success) {
        showAdminMessage(result.error || 'Failed to add card.', 'error');
        return;
      }

      showAdminMessage('Card added successfully.', 'success');
      document.getElementById('new-card-form').reset();
      document.getElementById('image-preview-wrap').style.display = 'none';
      await loadCards();
    } catch (err) {
      showAdminMessage(err.message || 'Upload failed.', 'error');
    }
  });

  // Check auth on page load
  try {
    const result = await fetchJson('/api/admin');
    if (result.authenticated) showDashboard(); else showLogin();
  } catch {
    showLogin();
  }
}

initAdminPage();