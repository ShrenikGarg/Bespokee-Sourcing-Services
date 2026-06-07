document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('year').textContent = new Date().getFullYear();

  // ── Page load progress bar ──────────────────────────────────────────────
  const bar = document.createElement('div');
  bar.className = 'page-progress';
  document.body.prepend(bar);
  bar.addEventListener('animationend', () => bar.remove(), { once: true });

  // ── Header height CSS variable ──────────────────────────────────────────
  function updateHeaderHeight() {
    const header = document.querySelector('.site-header');
    if (header) document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
  }
  // Measure after layout is fully painted to avoid incorrect early measurements
  requestAnimationFrame(() => { requestAnimationFrame(updateHeaderHeight); });
  window.addEventListener('resize', updateHeaderHeight);

  // ── Logo shimmer on load ────────────────────────────────────────────────
  const logo = document.querySelector('.brand-logo');
  if (logo) logo.classList.add('shimmer-once');

  // ── Scroll reveal observer ──────────────────────────────────────────────
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('show');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  // Cards: stagger within each grid so they cascade in one by one
  document.querySelectorAll('.cards').forEach(grid => {
    const cards = Array.from(grid.querySelectorAll('.card'));
    cards.forEach((card, i) => {
      card.classList.add('reveal');
      card.style.transitionDelay = (i * 80) + 'ms';
      observer.observe(card);
    });
  });

  // Section titles and labels fade up
  document.querySelectorAll('.section-title, .section-sub').forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = (i * 50) + 'ms';
    observer.observe(el);
  });

  // Section labels slide in from left
  document.querySelectorAll('.section-label').forEach(el => {
    el.classList.add('reveal');
    observer.observe(el);
  });

  // Hero content entrance (fires immediately since hero is above the fold)
  const heroContent = document.querySelector('.hero-content');
  if (heroContent) {
    // Small delay so it feels like a deliberate entrance after the carousel
    setTimeout(() => heroContent.classList.add('show'), 200);
  }

  // ── Gallery ─────────────────────────────────────────────────────────────
  if (typeof initHorizontalGallery === 'function') initHorizontalGallery();
});

function submitForm(e){
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Sending...';
  // Simulate submission
  setTimeout(()=>{
    alert('Thanks — we\'ll contact you within 24 hours.');
    btn.disabled=false; btn.textContent='Request quote';
    form.reset();
    window.location.hash='#testimonials';
  },900);
}

function scrollToTop(){window.scrollTo({top:0,behavior:'smooth'})}

// Carousel: one slide visible, auto-advance every 3s
function initHorizontalGallery(){
  const galleries = document.querySelectorAll('.horizontal-gallery');
  galleries.forEach(gallery => {
    const viewport = gallery.querySelector('.hg-viewport') || gallery;
    const track = gallery.querySelector('.hg-track');
    if (!track || !viewport) return;

    const slides = Array.from(track.children);
    if (slides.length === 0) return;

    track.style.display = 'flex';
    track.style.transition = 'transform .6s ease';
    track.style.willChange = 'transform';

    let slideWidth = 0;
    let current = 0;
    const intervalTime = 3000;
    let paused = false;
    let timer = null;

    function resizeGallery(){
      slideWidth = Math.round(viewport.getBoundingClientRect().width);
      if (slideWidth <= 0) return;

      slides.forEach(slide => {
        slide.style.flex = `0 0 ${slideWidth}px`;
        slide.style.width = `${slideWidth}px`;
      });

      track.style.width = `${slides.length * slideWidth}px`;
      update();
    }

    function update(){
      track.style.transform = `translateX(-${current * slideWidth}px)`;
    }
    function next(){ current = (current + 1) % slides.length; update(); }
    function prev(){ current = (current - 1 + slides.length) % slides.length; update(); }

    function startTimer(){ stopTimer(); timer = setInterval(()=>{ if(!paused) next(); }, intervalTime); }
    function stopTimer(){ if(timer){ clearInterval(timer); timer = null; } }

    gallery.addEventListener('mouseenter', ()=> paused = true);
    gallery.addEventListener('mouseleave', ()=> paused = false);
    gallery.addEventListener('focusin', ()=> paused = true);
    gallery.addEventListener('focusout', ()=> paused = false);

    const prevBtn = gallery.querySelector('.hg-prev');
    const nextBtn = gallery.querySelector('.hg-next');
    if (prevBtn) prevBtn.addEventListener('click', ()=>{ paused = true; prev(); setTimeout(()=> paused = false, intervalTime - 200); startTimer(); });
    if (nextBtn) nextBtn.addEventListener('click', ()=>{ paused = true; next(); setTimeout(()=> paused = false, intervalTime - 200); startTimer(); });

    gallery.addEventListener('keydown', (e)=>{
      if (e.key === 'ArrowRight') { e.preventDefault(); paused = true; next(); setTimeout(()=> paused = false, intervalTime - 200); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); paused = true; prev(); setTimeout(()=> paused = false, intervalTime - 200); }
    });

    // init — defer so layout is complete before measuring slideWidth
    requestAnimationFrame(() => {
      resizeGallery();
      startTimer();
    });
    // keep alignment on resize
    window.addEventListener('resize', resizeGallery);
  });
}