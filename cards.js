function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderCardsPage() {
  const gallery      = document.querySelector('.product-gallery');
  const labelElement = document.querySelector('.section-label');
  if (!gallery || !labelElement) return;

  const category = labelElement.textContent.trim();
  gallery.innerHTML = '<p class="section-note">Loading products…</p>';

  fetch(`/api/cards?category=${encodeURIComponent(category)}`)
    .then(response => response.json())
    .then(data => {
      if (!Array.isArray(data) || data.length === 0) {
        gallery.innerHTML = '<p class="section-note">No products are available for this category yet.</p>';
        return;
      }

      // First 6 cards load eagerly (above the fold), rest load lazily
      gallery.innerHTML = data.map((item, i) => `
        <div class="product-card">
          <img
            src="${escapeHtml(item.image_url)}"
            alt="${escapeHtml(item.title)}"
            width="600"
            height="600"
            loading="${i < 6 ? 'eager' : 'lazy'}"
            decoding="async">
          <div class="product-desc">
            <h4>${escapeHtml(item.title)}</h4>
          </div>
        </div>
      `).join('');
    })
    .catch(() => {
      gallery.innerHTML = '<p class="section-note">Unable to load products right now.</p>';
    });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderCardsPage);
} else {
  renderCardsPage();
}