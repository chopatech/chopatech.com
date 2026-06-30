/* ============================================================
   AMRANGEL — Shared Site Behavior
   Handles: header scroll state, mobile menu, cart (localStorage),
   booking modal, and Formspree AJAX submission for every form
   marked with [data-ajax-form].
   ============================================================ */

(function(){
  "use strict";

  /* ----------------------------------------------------------
     CONFIG — set your real Formspree form ID here once.
     Create a free form at https://formspree.io pointed at
     chopatechtz@gmail.com, then replace YOUR_FORM_ID below.
     Every form on the site (newsletter, consult booking,
     enrollment, order inquiry) uses this same endpoint.
  ---------------------------------------------------------- */
  const FORMSPREE_ENDPOINT = "https://formspree.io/f/YOUR_FORM_ID";

  /* ---------------- header scroll state ---------------- */
  const header = document.getElementById('siteHeader');
  if(header){
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive:true });
  }

  /* ---------------- reveal on scroll ---------------- */
  const revealEls = document.querySelectorAll('.reveal');
  if(revealEls.length){
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('is-visible'); });
    }, { threshold:0.12 });
    revealEls.forEach(el => io.observe(el));
  }

  /* ---------------- mobile menu ---------------- */
  const menuToggle = document.getElementById('menuToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  function setMenu(open){
    if(!menuToggle || !mobileMenu) return;
    menuToggle.classList.toggle('is-open', open);
    mobileMenu.classList.toggle('is-open', open);
    menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  if(menuToggle && mobileMenu){
    menuToggle.addEventListener('click', () => setMenu(!mobileMenu.classList.contains('is-open')));
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  }
  window.addEventListener('keydown', (e) => { if(e.key === 'Escape') setMenu(false); });
  window.AmrangelSetMenu = setMenu;

  /* ============================================================
     CART  (persisted in localStorage, shared across pages)
  ============================================================ */
  const CART_KEY = 'amrangel_cart_v1';

  function getCart(){
    try{
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    }catch(e){ return []; }
  }
  function saveCart(items){
    try{ localStorage.setItem(CART_KEY, JSON.stringify(items)); }catch(e){}
    renderCart();
    updateCartCount();
  }
  function addToCart(product){
    const items = getCart();
    const existing = items.find(i => i.id === product.id);
    if(existing){ existing.qty += 1; }
    else{ items.push({ ...product, qty:1 }); }
    saveCart(items);
    openCart();
  }
  function updateQty(id, delta){
    const items = getCart();
    const item = items.find(i => i.id === id);
    if(!item) return;
    item.qty += delta;
    const filtered = item.qty <= 0 ? items.filter(i => i.id !== id) : items;
    saveCart(filtered);
  }
  function removeFromCart(id){
    saveCart(getCart().filter(i => i.id !== id));
  }
  function cartTotal(){
    return getCart().reduce((sum, i) => sum + (i.price * i.qty), 0);
  }
  function updateCartCount(){
    const count = getCart().reduce((sum, i) => sum + i.qty, 0);
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = count;
      el.setAttribute('data-count', count);
    });
  }

  function renderCart(){
    const list = document.getElementById('cartItems');
    const subtotalEl = document.getElementById('cartSubtotal');
    if(!list) return;
    const items = getCart();
    if(items.length === 0){
      list.innerHTML = '<div class="cart-empty">Your cart is empty.<br>Browse the <a href="/products/index.html" style="color:var(--rust);">Apothecary shop</a>.</div>';
    }else{
      list.innerHTML = items.map(i => `
        <div class="cart-item">
          <img src="${i.image}" alt="${i.name}">
          <div class="cart-item-info">
            <h4>${i.name}</h4>
            <div class="meta">$${i.price.toFixed(2)} each</div>
            <div class="row">
              <div class="qty-control">
                <button type="button" data-qty-down="${i.id}" aria-label="Decrease quantity">&minus;</button>
                <span>${i.qty}</span>
                <button type="button" data-qty-up="${i.id}" aria-label="Increase quantity">+</button>
              </div>
              <button type="button" class="remove-item" data-remove="${i.id}">Remove</button>
            </div>
          </div>
        </div>
      `).join('');
    }
    if(subtotalEl) subtotalEl.textContent = `$${cartTotal().toFixed(2)}`;

    list.querySelectorAll('[data-qty-up]').forEach(b => b.addEventListener('click', () => updateQty(b.dataset.qtyUp, 1)));
    list.querySelectorAll('[data-qty-down]').forEach(b => b.addEventListener('click', () => updateQty(b.dataset.qtyDown, -1)));
    list.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => removeFromCart(b.dataset.remove)));
  }

  const cartDrawer = document.getElementById('cartDrawer');
  const cartOverlay = document.getElementById('cartDrawerOverlay');
  function openCart(){
    if(!cartDrawer) return;
    renderCart();
    cartDrawer.classList.add('is-open');
    cartOverlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeCart(){
    if(!cartDrawer) return;
    cartDrawer.classList.remove('is-open');
    cartOverlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }
  document.querySelectorAll('.cart-btn').forEach(b => b.addEventListener('click', openCart));
  const cartCloseBtn = document.getElementById('cartClose');
  if(cartCloseBtn) cartCloseBtn.addEventListener('click', closeCart);
  if(cartOverlay) cartOverlay.addEventListener('click', closeCart);
  window.addEventListener('keydown', (e) => { if(e.key === 'Escape') closeCart(); });

  // expose for product pages
  window.AmrangelCart = { addToCart, getCart, cartTotal, openCart };

  updateCartCount();
  renderCart();

  /* ============================================================
     BOOKING / GENERIC MODAL (consult booking, enrollment intent)
  ============================================================ */
  const modalOverlay = document.getElementById('modalOverlay');
  if(modalOverlay){
    const modalTitle = document.getElementById('modalTitle');
    const modalDesc = document.getElementById('modalDesc');
    const modalFormView = document.getElementById('modalFormView');
    const modalSuccessView = document.getElementById('modalSuccessView');
    const bookingForm = document.getElementById('bookingForm');
    let lastFocused = null;

    function openModal(topic, desc){
      modalTitle.textContent = topic || 'Book a Consult';
      modalDesc.textContent = desc || "Fill this out and a member of the team will get back to you within two business days.";
      modalFormView.style.display = '';
      modalSuccessView.style.display = 'none';
      bookingForm.reset();
      document.getElementById('bookTopic').value = topic || 'General Consult';
      const statusEl = bookingForm.querySelector('.form-status');
      if(statusEl){ statusEl.classList.remove('is-visible','is-success','is-error'); }
      lastFocused = document.activeElement;
      modalOverlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      setTimeout(() => { const f = document.getElementById('bookName'); if(f) f.focus(); }, 250);
    }
    function closeModal(){
      modalOverlay.classList.remove('is-open');
      document.body.style.overflow = '';
      if(lastFocused) lastFocused.focus();
    }

    document.querySelectorAll('.js-open-modal').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        setMenu(false);
        openModal(el.dataset.topic, el.dataset.desc);
      });
    });
    const modalCloseBtn = document.getElementById('modalClose');
    if(modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => { if(e.target === modalOverlay) closeModal(); });
    window.addEventListener('keydown', (e) => { if(e.key === 'Escape' && modalOverlay.classList.contains('is-open')) closeModal(); });

    window.AmrangelModal = { open: openModal, close: closeModal };
  }

  /* ============================================================
     UNIVERSAL AJAX FORM HANDLER (Formspree)
     Any <form data-ajax-form> on the page is wired automatically.
     Shows inline success/error via .form-status sibling element,
     or (for the booking modal) swaps to #modalSuccessView.
  ============================================================ */
  document.querySelectorAll('[data-ajax-form]').forEach(form => {
    if(!form.getAttribute('action') || form.getAttribute('action').includes('YOUR_FORM_ID')){
      form.setAttribute('action', FORMSPREE_ENDPOINT);
    }
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const statusEl = form.querySelector('.form-status');
      const submitBtn = form.querySelector('button[type="submit"]');
      const isModalForm = form.id === 'bookingForm';

      if(submitBtn){ submitBtn.disabled = true; submitBtn.dataset.originalText = submitBtn.textContent; submitBtn.textContent = 'Sending…'; }
      if(statusEl){ statusEl.classList.remove('is-visible','is-success','is-error'); }

      try{
        const data = new FormData(form);
        const res = await fetch(form.action, {
          method: 'POST',
          body: data,
          headers: { 'Accept': 'application/json' }
        });

        if(res.ok){
          if(isModalForm){
            document.getElementById('modalFormView').style.display = 'none';
            document.getElementById('modalSuccessView').style.display = '';
            setTimeout(() => { if(window.AmrangelModal) window.AmrangelModal.close(); }, 2600);
          }else if(statusEl){
            statusEl.textContent = form.dataset.successMessage || "Thanks — we've got it.";
            statusEl.classList.add('is-visible','is-success');
            form.reset();
          }
        }else{
          const json = await res.json().catch(() => null);
          const msg = (json && json.errors) ? json.errors.map(er => er.message).join(', ') : 'Something went wrong. Please try again or email us directly.';
          if(statusEl){ statusEl.textContent = msg; statusEl.classList.add('is-visible','is-error'); }
        }
      }catch(err){
        if(statusEl){
          statusEl.textContent = 'Network error — please try again, or email chopatechtz@gmail.com directly.';
          statusEl.classList.add('is-visible','is-error');
        }
      }finally{
        if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = submitBtn.dataset.originalText || 'Submit'; }
      }
    });
  });

})();
