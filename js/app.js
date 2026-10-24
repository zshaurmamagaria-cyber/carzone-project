const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v === null ? d : v; } catch { return d; } };
const money = n => '$' + Math.round(n).toLocaleString('en-US');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const FALLBACK = "data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%27600%27%20height=%27380%27%3E%3Crect%20width=%27600%27%20height=%27380%27%20fill=%27%23262a31%27/%3E%3Ctext%20x=%2750%25%27%20y=%2756%25%27%20font-size=%2792%27%20text-anchor=%27middle%27%3E%F0%9F%9A%97%3C/text%3E%3C/svg%3E";
const img = (src, cls = '') => `<img class="${cls}" src="${esc(src)}" alt="car" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${FALLBACK}'">`;

function guardImg(im) {
  const fail = () => { im.src = FALLBACK; };
  im.addEventListener('error', fail, { once: true });
  if (im.complete && im.naturalWidth === 0) fail();
}

function pop(el) {
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

const noMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function burst(rect, emoji) {
  if (noMotion() || !rect || !rect.width) return;
  [-18, 0, 18].forEach((dx, i) => {
    const s = document.createElement('span');
    s.className = 'burst';
    s.textContent = emoji;
    s.style.left = (rect.left + rect.width / 2 + dx) + 'px';
    s.style.top = (rect.top + rect.height / 2) + 'px';
    s.style.animationDelay = (i * 70) + 'ms';
    document.body.append(s);
    setTimeout(() => s.remove(), 1400 + i * 70);
  });
}

function flyToCart(imgEl) {
  if (noMotion() || !imgEl || !imgEl.src) return;
  const rect = imgEl.getBoundingClientRect();
  const target = document.querySelector('[data-act="openCart"]').getBoundingClientRect();
  if (!rect.width || !target.width) return;
  const fly = imgEl.cloneNode();
  fly.className = 'fly';
  fly.removeAttribute('loading');
  fly.style.left = rect.left + 'px';
  fly.style.top = rect.top + 'px';
  fly.style.width = rect.width + 'px';
  fly.style.height = rect.height + 'px';
  document.body.append(fly);
  const dx = (target.left + target.width / 2) - (rect.left + rect.width / 2);
  const dy = (target.top + target.height / 2) - (rect.top + rect.height / 2);
  requestAnimationFrame(() => {
    fly.style.transform = `translate(${dx}px, ${dy}px) scale(.12) rotate(10deg)`;
    fly.style.opacity = '.3';
  });
  setTimeout(() => fly.remove(), 850);
}

let cars = load('cars', DEFAULT_CARS);
const synced = cars.map(c => c.custom ? c : (DEFAULT_CARS.find(d => d.id === c.id) || c));
if (JSON.stringify(synced) !== JSON.stringify(cars)) { cars = synced; save('cars', cars); }
let favorites = load('favorites', []);
let cart = (Array.isArray(load('cart', [])) ? load('cart', []) : [])
  .map(i => (i && typeof i === 'object') ? i : { id: i, qty: 1 })
  .filter(i => i.id != null)
  .map(i => ({ id: i.id, qty: Number(i.qty) > 0 ? Number(i.qty) : 1 }));
let compare = [];
let page = 1;
let discount = 0;
let deleteId = null;
const PER_PAGE = 6;

function notify(msg, isError = false) {
  const box = $('#toasts');
  const t = document.createElement('div');
  t.className = 'toast' + (isError ? ' err' : '');
  t.innerText = msg;
  while (box.children.length >= 4) box.firstChild.remove();
  box.append(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 320);
  }, 2600);
}

function getList() {
  const q = $('#search').value.trim().toLowerCase();
  const brand = $('#brand').value, fuel = $('#fuel').value, trans = $('#trans').value;
  const min = Number($('#minP').value) || 0;
  const max = Number($('#maxP').value) || Infinity;
  const list = cars.filter(c =>
    `${c.brand} ${c.model}`.toLowerCase().includes(q) &&
    (brand === 'All' || c.brand === brand) &&
    (fuel === 'All' || c.fuel === fuel) &&
    (trans === 'All' || c.transmission === trans) &&
    c.price >= min && c.price <= max);
  const name = c => c.brand + ' ' + c.model;
  const sorters = {
    low: (a, b) => a.price - b.price, high: (a, b) => b.price - a.price,
    az: (a, b) => name(a).localeCompare(name(b)), za: (a, b) => name(b).localeCompare(name(a)),
    new: (a, b) => b.year - a.year, old: (a, b) => a.year - b.year
  };
  const s = $('#sort').value;
  return sorters[s] ? list.sort(sorters[s]) : list;
}

function cardHTML(c, inFavList) {
  const fav = favorites.includes(c.id), cmp = compare.includes(c.id);
  const favTitle = inFavList ? 'Remove From Favorites' : 'Favorite';
  return `<article class="card">
    <div class="pic">${img(c.image)}
      <div class="tools"><button class="${cmp ? 'on' : ''}" data-act="compare" data-id="${c.id}" title="Compare">⚖</button></div></div>
    <div class="info">
      <h3><small>${esc(c.brand)}</small>${esc(c.model)}</h3>
      <div class="tags"><span>${c.year}</span><span>${esc(c.fuel)}</span><span>${esc(c.transmission)}</span></div>
      <div class="price">${money(c.price)}</div>
      <div class="acts">
        <button class="fav ${fav ? 'on' : ''}" data-act="fav" data-id="${c.id}" title="${favTitle}">${fav ? '❤️' : '🤍'}</button>
        <button data-act="details" data-id="${c.id}">Details</button>
        <button class="add" data-act="add" data-id="${c.id}">Add To Cart</button>
        ${c.custom ? `<button class="del" data-act="askDelete" data-id="${c.id}">DELETE</button>` : ''}
      </div></div></article>`;
}

function render() {
  const list = getList();
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  page = Math.min(page, pages);
  $('#grid').innerHTML = list.slice((page - 1) * PER_PAGE, page * PER_PAGE).map(c => cardHTML(c)).join('');
  $('#empty').hidden = list.length > 0;
  let html = '';
  if (pages > 1) {
    html = `<button data-act="page" data-id="${page - 1}" ${page === 1 ? 'disabled' : ''}>&lt;</button>`;
    for (let i = 1; i <= pages; i++) html += `<button class="${i === page ? 'active' : ''}" data-act="page" data-id="${i}">${i}</button>`;
    html += `<button data-act="page" data-id="${page + 1}" ${page === pages ? 'disabled' : ''}>&gt;</button>`;
  }
  $('#pager').innerHTML = html;
  renderFavorites();
  $('#cmpBar').hidden = compare.length === 0;
  $('#cmpTxt').innerText = `${compare.length}/2 selected`;
  updateTopBtn();
}

function renderFavorites() {
  const list = cars.filter(c => favorites.includes(c.id));
  $('#favGrid').innerHTML = list.map(c => cardHTML(c, true)).join('');
  $('#favEmpty').hidden = list.length > 0;
  $('#favCount').innerText = favorites.length;
}

function toggleFav(id) {
  const i = favorites.indexOf(id);
  if (i === -1) { favorites.push(id); notify('♥ Added to favorites'); }
  else { favorites.splice(i, 1); notify('Car removed'); }
  save('favorites', favorites);
  render();
  pop($('#favCount'));
  return i === -1;
}

function updateTopBtn() {
  $('#topBtn').classList.toggle('show', window.scrollY > 500 && compare.length === 0);
}

function addToCart(id) {
  const car = cars.find(c => c.id === id);
  if (!car) return;
  const item = cart.find(i => i.id === id);
  item ? item.qty++ : cart.push({ id, qty: 1 });
  saveCart();
  notify(`✓ ${car.brand} ${car.model} added to cart`);
}

function changeQty(id, d) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += d;
  if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
  saveCart();
}

function saveCart() { save('cart', cart); renderCart(); pop($('#cartCount')); }

function renderCart() {
  cart = cart.filter(i => cars.some(c => c.id === i.id));
  $('#cartCount').innerText = cart.reduce((s, i) => s + i.qty, 0);
  $('#cartItems').innerHTML = cart.length ? cart.map(i => {
    const c = cars.find(x => x.id === i.id);
    return `<div class="item">${img(c.image)}
      <div class="n"><b>${esc(c.brand)} ${esc(c.model)}</b><small>${money(c.price)}</small></div>
      <div class="qty"><button data-act="qty" data-id="${c.id}" data-d="-1">-</button><b>${i.qty}</b><button data-act="qty" data-id="${c.id}" data-d="1">+</button></div>
      <button class="rm" data-act="rm" data-id="${c.id}" title="Remove">×</button></div>`;
  }).join('') : '<p class="empty">Your cart is empty.</p>';
  const sub = cart.reduce((s, i) => { const c = cars.find(x => x.id === i.id); return c ? s + c.price * i.qty : s; }, 0);
  const disc = sub * discount, tax = (sub - disc) * 0.1, delivery = cart.length ? 500 : 0;
  $('#totals').innerHTML = `<div><span>Subtotal:</span><span>${money(sub)}</span></div>
    ${discount ? `<div><span>Discount (10%):</span><span>-${money(disc)}</span></div>` : ''}
    <div><span>Tax:</span><span>${money(tax)}</span></div><div><span>Delivery:</span><span>${money(delivery)}</span></div>
    <div class="t"><span>TOTAL:</span><span>${money(sub - disc + tax + delivery)}</span></div>`;
}

function applyCoupon() {
  const code = $('#coupon').value.trim().toUpperCase();
  const msg = $('#couponMsg');
  if (code === 'CAR10') { discount = 0.1; msg.style.color = 'var(--ok)'; msg.innerText = 'Coupon applied: 10% off'; }
  else { discount = 0; msg.style.color = ''; msg.innerText = 'Invalid Coupon'; }
  renderCart();
}

const openModal = id => $('#' + id).classList.add('active');
const closeModals = () => $$('.modal.active').forEach(m => m.classList.remove('active'));

function showDetails(id) {
  const c = cars.find(x => x.id === id);
  if (!c) return;
  $('#detailsBody').innerHTML = `${img(c.image, 'dimg')}<h2>${esc(c.brand)} ${esc(c.model)}</h2>
    <div class="spec">
      <div><small>Year</small>${c.year}</div><div><small>Engine</small>${esc(c.engine || 'N/A')}</div>
      <div><small>Fuel</small>${esc(c.fuel)}</div><div><small>Transmission</small>${esc(c.transmission)}</div>
      <div><small>Price</small><b>${money(c.price)}</b></div></div>
    <button class="btn btn-red" data-act="add" data-id="${c.id}">Add To Cart</button>`;
  openModal('detailsModal');
}

function toggleCompare(id) {
  if (compare.includes(id)) compare = compare.filter(x => x !== id);
  else { if (compare.length === 2) compare.pop(); compare.push(id); }
  render();
}

function showCompare() {
  if (compare.length < 2) return notify('Select two cars to compare', true);
  const [a, b] = compare.map(id => cars.find(c => c.id === id));
  const rows = [['Price', c => money(c.price)], ['Year', c => c.year], ['Fuel', c => c.fuel], ['Transmission', c => c.transmission], ['Engine', c => c.engine || 'N/A']];
  $('#compareBody').innerHTML = `<h2>${esc(a.brand)} ${esc(a.model)} VS ${esc(b.brand)} ${esc(b.model)}</h2>
    <table class="cmp"><tr><td></td><td>${img(a.image)}</td><td>${img(b.image)}</td></tr>
    ${rows.map(([l, f]) => `<tr><td>${l}</td><td>${f(a)}</td><td>${f(b)}</td></tr>`).join('')}</table>`;
  openModal('compareModal');
}

function setErr(input, msg) {
  const box = input.closest('.f');
  box.classList.toggle('bad', !!msg);
  box.querySelector('small').innerText = msg;
  return !msg;
}

function check(rules) {
  let ok = true;
  rules.forEach(([el, msg, bad]) => { if (!setErr(el, bad ? msg : '')) ok = false; });
  return ok;
}

const emailBad = v => !/^\S+@\S+\.\S+$/.test(v);

$('#addForm').addEventListener('submit', e => {
  e.preventDefault();
  const brand = $('#aBrand'), model = $('#aModel'), year = $('#aYear'), price = $('#aPrice'), image = $('#aImg');
  const y = Number(year.value), p = Number(price.value);
  const ok = check([
    [brand, 'Please enter car brand.', !brand.value.trim()],
    [model, 'Please enter car model.', !model.value.trim()],
    [year, 'Please enter a valid year (1980–' + (new Date().getFullYear() + 1) + ').', !(y >= 1980 && y <= new Date().getFullYear() + 1)],
    [price, 'Please enter a valid price.', !(p > 0)],
    [image, 'Please enter a valid image URL (http...).', !/^https?:\/\//i.test(image.value.trim())]
  ]);
  if (!ok) return;
  const id = cars.length ? Math.max(...cars.map(c => c.id)) + 1 : 1;
  cars.push({ id, brand: brand.value.trim(), model: model.value.trim(), year: y, price: p, fuel: $('#aFuel').value, transmission: $('#aTrans').value, engine: 'N/A', image: image.value.trim(), custom: true });
  save('cars', cars);
  e.target.reset();
  render();
  notify(`✓ ${cars[cars.length - 1].brand} added to the list`);
});

$('#contactForm').addEventListener('submit', e => {
  e.preventDefault();
  const n = $('#cName'), m = $('#cEmail'), t = $('#cMsg');
  if (!check([[n, 'Please enter your name.', !n.value.trim()], [m, 'Please enter a valid email.', emailBad(m.value.trim())], [t, 'Please write a message.', !t.value.trim()]])) return;
  e.target.reset();
  notify('Message sent successfully!');
});

$('#checkoutForm').addEventListener('submit', e => {
  e.preventDefault();
  const n = $('#kName'), m = $('#kEmail'), p = $('#kPhone'), a = $('#kAddr'), c = $('#kCard');
  const digits = c.value.replace(/\s/g, '');
  if (!check([
    [n, 'Please enter your name.', !n.value.trim()],
    [m, 'Please enter a valid email.', emailBad(m.value.trim())],
    [p, 'Please enter a valid phone.', p.value.replace(/\D/g, '').length < 7],
    [a, 'Please enter your address.', !a.value.trim()],
    [c, 'Card number must have 16 digits.', !/^\d{16}$/.test(digits)]
  ])) return;
  const id = 'CZ-' + Math.floor(Math.random() * 900000 + 100000);
  cart = []; discount = 0; saveCart();
  e.target.reset(); closeModals();
  $('#orderId').innerText = id;
  $('#orderDate').innerText = new Date().toLocaleString();
  openModal('successModal');
});

function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const t = $('#theme');
  t.innerText = dark ? '☀️' : '🌙';
  t.classList.replace(dark ? 'mode-light' : 'mode-dark', dark ? 'mode-dark' : 'mode-light');
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (b) {
    const id = Number(b.dataset.id), act = b.dataset.act;
    const actions = {
      fav: () => { const r = b.getBoundingClientRect(); const added = toggleFav(id); if (added) burst(r, '❤️'); },
      add: () => { const holder = b.closest('.card, .box'); addToCart(id); flyToCart(holder && holder.querySelector('img')); },
      details: () => showDetails(id),
      compare: () => toggleCompare(id), showCompare, clearCompare: () => { compare = []; render(); },
      page: () => { page = id; render(); $('#cars').scrollIntoView(); },
      qty: () => changeQty(id, Number(b.dataset.d)), rm: () => { changeQty(id, -Infinity); notify('Car removed'); },
      openCart: () => { renderCart(); openModal('cartModal'); }, coupon: applyCoupon, close: closeModals,
      checkout: () => { if (!cart.length) return notify('Your cart is empty', true); closeModals(); openModal('checkoutModal'); },
      askDelete: () => { deleteId = id; openModal('confirmModal'); },
      delete: () => {
        cars = cars.filter(c => c.id !== deleteId);
        favorites = favorites.filter(f => f !== deleteId); compare = compare.filter(c => c !== deleteId);
        save('cars', cars); save('favorites', favorites);
        closeModals(); renderCart(); render(); notify('Car removed');
      }
    };
    const fn = actions[act];
    if (fn) fn();
    return;
  }
  if (e.target.classList.contains('modal')) closeModals();
  if (e.target.closest('.links a')) $('#links').classList.remove('open');
});

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModals(); });

document.addEventListener('pointerdown', e => {
  const b = e.target.closest('.btn, .acts button, .pager button, .qty button, .rm, .tools button');
  if (!b || noMotion()) return;
  const r = b.getBoundingClientRect();
  const size = Math.max(r.width, r.height);
  const s = document.createElement('span');
  s.className = 'ripple';
  s.style.width = s.style.height = size + 'px';
  s.style.left = (e.clientX - r.left - size / 2) + 'px';
  s.style.top = (e.clientY - r.top - size / 2) + 'px';
  b.append(s);
  setTimeout(() => s.remove(), 650);
});

$('#burger').addEventListener('click', () => $('#links').classList.toggle('open'));
$('#theme').addEventListener('click', () => {
  const dark = document.documentElement.getAttribute('data-theme') !== 'dark';
  localStorage.setItem('theme', dark ? 'dark' : 'light');
  applyTheme(dark);
  const t = $('#theme');
  t.classList.remove('flip'); void t.offsetWidth; t.classList.add('flip');
});

const SPY = ['home', 'cars', 'favorites', 'about', 'contact'];
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  $('.header').classList.toggle('scrolled', y > 30);
  const h = document.documentElement;
  const p = h.scrollTop / Math.max(h.scrollHeight - h.clientHeight, 1);
  $('#progress').style.transform = 'scaleX(' + Math.min(p, 1) + ')';
  let current = SPY[0];
  SPY.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.getBoundingClientRect().top <= 130) current = id;
  });
  $$('.links a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + current));
  updateTopBtn();
}, { passive: true });

$('#topBtn').addEventListener('click', () => window.scrollTo({ top: 0, behavior: noMotion() ? 'auto' : 'smooth' }));

const refresh = () => { page = 1; render(); };
['#search', '#minP', '#maxP'].forEach(s => $(s).addEventListener('input', refresh));
['#brand', '#fuel', '#trans', '#sort'].forEach(s => $(s).addEventListener('change', refresh));
$('#range').addEventListener('input', e => {
  const v = Number(e.target.value);
  $('#maxP').value = v < 100000 ? v : '';
  $('#rangeVal').innerText = v < 100000 ? 'Up to ' + money(v) : 'No limit';
  refresh();
});
$('#maxP').addEventListener('input', e => {
  const v = Number(e.target.value);
  $('#range').value = Math.min(Math.max(v || 100000, 10000), 100000);
  $('#rangeVal').innerText = v ? 'Up to ' + money(v) : 'No limit';
});
$('#reset').addEventListener('click', () => {
  $('#search').value = ''; $('#minP').value = ''; $('#maxP').value = '';
  ['#brand', '#fuel', '#trans'].forEach(s => $(s).value = 'All');
  $('#sort').value = ''; $('#range').value = 100000; $('#rangeVal').innerText = 'No limit';
  refresh();
});

function countUp(el) {
  el.innerText = '0';
  const to = Number(el.dataset.to);
  const dur = 1400;
  let start = null;
  const ease = p => 1 - Math.pow(1 - p, 3);
  function step(ts) {
    if (start === null) start = ts;
    const p = Math.min((ts - start) / dur, 1);
    el.innerText = Math.round(to * ease(p)).toLocaleString('en-US');
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

const io = new IntersectionObserver(entries => entries.forEach(en => {
  en.target.classList.add('visible');
  if (en.target.id === 'about') $$('#stats b').forEach(countUp);
  io.unobserve(en.target);
}), { threshold: 0.12 });

applyTheme(localStorage.getItem('theme') === 'dark');
render();
renderCart();
$$('.hero-img img').forEach(guardImg);
$$('.reveal').forEach(s => io.observe(s));

let loaderGone = false;
function hideLoader() {
  if (loaderGone) return;
  loaderGone = true;
  $('#loading').classList.add('done');
}
window.addEventListener('load', () => setTimeout(hideLoader, 500));
setTimeout(hideLoader, 3500);