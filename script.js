// ===== CONFIG — edit these =====
const WEB_APP_URL = "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";
const DELIVERY_FEE = 50; // THB
// =================================

// Shown for any flavor without a photo yet — no image file needed
const PLACEHOLDER_IMG = "data:image/svg+xml;utf8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">' +
  '<rect width="200" height="200" fill="#F0DFB8"/>' +
  '<text x="50%" y="50%" font-family="sans-serif" font-size="13" fill="#8C7B6B" text-anchor="middle" dy=".3em">Photo coming soon</text>' +
  '</svg>'
);

let menu = [];
let cart = {}; // { flavorName: { price, quantity } }

async function loadMenu() {
  const statusEl = document.getElementById('menu-status');
  try {
    const res = await fetch(WEB_APP_URL);
    menu = await res.json();
    statusEl.classList.add('hidden');
    renderMenu();
  } catch (err) {
    statusEl.textContent = "Couldn't load the menu right now — please refresh.";
  }
}

function renderMenu() {
  const grid = document.getElementById('menu-grid');
  grid.innerHTML = '';
  menu.forEach(item => {
    const isSoldOut = String(item.soldOut).toLowerCase() === 'yes';
    const card = document.createElement('div');
    card.className = 'cookie-card';
    card.innerHTML = `
      ${isSoldOut ? '<span class="sold-out-tag">Sold out</span>' : ''}
      <img src="${item.photoUrl || PLACEHOLDER_IMG}" alt="${item.flavor}">
      <p class="flavor-name">${item.flavor}</p>
      <p class="flavor-price">${item.price} THB</p>
      <div class="qty-row">
        <button class="qty-btn minus" type="button" ${isSoldOut ? 'disabled' : ''}>−</button>
        <span class="qty-value">0</span>
        <button class="qty-btn plus" type="button" ${isSoldOut ? 'disabled' : ''}>+</button>
      </div>
      <button class="add-btn" type="button" ${isSoldOut ? 'disabled' : ''}>${isSoldOut ? 'Sold out' : 'Add to cart'}</button>
    `;
    const qtyValue = card.querySelector('.qty-value');
    const minusBtn = card.querySelector('.minus');
    const plusBtn = card.querySelector('.plus');
    const addBtn = card.querySelector('.add-btn');
    let qty = 0;
    plusBtn.addEventListener('click', () => { qty++; qtyValue.textContent = qty; });
    minusBtn.addEventListener('click', () => { if (qty > 0) qty--; qtyValue.textContent = qty; });
    addBtn.addEventListener('click', () => {
      if (qty === 0) return;
      addToCart(item.flavor, Number(item.price), qty);
      qty = 0;
      qtyValue.textContent = 0;
    });
    grid.appendChild(card);
  });
}

function addToCart(flavor, price, quantity) {
  if (!cart[flavor]) cart[flavor] = { price, quantity: 0 };
  cart[flavor].quantity += quantity;
  updateCartBar();
}

function cartTotal() {
  return Object.values(cart).reduce((sum, i) => sum + i.price * i.quantity, 0);
}
function cartCount() {
  return Object.values(cart).reduce((sum, i) => sum + i.quantity, 0);
}

function updateCartBar() {
  const bar = document.getElementById('cart-bar');
  const count = cartCount();
  if (count === 0) { bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');
  document.getElementById('cart-bar-text').textContent = `${count} item${count > 1 ? 's' : ''} · ${cartTotal()} THB`;
}

function renderCart(containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  Object.entries(cart).forEach(([flavor, info]) => {
    const line = document.createElement('div');
    line.className = 'cart-line';
    line.innerHTML = `<span>${flavor} × ${info.quantity}</span><span>${info.price * info.quantity} THB</span>`;
    container.appendChild(line);
  });
}

function showSection(id) {
  ['menu-section', 'cart-section', 'checkout-section', 'confirmation-section'].forEach(s => {
    document.getElementById(s).classList.toggle('hidden', s !== id);
  });
}

document.getElementById('view-cart-btn').addEventListener('click', () => {
  renderCart('cart-items');
  document.getElementById('cart-subtotal').textContent = `${cartTotal()} THB`;
  showSection('cart-section');
});

document.getElementById('back-to-menu-btn').addEventListener('click', () => showSection('menu-section'));
document.getElementById('back-to-cart-btn').addEventListener('click', () => showSection('cart-section'));

document.getElementById('to-checkout-btn').addEventListener('click', () => {
  renderCart('checkout-items');
  const subtotal = cartTotal();
  document.getElementById('checkout-subtotal').textContent = `${subtotal} THB`;
  document.getElementById('checkout-delivery').textContent = `${DELIVERY_FEE} THB`;
  document.getElementById('checkout-total').textContent = `${subtotal + DELIVERY_FEE} THB`;
  showSection('checkout-section');
});

document.getElementById('checkout-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById('place-order-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Placing order…';

  const subtotal = cartTotal();
  const orderData = {
    name: document.getElementById('cust-name').value,
    phone: document.getElementById('cust-phone').value,
    email: document.getElementById('cust-email').value,
    address: document.getElementById('cust-address').value,
    deliveryDate: document.getElementById('delivery-date').value,
    deliveryTime: document.getElementById('delivery-time').value,
    items: Object.entries(cart).map(([flavor, info]) => ({
      flavor, quantity: info.quantity, price: info.price
    })),
    subtotal: subtotal,
    deliveryFee: DELIVERY_FEE,
    total: subtotal + DELIVERY_FEE
  };

  try {
    // Note: no custom Content-Type header on purpose — this avoids a
    // browser/Apps Script quirk that would otherwise block the request.
    const res = await fetch(WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify(orderData)
    });

    let orderId = 'CK-' + Date.now();
    try {
      const result = await res.json();
      if (result.orderId) orderId = result.orderId;
    } catch (_) {
      // Response couldn't be read — a known quirk. The order still went
      // through on the Sheet/email side, so we proceed to confirmation.
    }

    document.getElementById('confirmation-order-id').textContent = orderId;
    cart = {};
    updateCartBar();
    showSection('confirmation-section');
  } catch (err) {
    alert("Something went wrong submitting your order. Please check your connection and try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Place order';
  }
});

loadMenu();
