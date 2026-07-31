// ===== Backend API (Cloudflare Worker connected to Airtable) =====
const WORKER_API = "https://inrace-api.rowanhamdi87.workers.dev";

// ===== Cart =====
function loadCart(){
  try{
    const saved = localStorage.getItem('inrace_cart');
    if(saved) return JSON.parse(saved);
  }catch(e){}
  return [];
}
function saveCart(){
  localStorage.setItem('inrace_cart', JSON.stringify(cart));
}
let cart = loadCart();

function renderCart(){
  const badge = document.getElementById('cart-badge');
  const itemsEl = document.getElementById('cart-items');
  const emptyEl = document.getElementById('cart-empty');
  const totalEl = document.getElementById('cart-total');
  const totalAmountEl = document.getElementById('cart-total-amount');
  const checkoutEl = document.getElementById('cart-checkout');
  if(!badge || !itemsEl || !emptyEl || !totalEl || !totalAmountEl || !checkoutEl) return;

  const itemCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  badge.textContent = itemCount;
  badge.style.display = itemCount ? 'flex' : 'none';

  if(cart.length === 0){
    emptyEl.style.display = 'block';
    itemsEl.innerHTML = '';
    totalEl.style.display = 'none';
    checkoutEl.style.display = 'none';
    return;
  }
  emptyEl.style.display = 'none';
  itemsEl.innerHTML = cart.map((item, i) => {
    const qty = item.quantity || 1;
    const lineTotal = Number(item.price) * qty;
    return `
    <div class="cart-item">
      <div>
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${formatPrice(item.price)} × ${qty} = ${formatPrice(lineTotal)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="cart-qty-stepper">
          <button onclick="changeCartQuantity(${i}, -1)" aria-label="تقليل">−</button>
          <span>${qty}</span>
          <button onclick="changeCartQuantity(${i}, 1)" aria-label="زيادة">+</button>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart(${i})" aria-label="حذف">×</button>
      </div>
    </div>
  `;
  }).join('');
  const total = cart.reduce((sum, item) => sum + Number(item.price) * (item.quantity || 1), 0);
  totalEl.style.display = 'flex';
  totalAmountEl.textContent = formatPrice(total);
  checkoutEl.style.display = 'block';
  checkoutEl.onclick = function(){ window.location.href = 'inrace-checkout.html'; };
}

function addToCart(btn){
  const name = btn.getAttribute('data-name');
  const price = btn.getAttribute('data-price');
  const paymentLink = btn.getAttribute('data-payment-link') || '';
  const productId = btn.getAttribute('data-id') || '';

  const existing = cart.find(item => item.name === name && item.paymentLink === paymentLink);
  if(existing){
    existing.quantity = (existing.quantity || 1) + 1;
  } else {
    cart.push({name, price, paymentLink, productId, quantity: 1});
  }
  saveCart();
  renderCart();
  openCart();
}

function buyProductNow(p){
  const existing = cart.find(item => item.name === p.name && item.paymentLink === (p.paymentLink || ''));
  if(existing){
    existing.quantity = (existing.quantity || 1) + 1;
  } else {
    cart.push({
      name: p.name,
      price: p.price,
      paymentLink: p.paymentLink || '',
      productId: p.id || '',
      quantity: 1
    });
  }
  saveCart();
  window.location.href = 'inrace-checkout.html';
}

function changeCartQuantity(index, delta){
  const item = cart[index];
  if(!item) return;
  const newQty = (item.quantity || 1) + delta;
  if(newQty < 1){
    removeFromCart(index);
    return;
  }
  item.quantity = newQty;
  saveCart();
  renderCart();
}

function removeFromCart(index){
  cart.splice(index, 1);
  saveCart();
  renderCart();
}

function clearCart(event){
  if(event) event.stopPropagation();
  cart = [];
  saveCart();
  renderCart();
}

function openCart(){
  const panel = document.getElementById('cart-panel');
  const btn = document.getElementById('cart-btn');
  if(panel) panel.classList.add('open');
  if(btn) btn.classList.add('active');
  closeSearch();
}

function closeCart(){
  const panel = document.getElementById('cart-panel');
  const btn = document.getElementById('cart-btn');
  if(panel) panel.classList.remove('open');
  if(btn) btn.classList.remove('active');
}

function toggleCart(event){
  if(event) event.stopPropagation();
  const panel = document.getElementById('cart-panel');
  if(!panel) return;
  if(panel.classList.contains('open')) closeCart(); else openCart();
}

// ===== Search =====
function openSearch(){
  const bar = document.getElementById('search-bar');
  const btn = document.getElementById('search-btn');
  if(!bar) return;
  bar.classList.add('open');
  if(btn) btn.classList.add('active');
  closeCart();
  setTimeout(() => { const input = document.getElementById('search-input'); if(input) input.focus(); }, 150);
}

function closeSearch(){
  const bar = document.getElementById('search-bar');
  const btn = document.getElementById('search-btn');
  if(bar) bar.classList.remove('open');
  if(btn) btn.classList.remove('active');
}

function toggleSearch(event){
  if(event) event.stopPropagation();
  const bar = document.getElementById('search-bar');
  if(!bar) return;
  if(bar.classList.contains('open')) closeSearch(); else openSearch();
}

const searchInputEl = document.getElementById('search-input');
if(searchInputEl){
  searchInputEl.addEventListener('input', function(){
    const query = this.value.trim().toLowerCase();
    document.querySelectorAll('.prod-card').forEach(card => {
      const title = card.querySelector('.prod-title').textContent.toLowerCase();
      card.classList.toggle('hidden', query.length > 0 && !title.includes(query));
    });
  });
}

// ===== Product badge helper =====
function getBadgeInfo(product){
  if(product.status === 'soldout'){
    return {text: 'غير متوفر', cls: 'badge-soldout'};
  }
  if(product.oldPrice && Number(product.oldPrice) > Number(product.price)){
    const pct = Math.round((1 - (Number(product.price) / Number(product.oldPrice))) * 100);
    return {text: `خصم ${pct}%`, cls: 'badge-discount'};
  }
  return {text: 'متوفر', cls: 'badge-available'};
}

function categoryLabel(cat){
  const labels = {courses: 'كورس', templates: 'قالب', subscriptions: 'اشتراك', other: 'منتج'};
  return labels[cat] || cat || 'منتج';
}

// ===== Render products from PRODUCTS (see products-data.js) =====
// ===== Products data layer (localStorage overlay on top of products-data.js) =====
let cachedProducts = null;

// ملحوظة: الدالتين دول لسه بيستخدمهم لوحة تحكم الموظفين للإدارة المحلية للمنتجات
// (لسه معملناش endpoint لإضافة/تعديل منتجات في الـ Worker). المنتجات اللي بتظهر
// فعليًا للعملاء بتيجي مباشرة من Airtable عن طريق fetchProducts تحت.
function getProducts(){
  try{
    const saved = localStorage.getItem('inrace_products');
    if(saved) return JSON.parse(saved);
  }catch(e){}
  return (typeof PRODUCTS !== 'undefined') ? PRODUCTS.slice() : [];
}
function saveProducts(list){
  localStorage.setItem('inrace_products', JSON.stringify(list));
}

async function fetchProducts(){
  try{
    const res = await fetch(`${WORKER_API}/products`);
    const data = await res.json();
    cachedProducts = data.products || [];
  }catch(e){
    console.error('تعذّر تحميل المنتجات من السيرفر', e);
    cachedProducts = [];
  }
  return cachedProducts;
}

async function renderProducts(){
  const grid = document.getElementById('prod-grid');
  if(!grid) return;
  const all = await fetchProducts();
  const products = all.filter(p => p.status !== 'draft' && p.status !== 'archived');
  if(!products.length){
    grid.innerHTML = '';
    toggleEmptyState();
    return;
  }

  grid.innerHTML = products.map(p => {
    const badge = getBadgeInfo(p);
    const isSoldOut = p.status === 'soldout';
    const imageHTML = p.image
      ? `<img src="${p.image}" alt="${p.name}">`
      : '📦';
    const priceHTML = (p.oldPrice && Number(p.oldPrice) > Number(p.price))
      ? `<span>${formatPrice(p.oldPrice)}</span>${formatPrice(p.price)}`
      : formatPrice(p.price);
    return `
      <div class="prod-card ${isSoldOut ? 'is-soldout' : ''}" data-category="${p.category}" data-id="${p.id}" onclick="openProductModal('${p.id}')">
        <div class="prod-thumb">
          <span class="prod-badge ${badge.cls}">${badge.text}</span>
          ${imageHTML}
        </div>
        <div class="prod-body">
          <div class="prod-cat">${categoryLabel(p.category)}</div>
          <div class="prod-title">${p.name}</div>
          <p class="prod-desc">${p.shortDesc || ''}</p>
          <div class="prod-foot">
            <div class="prod-price">${priceHTML}</div>
            <button class="prod-add" ${isSoldOut ? 'disabled' : ''}
              onclick="event.stopPropagation(); ${isSoldOut ? '' : `addToCart(this)`}"
              data-name="${p.name}" data-price="${p.price}" data-payment-link="${p.paymentLink || ''}" data-id="${p.id || ''}">+</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  toggleEmptyState();
}

// ===== Product detail modal =====
async function openProductModal(id){
  const list = cachedProducts || (await fetchProducts());
  const p = list.find(item => String(item.id) === String(id));
  if(!p) return;

  const badge = getBadgeInfo(p);
  const isSoldOut = p.status === 'soldout';

  document.getElementById('modal-image').innerHTML = p.image
    ? `<img src="${p.image}" alt="${p.name}">` : '📦';
  const modalBadge = document.getElementById('modal-badge');
  modalBadge.textContent = badge.text;
  modalBadge.className = 'modal-badge ' + badge.cls;
  document.getElementById('modal-cat').textContent = categoryLabel(p.category);
  document.getElementById('modal-title').textContent = p.name;
  document.getElementById('modal-desc').textContent = p.fullDesc || p.shortDesc || '';
  document.getElementById('modal-price').innerHTML = (p.oldPrice && Number(p.oldPrice) > Number(p.price))
    ? `<span>${formatPrice(p.oldPrice)}</span>${formatPrice(p.price)}` : formatPrice(p.price);

  const addBtn = document.getElementById('modal-add-btn');
  addBtn.setAttribute('data-name', p.name);
  addBtn.setAttribute('data-price', p.price);
  addBtn.setAttribute('data-payment-link', p.paymentLink || '');
  addBtn.setAttribute('data-id', p.id || '');
  addBtn.disabled = isSoldOut;
  addBtn.textContent = isSoldOut ? 'غير متوفر حالياً' : 'أضف للسلة';
  addBtn.onclick = isSoldOut ? null : function(){ addToCart(this); };

  const buyBtn = document.getElementById('modal-buy-btn');
  if(buyBtn){
    buyBtn.disabled = isSoldOut;
    buyBtn.textContent = isSoldOut ? 'غير متوفر حالياً' : 'اشتري الآن ←';
    buyBtn.onclick = isSoldOut ? null : function(){ buyProductNow(p); };
  }

  document.getElementById('product-modal').classList.add('open');
}

function closeProductModal(){
  document.getElementById('product-modal').classList.remove('open');
}

// Close panels when clicking outside
document.addEventListener('click', function(e){
  if(!e.target.closest('.icon-btn')){
    closeCart();
  }
  if(!e.target.closest('.search-bar') && !e.target.closest('.icon-btn')){
    closeSearch();
  }
  if(e.target.id === 'product-modal'){
    closeProductModal();
  }
});

// ===== Category filter from URL (?cat=courses|templates|subscriptions) =====
function applyCategoryFilter(){
  const params = new URLSearchParams(window.location.search);
  const cat = params.get('cat');
  const cards = document.querySelectorAll('.prod-card');
  if(!cards.length) return;
  if(!cat){
    cards.forEach(card => card.classList.remove('hidden'));
    return;
  }
  cards.forEach(card => {
    card.classList.toggle('hidden', card.getAttribute('data-category') !== cat);
  });
  const productsSection = document.getElementById('products');
  if(productsSection) productsSection.scrollIntoView({behavior:'smooth', block:'start'});
}

// ===== Auto-hide the "coming soon" placeholder once real products are added =====
function toggleEmptyState(){
  const grid = document.getElementById('prod-grid');
  const emptyState = document.getElementById('empty-state');
  if(!grid || !emptyState) return;

  const hasProducts = grid.querySelectorAll('.prod-card').length > 0;
  emptyState.style.display = hasProducts ? 'none' : 'block';
  grid.style.display = hasProducts ? '' : 'none';

  const eyebrow = document.getElementById('products-eyebrow');
  const heading = document.getElementById('products-heading');
  const subhead = document.getElementById('products-subhead');
  if(hasProducts){
    if(eyebrow) eyebrow.textContent = 'المنتجات';
    if(heading) heading.textContent = 'تصفّح المنتجات';
    if(subhead) subhead.textContent = 'كل المنتجات المتاحة حالياً على Inrace Store.';
  } else {
    if(eyebrow) eyebrow.textContent = 'المنتجات';
    if(heading) heading.textContent = 'قريباً هنا';
    if(subhead) subhead.textContent = 'هنضيف المنتجات فور ما تُعتمد القائمة النهائية.';
  }
}

document.addEventListener('DOMContentLoaded', async function(){
  await renderProducts();
  toggleEmptyState();
  applyCategoryFilter();
});

// ===== "شاهد كيف يعمل" media gallery (see how-it-works-data.js) =====
function getMediaItems(){
  try{
    const saved = localStorage.getItem('inrace_media');
    if(saved) return JSON.parse(saved);
  }catch(e){}
  return (typeof HOW_IT_WORKS_MEDIA !== 'undefined') ? HOW_IT_WORKS_MEDIA.slice() : [];
}
function saveMediaItems(list){
  localStorage.setItem('inrace_media', JSON.stringify(list));
}

function mediaTypeInfo(type){
  const map = {
    image: {label: 'صورة', cls: 'badge-image', icon: '🖼️'},
    video: {label: 'فيديو', cls: 'badge-video', icon: '🎬'},
    article: {label: 'مقال', cls: 'badge-article', icon: '📄'},
    presentation: {label: 'عرض تقديمي', cls: 'badge-presentation', icon: '📊'},
    other: {label: 'محتوى', cls: 'badge-other', icon: '✨'}
  };
  return map[type] || map.other;
}

function renderMediaGallery(){
  const grid = document.getElementById('media-grid');
  if(!grid) return;
  const items = getMediaItems().filter(m => m.status !== 'draft' && m.status !== 'archived');
  if(!items.length){
    grid.innerHTML = '';
    return;
  }
  grid.innerHTML = items.map(m => {
    const info = mediaTypeInfo(m.type);
    const thumbHTML = m.thumbnail
      ? `<img src="${m.thumbnail}" alt="${m.title}">`
      : info.icon;
    const playOverlay = m.type === 'video' ? '<div class="media-play">▶</div>' : '';
    return `
      <div class="media-card" onclick="openMediaModal('${m.id}')">
        <div class="media-thumb">
          <span class="media-badge ${info.cls}">${info.label}</span>
          ${thumbHTML}
          ${playOverlay}
        </div>
        <div class="media-body">
          <div class="media-title">${m.title}</div>
          <p class="media-desc">${m.description || ''}</p>
        </div>
      </div>
    `;
  }).join('');
}

function toggleMediaEmptyState(){
  const grid = document.getElementById('media-grid');
  const emptyState = document.getElementById('hiw-empty-state');
  if(!grid || !emptyState) return;

  const hasMedia = getMediaItems().filter(m => m.status !== 'draft' && m.status !== 'archived').length > 0;
  emptyState.style.display = hasMedia ? 'none' : 'block';
  grid.style.display = hasMedia ? '' : 'none';

  const eyebrow = document.getElementById('hiw-eyebrow');
  const heading = document.getElementById('hiw-heading');
  const subhead = document.getElementById('hiw-subhead');
  if(hasMedia){
    if(heading) heading.textContent = 'كل التفاصيل هنا';
    if(subhead) subhead.textContent = 'صور، فيديوهات، ومقالات توضح كل خطوة من تجربتك مع Inrace.';
  } else {
    if(heading) heading.textContent = 'قريباً هنا';
    if(subhead) subhead.textContent = 'هنضيف الصور والفيديوهات والمقالات فور ما تُعتمد.';
  }
}

function openMediaModal(id){
  const m = getMediaItems().find(item => String(item.id) === String(id));
  if(!m) return;
  const info = mediaTypeInfo(m.type);

  const imageEl = document.getElementById('media-modal-image');
  if(m.type === 'video' && m.mediaUrl){
    if(m.mediaUrl.startsWith('data:video')){
      imageEl.innerHTML = `<video src="${m.mediaUrl}" controls style="width:100%;height:100%;object-fit:cover"></video>`;
    } else {
      imageEl.innerHTML = `<iframe src="${m.mediaUrl}" style="width:100%;height:100%;border:0" allowfullscreen></iframe>`;
    }
  } else if(m.type === 'image'){
    const src = m.mediaUrl || m.thumbnail;
    imageEl.innerHTML = src ? `<img src="${src}" alt="${m.title}">` : info.icon;
  } else {
    imageEl.innerHTML = m.thumbnail ? `<img src="${m.thumbnail}" alt="${m.title}">` : info.icon;
  }

  const badge = document.getElementById('media-modal-badge');
  badge.textContent = info.label;
  badge.className = 'modal-badge ' + info.cls;
  document.getElementById('media-modal-title').textContent = m.title;
  document.getElementById('media-modal-desc').textContent = m.fullDescription || m.description || '';

  const footEl = document.getElementById('media-modal-foot');
  const linkEl = document.getElementById('media-modal-link');
  if(m.externalLink){
    footEl.style.display = 'flex';
    linkEl.href = m.externalLink;
  } else {
    footEl.style.display = 'none';
  }

  document.getElementById('media-modal').classList.add('open');
}

function closeMediaModal(){
  const modal = document.getElementById('media-modal');
  if(modal) modal.classList.remove('open');
}

document.addEventListener('click', function(e){
  if(e.target.id === 'media-modal'){
    closeMediaModal();
  }
});

document.addEventListener('DOMContentLoaded', function(){
  renderMediaGallery();
  toggleMediaEmptyState();
});

// ===== Contact modal (email + WhatsApp — see contact-data.js) =====
function getContactInfo(){
  try{
    const saved = localStorage.getItem('inrace_contact_info');
    if(saved){
      const parsed = JSON.parse(saved);
      if(parsed && (parsed.email || parsed.whatsappNumber)) return parsed;
    }
  }catch(e){}
  return (typeof CONTACT_INFO !== 'undefined') ? CONTACT_INFO : {};
}

// بيانات التواصل الحقيقية جاية من Airtable عن طريق الـ Worker. لو الاتصال فشل
// (مثلاً مفيش إنترنت)، بترجع لنسخة محفوظة محليًا كخطة بديلة.
async function fetchContactInfo(){
  try{
    const res = await fetch(`${WORKER_API}/contact`);
    const data = await res.json();
    if(data.contact) return data.contact;
  }catch(e){
    console.error('تعذّر تحميل بيانات التواصل من السيرفر', e);
  }
  return getContactInfo();
}

async function openContactModal(event){
  if(event) event.preventDefault();
  const info = await fetchContactInfo();

  const emailLink = document.getElementById('contact-email-link');
  const emailText = document.getElementById('contact-email-text');
  const waLink = document.getElementById('contact-whatsapp-link');

  if(info.email){
    if(emailLink) emailLink.href = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(info.email);
    if(emailText) emailText.textContent = info.email;
  }
  if(waLink && info.whatsappNumber){
    const digitsOnly = info.whatsappNumber.replace(/[^0-9]/g, '');
    waLink.href = 'https://wa.me/' + digitsOnly;
  }

  const modal = document.getElementById('contact-modal');
  if(modal) modal.classList.add('open');
}

function copyContactEmail(){
  const emailText = document.getElementById('contact-email-text');
  if(!emailText || !emailText.textContent) return;
  navigator.clipboard.writeText(emailText.textContent).then(() => {
    const btn = event.target;
    const original = btn.textContent;
    btn.textContent = 'اتنسخ ✓';
    setTimeout(() => { btn.textContent = original; }, 1800);
  }).catch(() => {});
}

function closeContactModal(){
  const modal = document.getElementById('contact-modal');
  if(modal) modal.classList.remove('open');
}

document.addEventListener('click', function(e){
  if(e.target.id === 'contact-modal'){
    closeContactModal();
  }
});

// ===== Accounts & session (customers + staff) =====
function getSession(){
  try{ return JSON.parse(localStorage.getItem('inrace_session')); }catch(e){ return null; }
}
function setSession(session){
  localStorage.setItem('inrace_session', JSON.stringify(session));
}
function logoutSession(){
  localStorage.removeItem('inrace_session');
  window.location.href = 'index.html';
}
function getCustomers(){
  try{ return JSON.parse(localStorage.getItem('inrace_customers')) || []; }catch(e){ return []; }
}
function saveCustomers(list){
  localStorage.setItem('inrace_customers', JSON.stringify(list));
}
function isStaffCredentials(email, password){
  return typeof ADMIN_CREDENTIALS !== 'undefined'
    && email === ADMIN_CREDENTIALS.email
    && password === ADMIN_CREDENTIALS.password;
}

// Updates the nav "تسجيل الدخول" button based on the current session, on every page that has it
function toggleMobileMenu(){
  const nav = document.getElementById('nav-links');
  if(nav) nav.classList.toggle('open');
}

function updateAuthUI(){
  const session = getSession();

  const ctaSection = document.getElementById('signup-cta');
  if(ctaSection){
    ctaSection.style.display = session ? 'none' : '';
  }

  const btn = document.getElementById('login-btn');
  if(!btn) return;
  if(!session){
    btn.textContent = 'تسجيل الدخول';
    btn.onclick = function(){ window.location.href = 'inrace-login.html'; };
    return;
  }
  if(session.role === 'staff'){
    btn.textContent = 'لوحة التحكم';
    btn.onclick = function(){ window.location.href = 'inrace-employee-dashboard.html'; };
  } else {
    btn.textContent = 'حسابي';
    btn.onclick = function(){ window.location.href = 'inrace-account.html'; };
  }
}

document.addEventListener('DOMContentLoaded', function(){
  updateAuthUI();
  initChatWidget();
  initFooterSocialLinks();
  initCurrencySelector();
  refreshRatesAndRerender();
});

// ===== Hero 3D tilt (mouse-follow) =====
function initHeroTilt(){
  const hero = document.querySelector('.hero-visual');
  const target = document.querySelector('.sun-center');
  if(!hero || !target) return;

  let mouseX = 0.5, mouseY = 0.5;
  let idleAngle = 0;
  let lastActivity = Date.now();

  function applyTransform(){
    const rect = hero.getBoundingClientRect();
    // How far the hero has scrolled past the top of the viewport (drives a parallax tilt)
    const scrollFactor = Math.max(-1, Math.min(1, (window.innerHeight / 2 - (rect.top + rect.height / 2)) / window.innerHeight));

    const timeSinceActivity = Date.now() - lastActivity;
    let rx, ry;
    if(timeSinceActivity > 2500){
      // Nobody's touched the mouse in a while — keep it alive with a gentle idle sway
      idleAngle += 0.006;
      rx = Math.sin(idleAngle) * 8 + scrollFactor * 10;
      ry = Math.cos(idleAngle * 0.8) * 10;
    } else {
      rx = (mouseY - 0.5) * -20 + scrollFactor * 10;
      ry = (mouseX - 0.5) * 20;
    }
    target.style.transform = `perspective(800px) rotateY(${ry}deg) rotateX(${rx}deg)`;

    requestAnimationFrame(applyTransform);
  }

  window.addEventListener('mousemove', function(e){
    mouseX = e.clientX / window.innerWidth;
    mouseY = e.clientY / window.innerHeight;
    lastActivity = Date.now();
  });
  window.addEventListener('scroll', function(){
    lastActivity = Date.now();
  }, {passive: true});
  window.addEventListener('touchmove', function(e){
    if(e.touches && e.touches[0]){
      mouseX = e.touches[0].clientX / window.innerWidth;
      mouseY = e.touches[0].clientY / window.innerHeight;
    }
    lastActivity = Date.now();
  }, {passive: true});

  requestAnimationFrame(applyTransform);
}

// ===== Scroll reveal for cards/sections as they enter the viewport =====
function initScrollReveal(){
  const targets = document.querySelectorAll('.cat-card, .value-card, .about-visual, .sector-card, .benefits-box');
  if(!targets.length) return;

  if(!('IntersectionObserver' in window)){
    targets.forEach(t => t.classList.add('in-view'));
    return;
  }

  targets.forEach((el, i) => {
    el.classList.add('reveal-target');
    el.style.transitionDelay = (i % 4) * 0.08 + 's';
  });

  const observer = new IntersectionObserver(function(entries){
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, {threshold: 0.15});

  targets.forEach(t => observer.observe(t));
}

document.addEventListener('DOMContentLoaded', function(){
  initHeroTilt();
  initScrollReveal();
});

// ===== FAQ / Q&A =====
function getFaqs(){
  try{ return JSON.parse(localStorage.getItem('inrace_faqs')) || []; }catch(e){ return []; }
}
function saveFaqs(list){
  localStorage.setItem('inrace_faqs', JSON.stringify(list));
}

function renderFaqList(){
  const listEl = document.getElementById('faq-answered-list');
  if(!listEl) return;
  const faqs = getFaqs().filter(f => f.status === 'answered');
  if(!faqs.length){
    listEl.innerHTML = '<p class="faq-empty">لسه مفيش أسئلة اتجاوبت — كن أول واحدة تسألي!</p>';
    return;
  }
  listEl.innerHTML = faqs.map(f => `
    <div class="faq-item">
      <div class="faq-q">س: ${f.question}</div>
      <div class="faq-a">ج: ${f.answer}</div>
    </div>
  `).join('');
}

function openFaqModal(event){
  if(event) event.preventDefault();
  renderFaqList();
  const modal = document.getElementById('faq-modal');
  if(modal) modal.classList.add('open');
}

function closeFaqModal(){
  const modal = document.getElementById('faq-modal');
  if(modal) modal.classList.remove('open');
}

function submitFaqQuestion(){
  const input = document.getElementById('faq-question-input');
  if(!input) return;
  const question = input.value.trim();
  if(!question) return;

  const session = getSession();
  const faqs = getFaqs();
  faqs.push({
    id: 'q' + Date.now(),
    question,
    answer: '',
    status: 'pending',
    askedBy: session ? session.email : '',
    createdAt: Date.now()
  });
  saveFaqs(faqs);
  input.value = '';

  const status = document.getElementById('faq-submit-status');
  if(status){
    status.style.display = 'block';
    setTimeout(() => { status.style.display = 'none'; }, 3000);
  }
}

document.addEventListener('click', function(e){
  if(e.target.id === 'faq-modal'){
    closeFaqModal();
  }
});

// ===== Currency (display conversion only — see note below) =====
const CURRENCY_SYMBOLS = {
  USD: '$', SAR: 'ر.س', AED: 'د.إ', EGP: 'ج.م', KWD: 'د.ك', QAR: 'ر.ق', EUR: '€', GBP: '£'
};
// Fallback rates (used only if the live rate fetch fails, e.g. no internet connection)
const FALLBACK_RATES = {
  USD: 1, SAR: 3.75, AED: 3.67, EGP: 49, KWD: 0.31, QAR: 3.64, EUR: 0.92, GBP: 0.79
};

function getSelectedCurrency(){
  return localStorage.getItem('inrace_currency') || 'USD';
}

function getCachedRates(){
  try{
    const cached = JSON.parse(localStorage.getItem('inrace_fx_rates'));
    if(cached && cached.rates && (Date.now() - cached.fetchedAt) < 6 * 60 * 60 * 1000){
      return cached.rates;
    }
  }catch(e){}
  return null;
}

async function fetchExchangeRates(){
  const cached = getCachedRates();
  if(cached) return cached;
  try{
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    if(data && data.rates){
      localStorage.setItem('inrace_fx_rates', JSON.stringify({rates: data.rates, fetchedAt: Date.now()}));
      return data.rates;
    }
  }catch(e){}
  return FALLBACK_RATES;
}

function convertFromUSD(usdAmount, currencyCode, rates){
  const rate = (rates && rates[currencyCode]) || FALLBACK_RATES[currencyCode] || 1;
  return usdAmount * rate;
}

// formatPrice is synchronous (uses cached/fallback rates) so it can be called freely inside render loops.
// Live rates are refreshed in the background by refreshRatesAndRerender() on page load.
function formatPrice(usdAmount){
  const currency = getSelectedCurrency();
  const rates = getCachedRates() || FALLBACK_RATES;
  const converted = convertFromUSD(Number(usdAmount), currency, rates);
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const rounded = converted >= 100 ? Math.round(converted) : Math.round(converted * 100) / 100;
  return `${rounded} ${symbol}`;
}

function onCurrencyChange(code){
  localStorage.setItem('inrace_currency', code);
  window.location.reload();
}

function initCurrencySelector(){
  const select = document.getElementById('currency-select');
  if(select) select.value = getSelectedCurrency();
}

async function refreshRatesAndRerender(){
  await fetchExchangeRates();
  // Re-render whichever price displays exist on this page with the freshly cached rates
  if(typeof renderProducts === 'function') renderProducts();
  if(typeof renderCart === 'function') renderCart();
  if(typeof renderCheckoutSummary === 'function') renderCheckoutSummary();
}

// ===== Orders (recorded when a customer marks an item as paid at checkout) =====
function getOrders(){
  try{ return JSON.parse(localStorage.getItem('inrace_orders')) || []; }catch(e){ return []; }
}
function saveOrders(list){
  localStorage.setItem('inrace_orders', JSON.stringify(list));
}
async function recordOrder(item, paymentProof){
  const session = getSession();
  const customerEmail = session ? session.email : 'زائر (غير مسجل دخول)';
  const quantity = item.quantity || 1;
  const totalPrice = Number(item.price) * quantity;

  // نسخة محلية للوحة تحكم الموظفين (لسه بتعرض بيانات محفوظة في المتصفح، مش حية من Airtable)
  const orders = getOrders();
  orders.push({
    id: 'o' + Date.now() + Math.floor(Math.random() * 1000),
    customerEmail,
    productName: item.name,
    price: totalPrice,
    quantity,
    date: Date.now()
  });
  saveOrders(orders);

  // التسجيل الحقيقي في Airtable عن طريق الـ Worker — وبيرجعلنا رابط تنزيل سري لمرة واحدة
  let downloadToken = '';
  try{
    const res = await fetch(`${WORKER_API}/orders`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        productName: quantity > 1 ? `${item.name} (× ${quantity})` : item.name,
        productId: item.productId || '',
        customerEmail,
        price: totalPrice,
        quantity,
        paymentProofBase64: paymentProof ? paymentProof.base64 : '',
        paymentProofName: paymentProof ? paymentProof.filename : ''
      })
    });
    const data = await res.json();
    downloadToken = data.downloadToken || '';
  }catch(e){
    console.error('تعذّر تسجيل الطلب في السيرفر', e);
  }
  return downloadToken;
}

// ===== Live chat between customer and staff =====
function getChats(){
  try{ return JSON.parse(localStorage.getItem('inrace_chats')) || {}; }catch(e){ return {}; }
}
function saveChats(chats){
  localStorage.setItem('inrace_chats', JSON.stringify(chats));
}
function getChatThread(email){
  const chats = getChats();
  return chats[email] || [];
}
function pushChatMessage(email, sender, text){
  const chats = getChats();
  if(!chats[email]) chats[email] = [];
  chats[email].push({sender, text, time: Date.now()});
  saveChats(chats);
}

function renderChatMessages(email){
  const box = document.getElementById('chat-messages');
  if(!box) return;
  const thread = getChatThread(email);
  if(!thread.length){
    box.innerHTML = '<div class="chat-empty">اكتب رسالتك وهيردّ عليكِ فريق Inrace في أقرب وقت.</div>';
    return;
  }
  box.innerHTML = thread.map(m => `
    <div class="chat-msg ${m.sender === 'customer' ? 'from-customer' : 'from-staff'}">${m.text}</div>
  `).join('');
  box.scrollTop = box.scrollHeight;
}

function openChatBox(){
  const session = getSession();
  if(!session || session.role !== 'customer') return;
  renderChatMessages(session.email);
  const box = document.getElementById('chat-box');
  if(box) box.classList.add('open');
  const dot = document.querySelector('.chat-unread-dot');
  if(dot) dot.style.display = 'none';
}

function closeChatBox(){
  const box = document.getElementById('chat-box');
  if(box) box.classList.remove('open');
}

function toggleChatBox(){
  const box = document.getElementById('chat-box');
  if(!box) return;
  if(box.classList.contains('open')) closeChatBox(); else openChatBox();
}

function sendCustomerChatMessage(){
  const session = getSession();
  if(!session || session.role !== 'customer') return;
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if(!text) return;
  pushChatMessage(session.email, 'customer', text);
  input.value = '';
  renderChatMessages(session.email);
}

async function initFooterSocialLinks(){
  const info = await fetchContactInfo();

  const waLink = document.getElementById('footer-whatsapp-link');
  if(waLink && info.whatsappNumber){
    const digitsOnly = info.whatsappNumber.replace(/[^0-9]/g, '');
    waLink.href = 'https://wa.me/' + digitsOnly;
  }

  const emailLink = document.getElementById('footer-email-link');
  if(emailLink && info.email){
    emailLink.href = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(info.email);
  }

  const websiteLink = document.getElementById('footer-website-link');
  if(websiteLink && typeof CONTACT_INFO !== 'undefined' && CONTACT_INFO.websiteLink){
    websiteLink.href = CONTACT_INFO.websiteLink;
  }

  const fbLink = document.getElementById('footer-facebook-link');
  if(fbLink && typeof CONTACT_INFO !== 'undefined' && CONTACT_INFO.facebookLink){
    fbLink.href = CONTACT_INFO.facebookLink;
  }

  const liLink = document.getElementById('footer-linkedin-link');
  if(liLink && typeof CONTACT_INFO !== 'undefined' && CONTACT_INFO.linkedinLink){
    liLink.href = CONTACT_INFO.linkedinLink;
  }

  const igLink = document.getElementById('footer-instagram-link');
  if(igLink && typeof CONTACT_INFO !== 'undefined' && CONTACT_INFO.instagramLink){
    igLink.href = CONTACT_INFO.instagramLink;
  }
}

function initChatWidget(){
  const launcher = document.getElementById('chat-launcher');
  if(!launcher) return;
  const session = getSession();
  launcher.style.display = (session && session.role === 'customer') ? 'flex' : 'none';

  const chatInput = document.getElementById('chat-input');
  if(chatInput){
    chatInput.addEventListener('keydown', function(e){
      if(e.key === 'Enter') sendCustomerChatMessage();
    });
  }
}

renderCart();