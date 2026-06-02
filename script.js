document.addEventListener('DOMContentLoaded',function(){
  document.getElementById('year').textContent=new Date().getFullYear();
  // scroll reveal observer
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('show');
        obs.unobserve(entry.target);
      }
    });
  },{threshold:0.12});

  const revealTargets = Array.from(document.querySelectorAll('.card, .step, .testimonial, .hero-content, .section-title, .section-sub'));
  revealTargets.forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = (i * 60) + 'ms';
    observer.observe(el);
  });
  // initialize horizontal gallery auto-scroll
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

// Horizontal gallery: continuous auto-scroll with hover-to-pause
// Carousel: one slide visible, auto-advance every 5s, with Prev/Next
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
    const intervalTime = 5000;
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

    // pause while hovering or focusing
    gallery.addEventListener('mouseenter', ()=> paused = true);
    gallery.addEventListener('mouseleave', ()=> paused = false);
    gallery.addEventListener('focusin', ()=> paused = true);
    gallery.addEventListener('focusout', ()=> paused = false);

    const prevBtn = gallery.querySelector('.hg-prev');
    const nextBtn = gallery.querySelector('.hg-next');
    if (prevBtn) prevBtn.addEventListener('click', ()=>{ paused = true; prev(); setTimeout(()=> paused = false, intervalTime - 200); startTimer(); });
    if (nextBtn) nextBtn.addEventListener('click', ()=>{ paused = true; next(); setTimeout(()=> paused = false, intervalTime - 200); startTimer(); });

    // keyboard support
    gallery.addEventListener('keydown', (e)=>{
      if (e.key === 'ArrowRight') { e.preventDefault(); paused = true; next(); setTimeout(()=> paused = false, intervalTime - 200); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); paused = true; prev(); setTimeout(()=> paused = false, intervalTime - 200); }
    });

    // init
    resizeGallery();
    startTimer();
    // keep alignment on resize
    window.addEventListener('resize', resizeGallery);
  });
}