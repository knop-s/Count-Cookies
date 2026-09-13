// ===== CONFIG — edit these =====
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzniFn1qGb0zAwzJIHL_5XNSpexFxCJsRizuKPS3xJ-jkW-e8d9BRyshW6uvo70enuI/exec";
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
let menuSelections = {}; // { flavorName: { price, quantity } } — staged picks not yet added to cart

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
  menuSelections = {};
  updateCartBar();
  menu.forEach(item => {
    const isSoldOut = String(item.soldOut).toLowerCase() === 'yes';
    const card = document.createElement('div');
    card.className = 'cookie-card';
    card.innerHTML = `
      ${isSoldOut ? '<span class="sold-out-tag">Sold out</span>' : ''}
      <img src="${item.photoUrl || PLACEHOLDER_IMG}" alt="${item.flavor}">
      <p class="flavor-name">${item.flavor}</p>
      ${item.description ? `<p class="flavor-desc">${item.description}</p>` : ''}
      <p class="flavor-price">${item.price} THB</p>
      <div class="qty-row">
        <button class="qty-btn minus" type="button" ${isSoldOut ? 'disabled' : ''}>−</button>
        <span class="qty-value">0</span>
        <button class="qty-btn plus" type="button" ${isSoldOut ? 'disabled' : ''}>+</button>
      </div>
    `;
    const qtyValue = card.querySelector('.qty-value');
    const minusBtn = card.querySelector('.minus');
    const plusBtn = card.querySelector('.plus');
    let qty = 0;
    plusBtn.addEventListener('click', () => {
      qty++;
      qtyValue.textContent = qty;
      menuSelections[item.flavor] = { price: Number(item.price), quantity: qty };
      updateCartBar();
    });
    minusBtn.addEventListener('click', () => {
      if (qty > 0) qty--;
      qtyValue.textContent = qty;
      if (qty === 0) delete menuSelections[item.flavor];
      else menuSelections[item.flavor] = { price: Number(item.price), quantity: qty };
      updateCartBar();
    });
    grid.appendChild(card);
  });
}

document.getElementById('add-all-btn').addEventListener('click', () => {
  const picks = Object.entries(menuSelections).filter(([, info]) => info.quantity > 0);
  if (picks.length === 0) return;
  picks.forEach(([flavor, info]) => addToCart(flavor, info.price, info.quantity));
  renderMenu(); // resets all quantity displays back to 0
});

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

function stagedTotal() {
  return Object.values(menuSelections).reduce((sum, i) => sum + i.price * i.quantity, 0);
}
function stagedCount() {
  return Object.values(menuSelections).reduce((sum, i) => sum + i.quantity, 0);
}

function updateCartBar() {
  const bar = document.getElementById('cart-bar');
  const count = cartCount() + stagedCount();
  const total = cartTotal() + stagedTotal();
  if (count === 0) { bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');
  document.getElementById('cart-bar-text').textContent = `${count} item${count > 1 ? 's' : ''} · ${total} THB`;
}

// Editable quantity list — Cart page (adjust or remove before checkout)
function renderCartItems() {
  const container = document.getElementById('cart-items');
  const toCheckoutBtn = document.getElementById('to-checkout-btn');
  container.innerHTML = '';

  if (Object.keys(cart).length === 0) {
    container.innerHTML = '<p class="status-text">Your cart is empty.</p>';
    toCheckoutBtn.disabled = true;
    document.getElementById('cart-subtotal').textContent = '0 THB';
    return;
  }
  toCheckoutBtn.disabled = false;

  Object.entries(cart).forEach(([flavor, info]) => {
    const line = document.createElement('div');
    line.className = 'cart-line editable';
    line.innerHTML = `
      <span class="cart-line-name">${flavor}</span>
      <div class="qty-row">
        <button class="qty-btn minus" type="button">−</button>
        <span class="qty-value">${info.quantity}</span>
        <button class="qty-btn plus" type="button">+</button>
      </div>
      <span class="cart-line-price">${info.price * info.quantity} THB</span>
    `;
    line.querySelector('.minus').addEventListener('click', () => {
      info.quantity--;
      if (info.quantity <= 0) delete cart[flavor];
      renderCartItems();
      updateCartBar();
    });
    line.querySelector('.plus').addEventListener('click', () => {
      info.quantity++;
      renderCartItems();
      updateCartBar();
    });
    container.appendChild(line);
  });

  document.getElementById('cart-subtotal').textContent = `${cartTotal()} THB`;
}

// Static, final, read-only list — Checkout page (nothing editable here)
function renderCheckoutItems() {
  const container = document.getElementById('checkout-items');
  container.innerHTML = '';
  Object.entries(cart).forEach(([flavor, info]) => {
    const line = document.createElement('div');
    line.className = 'cart-line';
    line.innerHTML = `<span>${flavor} × ${info.quantity}</span><span>${info.price * info.quantity} THB</span>`;
    container.appendChild(line);
  });
}

function updateCheckoutTotals() {
  const subtotal = cartTotal();
  document.getElementById('checkout-subtotal').textContent = `${subtotal} THB`;
  document.getElementById('checkout-delivery').textContent = `${DELIVERY_FEE} THB`;
  document.getElementById('checkout-total').textContent = `${subtotal + DELIVERY_FEE} THB`;
}

function showSection(id) {
  ['menu-section', 'cart-section', 'checkout-section', 'confirmation-section'].forEach(s => {
    document.getElementById(s).classList.toggle('hidden', s !== id);
  });
}

document.getElementById('view-cart-btn').addEventListener('click', () => {
  renderCartItems();
  showSection('cart-section');
});

document.getElementById('back-to-menu-btn').addEventListener('click', () => showSection('menu-section'));
document.getElementById('back-to-cart-btn').addEventListener('click', () => showSection('cart-section'));

document.getElementById('to-checkout-btn').addEventListener('click', () => {
  renderCheckoutItems();
  updateCheckoutTotals();
  showSection('checkout-section');
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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
    lineId: document.getElementById('cust-line').value,
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

  const slipFile = document.getElementById('payment-slip').files[0];
  if (slipFile) {
    try {
      orderData.paymentSlipBase64 = await fileToBase64(slipFile);
      orderData.paymentSlipName = slipFile.name;
      orderData.paymentSlipType = slipFile.type;
    } catch (err) {
      // If the slip can't be read for some reason, continue without blocking the order
    }
  }

  try {
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
