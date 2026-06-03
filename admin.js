function showAdminMessage(message, type = 'success') {
  const element = document.getElementById('admin-message');
  element.textContent = message;
  element.className = `admin-message ${type}`;
  element.style.display = 'block';
}

function hideAdminMessage() {
  const element = document.getElementById('admin-message');
  element.style.display = 'none';
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response.json();
}

async function fetchJson(url) {
  const response = await fetch(url, { credentials: 'include' });
  return response.json();
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function renderCardList(cards) {
  const container = document.getElementById('card-list-container');
  if (!cards || cards.length === 0) {
    container.innerHTML = '<p>No card items are stored yet.</p>';
    return;
  }

  const rows = cards.map(card => `
    <div style="
  display:grid;
  grid-template-columns:110px 1fr auto;
  gap:12px;
  align-items:center;
  padding:10px 0;
  border-bottom:1px solid rgba(0,0,0,.08);
">
      <img
  src="${card.image_url}"
  alt="${card.title}"
  loading="lazy"
  style="
    width:100px;
    height:100px;
    object-fit:contain;
    border-radius:8px;
    background:#f5f5f5;
    padding:5px;">
      <div>
        <strong>${card.title}</strong>
        <div style="font-size:.95rem;color:#5b4969;">${card.category}</div>
      </div>
      <div style="display:flex;gap:8px;">
  <button
    class="edit-card-btn"
    data-id="${card.id}"
    data-title="${card.title}"
    style="background:#4f8cff;color:#fff;">
    Edit
  </button>

  <button
    data-id="${card.id}"
    data-image-path="${card.image_path}"
    style="background:#ff5d5d;color:#fff;">
    Delete
  </button>
</div>
    </div>`).join('');

  container.innerHTML = rows;
  container.querySelectorAll('.edit-card-btn').forEach(button => {
  button.addEventListener('click', async () => {

    const id = button.dataset.id;
    const currentTitle = button.dataset.title;

    const newTitle = prompt(
      'Edit title:',
      currentTitle
    );

    if (!newTitle || !newTitle.trim()) return;

    try {

      await updateCard(id, newTitle);

      showAdminMessage(
        'Title updated successfully.',
        'success'
      );

      loadCards();

    } catch(error) {

      showAdminMessage(
        error.message || 'Update failed.',
        'error'
      );
    }
  });
});
}

async function deleteCard(id, imagePath) {
  const response = await fetch('/api/cards', {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, imagePath }),
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Unable to delete card.');
}

async function loadCards() {
  const container = document.getElementById('card-list-container');
  container.textContent = 'Loading cards…';
  try {
    const result = await fetchJson('/api/cards');
    if (result.error) {
      if (result.error === 'Unauthorized') {
        showLogin();
        return;
      }
      container.innerHTML = `<p>${result.error}</p>`;
      return;
    }
    renderCardList(result);
  } catch (error) {
    container.innerHTML = `<p>${error.message}</p>`;
  }
}

function showLogin() {
  document.getElementById('admin-login').style.display = 'block';
  document.getElementById('admin-dashboard').style.display = 'none';
}

function showDashboard() {
  document.getElementById('admin-login').style.display = 'none';
  document.getElementById('admin-dashboard').style.display = 'block';
  loadCards();
}

async function initAdminPage() {
  const logoutButton = document.getElementById('logout-button');
  const loginForm = document.getElementById('login-form');
  const newCardForm = document.getElementById('new-card-form');

  logoutButton.addEventListener('click', async () => {
    await postJson('/api/logout', {});
    showLogin();
    showAdminMessage('Logged out.', 'success');
  });

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    hideAdminMessage();
    const password = document.getElementById('admin-password').value.trim();

    const result = await postJson('/api/login', { password });
    if (result.success) {
      showDashboard();
      showAdminMessage('Login successful.', 'success');
      loginForm.reset();
    } else {
      showAdminMessage(result.error || 'Login failed.', 'error');
    }
  });

  newCardForm.addEventListener('submit', async event => {
    event.preventDefault();
    hideAdminMessage();

    const title = document.getElementById('card-title').value.trim();
    const category = document.getElementById('card-category').value;
    const fileInput = document.getElementById('card-image');
    const file = fileInput.files[0];

    if (!file) {
      showAdminMessage('Please select an image file.', 'error');
      return;
    }

    try {
      const imageBase64 = await fileToBase64(file);
      const result = await postJson('/api/cards', {
        title,
        category,
        imageName: file.name,
        imageBase64,
      });

      if (!result.success) {
        showAdminMessage(result.error || 'Failed to add card.', 'error');
        return;
      }

      showAdminMessage('Card added successfully.', 'success');
      newCardForm.reset();
      loadCards();
    } catch (error) {
      showAdminMessage(error.message || 'Upload failed.', 'error');
    }
  });

  try {
    const result = await fetchJson('/api/admin');
    if (result.authenticated) {
      showDashboard();
    } else {
      showLogin();
    }
  } catch (error) {
    showLogin();
  }
}

async function updateCard(id, title) {

  const response = await fetch('/api/cards', {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id,
      title
    })
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(
      result.error || 'Unable to update card.'
    );
  }

  return result;
}

initAdminPage();