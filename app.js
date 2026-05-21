
let db, SQL;
let currentUser = null;
let cart = [];
let currentCarId = null; // for customize modal
let settings = { tax: 12, currency: '₱', maxDiscount: 10, company: 'SWAIN Inc.' };

const COLORS = [
  { name: 'Pearl White',  hex: '#F8F8F0', price: 0 },
  { name: 'Midnight Black', hex: '#1a1a1a', price: 15000 },
  { name: 'Racing Red',  hex: '#c0392b', price: 20000 },
  { name: 'Ocean Blue',  hex: '#2980b9', price: 20000 },
  { name: 'Forest Green', hex: '#27ae60', price: 20000 },
  { name: 'Sunset Orange', hex: '#e67e22', price: 25000 },
];
const WHEELS = [
  { name: 'Standard Steel', price: 0 },
  { name: 'Alloy Sport (+₱30k)', price: 30000 },
  { name: 'Carbon Fiber (+₱80k)', price: 80000 },
];
const INTERIORS = [
  { name: 'Fabric Standard', price: 0 },
  { name: 'Leather Premium (+₱50k)', price: 50000 },
  { name: 'Alcantara Sports (+₱90k)', price: 90000 },
];
const ADDONS = [
  { id:'sun', name: 'Sunroof', price: 35000 },
  { id:'cam', name: '360° Camera', price: 25000 },
  { id:'nav', name: 'Navigation System', price: 20000 },
  { id:'heat', name: 'Heated Seats', price: 18000 },
  { id:'audio', name: 'Premium Audio', price: 30000 },
  { id:'tint', name: 'Factory Tint', price: 12000 },
];

let custColor = COLORS[0], custWheel = WHEELS[0], custInterior = INTERIORS[0], custAddons = [];
let lastOrderId = null;

// ════════════════════════════════════════════════
//   LOCAL STORAGE DB HANDLING IMPORTANT 
// ════════════════════════════════════════════════
function saveDB() {
  try {
    const data = db.export();
    const str = Array.from(data).join(',');
    localStorage.setItem('csms_db', str);
    localStorage.setItem('csms_settings', JSON.stringify(settings));
  } catch(e) { console.warn('saveDB failed:', e); }
}

function loadDB() {
  try {
    const saved = localStorage.getItem('csms_db');
    if (!saved) return false;
    const arr = new Uint8Array(saved.split(',').map(Number));
    db = new SQL.Database(arr);
    const savedSettings = localStorage.getItem('csms_settings');
    if (savedSettings) Object.assign(settings, JSON.parse(savedSettings));
    return true;
  } catch(e) { console.warn('loadDB failed:', e); return false; }
}

// ════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════
async function init() {
  const bar = document.getElementById('loader-bar');
  bar.style.width = '30%';
  SQL = await initSqlJs({ locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${f}` });
  bar.style.width = '60%';
  const restored = loadDB();
  if (!restored) {
    db = new SQL.Database();
    createSchema();
    seedData();
  }
  bar.style.width = '100%';
  setTimeout(() => {
    document.getElementById('loader').style.opacity = '0';
    setTimeout(() => { document.getElementById('loader').style.display = 'none'; }, 500);
  }, 400);
  renderStoreCars();
}

// ════════════════════════════════════════════════
//  DATABASE SCHEMA
// ════════════════════════════════════════════════
function createSchema() {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fname TEXT, lname TEXT, username TEXT UNIQUE, email TEXT UNIQUE,
    phone TEXT, password TEXT, role TEXT DEFAULT 'customer',
    status TEXT DEFAULT 'active', created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model TEXT, type TEXT, price REAL, stock INTEGER DEFAULT 1,
    engine TEXT, transmission TEXT, description TEXT, emoji TEXT DEFAULT '🚗',
    status TEXT DEFAULT 'active', created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_num TEXT UNIQUE, customer_id INTEGER, cashier_id INTEGER,
    vehicle_id INTEGER, vehicle_name TEXT,
    customization TEXT, subtotal REAL, tax REAL, discount REAL, total REAL,
    payment_method TEXT, status TEXT DEFAULT 'Pending',
    notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER, username TEXT, action TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
}

function seedData() {
  const check = db.exec("SELECT COUNT(*) as c FROM users");
  if (check[0].values[0][0] > 0) return;

  // Users
  const users = [
    ['Admin', 'SWAIN', 'admin', 'admin@swain.ph', '+63 9170001111', 'admin123', 'admin'],
    ['Maria', 'Santos', 'manager', 'manager@swain.ph', '+63 9170002222', 'mgr123', 'manager'],
    ['Carlo', 'Reyes', 'cashier', 'cashier@swain.ph', '+63 9170003333', 'pos123', 'cashier'],
    ['Juan', 'dela Cruz', 'customer1', 'juan@email.ph', '+63 9170004444', 'cust123', 'customer'],
    ['Ana', 'Gonzales', 'customer2', 'ana@email.ph', '+63 9170005555', 'cust123', 'customer'],
  ];
  users.forEach(u => db.run(`INSERT INTO users (fname,lname,username,email,phone,password,role) VALUES (?,?,?,?,?,?,?)`, u));

  // Vehicles
  const vehicles = [
    ['Toyota Vios 2025', 'Sedan', 850000, 12, '1.3L DOHC', 'CVT', 'Fuel-efficient city sedan with modern safety features.', '🚗'],
    ['Honda CR-V 2025', 'SUV', 1850000, 8, '1.5L Turbo', 'CVT', 'Versatile SUV for families and adventures.', '🚙'],
    ['Ford Ranger Wildtrak', 'Truck', 1650000, 6, '2.0L Bi-Turbo', 'Automatic', 'Rugged pickup truck built for work and play.', '🛻'],
    ['Mazda MX-5 Miata', 'Sports', 2100000, 3, '2.0L SKYACTIV-G', 'Manual', 'Pure driving pleasure in iconic roadster form.', '🏎️'],
    ['Mercedes-Benz E-Class', 'Luxury', 5500000, 4, '3.0L Turbo Inline-6', 'Automatic', 'Executive sedan with cutting-edge technology.', '🚘'],
    ['Mitsubishi Xpander', 'SUV', 1100000, 15, '1.5L MIVEC', 'Automatic', 'Spacious 7-seater MPV for large families.', '🚐'],
    ['Isuzu D-Max LS-E', 'Truck', 1480000, 9, '3.0L Turbodiesel', 'Manual', 'Heavy-duty pickup with exceptional torque.', '🛻'],
    ['BMW 3 Series', 'Luxury', 3750000, 5, '2.0L TwinPower Turbo', 'Automatic', 'Sport premium sedan redefining driving dynamics.', '🚘'],
    ['Toyota GR86', 'Sports', 2450000, 2, '2.4L Boxer NA', 'Manual', 'Rear-wheel drive sports coupe for enthusiasts.', '🏎️'],
    ['Hyundai Tucson', 'SUV', 1420000, 10, '2.0L MPi', 'Automatic', 'Modern SUV with bold design and tech features.', '🚙'],
  ];
  vehicles.forEach(v => db.run(`INSERT INTO vehicles (model,type,price,stock,engine,transmission,description,emoji) VALUES (?,?,?,?,?,?,?,?)`, v));

  // Sample orders
  const orders = [
    ['ORD-0001', 4, 3, 1, 'Toyota Vios 2025', 'Color: Pearl White', 850000, 102000, 0, 952000, 'Cash', 'Completed'],
    ['ORD-0002', 5, 3, 2, 'Honda CR-V 2025', 'Color: Ocean Blue; Leather Premium', 1850000, 222000, 50000, 2022000, 'Card', 'Processing'],
    ['ORD-0003', 4, null, 3, 'Ford Ranger Wildtrak', 'Color: Midnight Black; Sunroof', 1685000, 202200, 0, 1887200, 'Bank Transfer', 'Pending'],
  ];
  orders.forEach(o => db.run(`INSERT INTO orders (order_num,customer_id,cashier_id,vehicle_id,vehicle_name,customization,subtotal,tax,discount,total,payment_method,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, o));

  // Logs
  db.run(`INSERT INTO logs (user_id,username,action) VALUES (1,'admin','System initialized')`);
}

// ════════════════════════════════════════════════
//  NAVIGATION
// ════════════════════════════════════════════════
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  const link = document.querySelector(`[data-page="${name}"]`);
  if (link) link.classList.add('active');
  if (name === 'dashboard') {
    buildDashboard();
  }
  window.scrollTo(0, 0);
}

function scrollToCars() {
  showPage('store');
  setTimeout(() => document.getElementById('inventory-section').scrollIntoView({ behavior: 'smooth' }), 100);
}

// ════════════════════════════════════════════════
//  AUTHORIZATION & USER MANAGEMENT
// ════════════════════════════════════════════════
function doLogin() {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value;
  if (!u || !p) { showLoginError('Please enter username and password.'); return; }
  const res = db.exec(`SELECT * FROM users WHERE (username=? OR email=?) AND password=? AND status='active'`, [u, u, p]);
  if (!res.length || !res[0].values.length) { showLoginError('Invalid credentials. Please try again.'); return; }
  const cols = res[0].columns, row = res[0].values[0];
  currentUser = {};
  cols.forEach((c, i) => currentUser[c] = row[i]);
  document.getElementById('login-error').style.display = 'none';
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
  updateNavForUser();
  addLog(`Logged in`);
  showPage('dashboard');
  showDashPanel('overview');
  toast(`Welcome back, ${currentUser.fname}! (${currentUser.role})`, 'success');
}

function showLoginError(msg) {
  const el = document.getElementById('login-error');
  el.textContent = msg; el.style.display = 'block';
}

function doRegister() {
  const fname = document.getElementById('reg-fname').value.trim();
  const lname = document.getElementById('reg-lname').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const uname = document.getElementById('reg-uname').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const pass = document.getElementById('reg-pass').value;
  const cpass = document.getElementById('reg-cpass').value;
  const err = document.getElementById('reg-error');
  err.style.display = 'none';
  if (!fname || !lname || !email || !uname || !pass) { err.textContent = 'Please fill all required fields.'; err.style.display = 'block'; return; }
  if (pass !== cpass) { err.textContent = 'Passwords do not match.'; err.style.display = 'block'; return; }
  if (pass.length < 6) { err.textContent = 'Password must be at least 6 characters.'; err.style.display = 'block'; return; }
  try {
    db.run(`INSERT INTO users (fname,lname,username,email,phone,password,role) VALUES (?,?,?,?,?,?,'customer')`, [fname, lname, uname, email, phone, pass]);
    saveDB();
    toast('Account created! Please sign in.', 'success');
    showPage('login');
    ['reg-fname','reg-lname','reg-email','reg-uname','reg-phone','reg-pass','reg-cpass'].forEach(id => document.getElementById(id).value = '');
  } catch(e) {
    err.textContent = 'Username or email already exists.'; err.style.display = 'block';
  }
}

function doLogout() {
  addLog('Logged out');
  currentUser = null;
  cart = [];
  updateNavForUser();
  showPage('store');
  toast('Signed out successfully.', 'info');
}

function updateNavForUser() {
  const right = document.getElementById('nav-right');
  const links = document.getElementById('nav-links');
  if (currentUser) {
    const initials = (currentUser.fname[0] + currentUser.lname[0]).toUpperCase();
    right.innerHTML = `
      <div class="nav-user">
        <div class="nav-avatar">${initials}</div>
        <div>
          <div style="font-size:13px;font-weight:600;">${currentUser.fname} ${currentUser.lname}</div>
          <div style="font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:1px;">${currentUser.role}</div>
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="showPage('dashboard')">Dashboard</button>
      <button class="btn btn-red btn-sm" onclick="doLogout()">Sign Out</button>
    `;
    links.innerHTML = `<a onclick="showPage('store')" data-page="store">Showroom</a>`;
  } else {
    right.innerHTML = `
      <button class="btn btn-outline btn-sm" onclick="showPage('login')">Sign In</button>
      <button class="btn btn-gold btn-sm" onclick="showPage('register')">Register</button>
    `;
    links.innerHTML = `<a onclick="showPage('store')" data-page="store">Showroom</a><a onclick="scrollToCars()">Inventory</a>`;
  }
}

// ════════════════════════════════════════════════
//  DASHBOARD BUILDER
// ════════════════════════════════════════════════
const MENUS = {
  admin: [
    { panel: 'overview', icon: '📊', label: 'Overview' },
    { panel: 'pos', icon: '🖥️', label: 'POS Terminal' },
    { panel: 'orders', icon: '📋', label: 'Orders' },
    { panel: 'inventory', icon: '🚗', label: 'Inventory' },
    { panel: 'users', icon: '👥', label: 'Users' },
    { panel: 'reports', icon: '📈', label: 'Reports' },
    { panel: 'settings', icon: '⚙️', label: 'Settings' },
    { panel: 'profile', icon: '👤', label: 'Profile' },
  ],
  manager: [
    { panel: 'overview', icon: '📊', label: 'Overview' },
    { panel: 'orders', icon: '📋', label: 'Orders' },
    { panel: 'inventory', icon: '🚗', label: 'Inventory' },
    { panel: 'reports', icon: '📈', label: 'Reports' },
    { panel: 'profile', icon: '👤', label: 'Profile' },
  ],
  cashier: [
    { panel: 'overview', icon: '📊', label: 'Overview' },
    { panel: 'pos', icon: '🖥️', label: 'POS Terminal' },
    { panel: 'orders', icon: '📋', label: 'My Sales' },
    { panel: 'profile', icon: '👤', label: 'Profile' },
  ],
  customer: [
    { panel: 'overview', icon: '🏠', label: 'Home' },
    { panel: 'browse', icon: '🚗', label: 'Browse Cars' },
    { panel: 'my-orders', icon: '📋', label: 'My Orders' },
    { panel: 'profile', icon: '👤', label: 'Profile' },
  ],
};

function buildDashboard() {
  if (!currentUser) { showPage('login'); return; }
  const role = currentUser.role;
  const menu = MENUS[role] || MENUS.customer;
  const sidebar = document.getElementById('sidebar-menu');
  sidebar.innerHTML = `
    <div style="padding:16px 20px 8px;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:3px;color:var(--accent);">SWAIN INC.</div>
      <div style="font-size:11px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;">${role} panel</div>
    </div>
    <div class="divider" style="margin:8px 0;"></div>
    ${menu.map(m => `<div class="sidebar-link" data-panel="${m.panel}" onclick="showDashPanel('${m.panel}')"><span class="icon">${m.icon}</span>${m.label}</div>`).join('')}
    <div class="divider" style="margin:8px 0;"></div>
    <div class="sidebar-link" onclick="doLogout()"><span class="icon">🚪</span>Sign Out</div>
  `;

  // Cashier discount cap
  if (role === 'cashier') {
    document.getElementById('cashier-discount-div').innerHTML = `
      <label class="form-label">Discount (max ${settings.maxDiscount}%)</label>
      <input class="form-input" type="number" id="discount-input" value="0" min="0" max="${settings.maxDiscount}" oninput="updateCartTotals()">
    `;
  }

  renderOverview();
}

function showDashPanel(name) {
  document.querySelectorAll('.dash-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  const panel = document.getElementById('panel-' + name);
  if (panel) panel.classList.add('active');
  const link = document.querySelector(`[data-panel="${name}"]`);
  if (link) link.classList.add('active');

  if (name === 'inventory') renderInventoryTable();
  if (name === 'orders') renderOrdersTable();
  if (name === 'users') renderUserffsTable();
  if (name === 'reports') renderReports();
  if (name === 'pos') { renderPOSProducts(); loadPOSCustomers(); }
  if (name === 'my-orders') renderMyOrders();
  if (name === 'browse') renderBrowseGrid('all');
  if (name === 'profile') loadProfile();
  if (name === 'settings') renderLogs();
}

// ════════════════════════════════════════════════
//  OVERVIEW
// ════════════════════════════════════════════════
function renderOverview() {
  const role = currentUser.role;
  let stats = [];
  if (role === 'admin' || role === 'manager') {
    const totalSales = db.exec(`SELECT COALESCE(SUM(total),0) FROM orders WHERE status='Completed'`)[0].values[0][0];
    const totalOrders = db.exec(`SELECT COUNT(*) FROM orders`)[0].values[0][0];
    const totalCustomers = db.exec(`SELECT COUNT(*) FROM users WHERE role='customer'`)[0].values[0][0];
    const totalVehicles = db.exec(`SELECT COUNT(*) FROM vehicles`)[0].values[0][0];
    const pendingOrders = db.exec(`SELECT COUNT(*) FROM orders WHERE status='Pending'`)[0].values[0][0];
    stats = [
      { label: 'Total Revenue', value: formatMoney(totalSales), class: 'gold' },
      { label: 'Total Orders', value: totalOrders, class: '' },
      { label: 'Customers', value: totalCustomers, class: '' },
      { label: 'Vehicles Listed', value: totalVehicles, class: '' },
      { label: 'Pending Orders', value: pendingOrders, class: pendingOrders > 0 ? 'red' : 'green' },
    ];
  } else if (role === 'cashier') {
    const myOrders = db.exec(`SELECT COUNT(*) FROM orders WHERE cashier_id=?`, [currentUser.id])[0].values[0][0];
    const myRevenue = db.exec(`SELECT COALESCE(SUM(total),0) FROM orders WHERE cashier_id=? AND status='Completed'`, [currentUser.id])[0].values[0][0];
    const todayOrders = db.exec(`SELECT COUNT(*) FROM orders WHERE cashier_id=? AND date(created_at)=date('now')`, [currentUser.id])[0].values[0][0];
    stats = [
      { label: 'My Total Orders', value: myOrders, class: '' },
      { label: 'My Revenue', value: formatMoney(myRevenue), class: 'gold' },
      { label: "Today's Sales", value: todayOrders, class: '' },
    ];
  } else {
    const myOrders = db.exec(`SELECT COUNT(*) FROM orders WHERE customer_id=?`, [currentUser.id])[0].values[0][0];
    const mySpend = db.exec(`SELECT COALESCE(SUM(total),0) FROM orders WHERE customer_id=? AND status='Completed'`, [currentUser.id])[0].values[0][0];
    stats = [
      { label: 'My Orders', value: myOrders, class: '' },
      { label: 'Total Spent', value: formatMoney(mySpend), class: 'gold' },
    ];
    document.getElementById('overview-desc').textContent = `Welcome, ${currentUser.fname}! Browse and configure your perfect vehicle.`;
  }
  document.getElementById('stats-grid').innerHTML = stats.map(s => `
    <div class="stat-card">
      <div class="stat-label">${s.label}</div>
      <div class="stat-value ${s.class}">${s.value}</div>
    </div>`).join('');

  // Recent orders
  let ordersQuery;
  if (role === 'customer') {
    ordersQuery = db.exec(`SELECT o.order_num, u.fname||' '||u.lname, o.vehicle_name, o.total, o.status, o.created_at FROM orders o LEFT JOIN users u ON o.customer_id=u.id WHERE o.customer_id=? ORDER BY o.id DESC LIMIT 5`, [currentUser.id]);
  } else if (role === 'cashier') {
    ordersQuery = db.exec(`SELECT o.order_num, u.fname||' '||u.lname, o.vehicle_name, o.total, o.status, o.created_at FROM orders o LEFT JOIN users u ON o.customer_id=u.id WHERE o.cashier_id=? ORDER BY o.id DESC LIMIT 5`, [currentUser.id]);
  } else {
    ordersQuery = db.exec(`SELECT o.order_num, u.fname||' '||u.lname, o.vehicle_name, o.total, o.status, o.created_at FROM orders o LEFT JOIN users u ON o.customer_id=u.id ORDER BY o.id DESC LIMIT 5`);
  }
  const rows = ordersQuery.length ? ordersQuery[0].values : [];
  document.getElementById('recent-orders').innerHTML = rows.length ? rows.map(r => `
    <tr>
      <td><strong>${r[0]}</strong></td>
      <td>${r[1] || 'Walk-in'}</td>
      <td>${r[2]}</td>
      <td style="color:var(--accent);font-weight:600;">${formatMoney(r[3])}</td>
      <td>${statusBadge(r[4])}</td>
      <td class="text-muted">${r[5]?.split('T')[0] || r[5] || 'N/A'}</td>
    </tr>`).join('') : `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:30px;">No orders yet.</td></tr>`;
}

// ════════════════════════════════════════════════
//  STORE / BROWSE
// ════════════════════════════════════════════════
function renderStoreCars(type = 'all') {
  const res = db.exec(`SELECT * FROM vehicles WHERE status='active' ORDER BY id`);
  const cars = res.length ? res[0].values.map(r => rowToObj(res[0].columns, r)) : [];
  const filtered = type === 'all' ? cars : cars.filter(c => c.type === type);
  document.getElementById('cars-grid').innerHTML = filtered.map(car => carCard(car, false)).join('') || '<p style="color:var(--muted);">No vehicles found.</p>';
}

function carCard(car, isDash) {
  const fn = isDash ? `openCustomize(${car.id})` : `onStoreCarClick(${car.id})`;
  const stockClass = car.stock > 5 ? '' : car.stock > 0 ? ' low' : ' out';
  const stockText = car.stock > 0 ? `${car.stock} available` : 'Out of stock';
  return `
  <div class="car-card" onclick="${fn}">
    <div class="car-img">
      <div class="car-img-bg">${car.emoji}</div>
      <span style="font-size:64px;position:relative;">${car.emoji}</span>
      <div class="car-badge">${car.type}</div>
    </div>
    <div class="car-info">
      <div class="car-name">${car.model}</div>
      <div class="car-type">${car.engine} · ${car.transmission}</div>
      <div class="car-price">${formatMoney(car.price)}</div>
      <div class="car-specs">
        <div class="spec"><strong>${car.engine}</strong>Engine</div>
        <div class="spec"><strong>${car.transmission}</strong>Trans.</div>
      </div>
      <div class="car-stock${stockClass}">${stockText}</div>
      <div style="margin-top:12px;">
        <button class="btn btn-gold btn-sm btn-full" onclick="event.stopPropagation();${fn}">Configure & ${isDash ? 'Order' : 'Buy'}</button>
      </div>
    </div>
  </div>`;
}

function onStoreCarClick(id) {
  if (!currentUser) {
    toast('Please sign in to configure and purchase a vehicle.', 'info');
    setTimeout(() => showPage('login'), 1200);
    return;
  }
  if (currentUser.role === 'customer') {
    showPage('dashboard');
    buildDashboard();
    showDashPanel('browse');
    setTimeout(() => openCustomize(id), 300);
  } else {
    showPage('dashboard');
    buildDashboard();
  }
}

function filterCars(type, el) {
  document.querySelectorAll('#store-filters .filter-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderStoreCars(type);
}

function renderBrowseGrid(type = 'all') {
  const res = db.exec(`SELECT * FROM vehicles WHERE status='active' ORDER BY id`);
  const cars = res.length ? res[0].values.map(r => rowToObj(res[0].columns, r)) : [];
  const filtered = type === 'all' ? cars : cars.filter(c => c.type === type);
  document.getElementById('browse-grid').innerHTML = filtered.map(car => carCard(car, true)).join('') || '<p style="color:var(--muted);">No vehicles found.</p>';
}

function filterBrowse(type, el) {
  document.querySelectorAll('#browse-filters .filter-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderBrowseGrid(type);
}

// ════════════════════════════════════════════════
//  CUSTOMIZE MODAL
// ════════════════════════════════════════════════
function openCustomize(id) {
  const res = db.exec(`SELECT * FROM vehicles WHERE id=?`, [id]);
  if (!res.length) return;
  const car = rowToObj(res[0].columns, res[0].values[0]);
  if (car.stock < 1) { toast('This vehicle is out of stock.', 'error'); return; }
  currentCarId = id;
  custColor = COLORS[0]; custWheel = WHEELS[0]; custInterior = INTERIORS[0]; custAddons = [];

  document.getElementById('cust-title').textContent = `Configure — ${car.model}`;
  document.getElementById('cust-emoji').textContent = car.emoji;
  document.getElementById('cust-model').textContent = car.model;
  document.getElementById('cust-base').textContent = formatMoney(car.price);

  // Colors
  document.getElementById('color-options').innerHTML = COLORS.map((c, i) => `
    <div class="customize-option ${i === 0 ? 'selected' : ''}" onclick="selectColor(${i},this)">
      <div class="color-swatch" style="background:${c.hex};border:2px solid #555;"></div>
      <div style="font-size:11px;">${c.name}</div>
      <div style="font-size:10px;color:var(--muted);">${c.price ? '+'+formatMoney(c.price) : 'Included'}</div>
    </div>`).join('');

  // Wheels
  document.getElementById('wheel-options').innerHTML = WHEELS.map((w, i) => `
    <div class="customize-option ${i === 0 ? 'selected' : ''}" style="text-align:left;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;" onclick="selectWheel(${i},this)">
      <span>🔧 ${w.name}</span>
      <span style="color:var(--muted);font-size:11px;">${w.price ? '+'+formatMoney(w.price) : 'Standard'}</span>
    </div>`).join('');

  // Interior
  document.getElementById('interior-options').innerHTML = INTERIORS.map((n, i) => `
    <div class="customize-option ${i === 0 ? 'selected' : ''}" style="text-align:left;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;" onclick="selectInterior(${i},this)">
      <span>🪑 ${n.name}</span>
      <span style="color:var(--muted);font-size:11px;">${n.price ? '+'+formatMoney(n.price) : 'Standard'}</span>
    </div>`).join('');

  // Addons
  document.getElementById('addon-options').innerHTML = ADDONS.map(a => `
    <label style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--panel);border-radius:var(--radius);cursor:pointer;">
      <input type="checkbox" value="${a.id}" onchange="toggleAddon('${a.id}',this.checked)" style="accent-color:var(--accent);">
      <span style="flex:1;font-size:13px;">${a.name}</span>
      <span style="color:var(--muted);font-size:12px;">+${formatMoney(a.price)}</span>
    </label>`).join('');

  updateCustTotal(car.price);
  openModal('customize-modal');
}

function selectColor(i, el) {
  custColor = COLORS[i];
  document.querySelectorAll('#color-options .customize-option').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  refreshCustTotal();
}
function selectWheel(i, el) {
  custWheel = WHEELS[i];
  document.querySelectorAll('#wheel-options .customize-option').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  refreshCustTotal();
}
function selectInterior(i, el) {
  custInterior = INTERIORS[i];
  document.querySelectorAll('#interior-options .customize-option').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  refreshCustTotal();
}
function toggleAddon(id, checked) {
  if (checked) custAddons.push(ADDONS.find(a => a.id === id));
  else custAddons = custAddons.filter(a => a.id !== id);
  refreshCustTotal();
}
function refreshCustTotal() {
  const res = db.exec(`SELECT price FROM vehicles WHERE id=?`, [currentCarId]);
  if (res.length) updateCustTotal(res[0].values[0][0]);
}
function updateCustTotal(basePrice) {
  let extras = 0;
  let extrasHTML = '';
  if (custColor.price) { extras += custColor.price; extrasHTML += `<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;"><span style="color:var(--muted);">${custColor.name}</span><span>+${formatMoney(custColor.price)}</span></div>`; }
  if (custWheel.price) { extras += custWheel.price; extrasHTML += `<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;"><span style="color:var(--muted);">${custWheel.name}</span><span>+${formatMoney(custWheel.price)}</span></div>`; }
  if (custInterior.price) { extras += custInterior.price; extrasHTML += `<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;"><span style="color:var(--muted);">${custInterior.name}</span><span>+${formatMoney(custInterior.price)}</span></div>`; }
  custAddons.forEach(a => { extras += a.price; extrasHTML += `<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;"><span style="color:var(--muted);">${a.name}</span><span>+${formatMoney(a.price)}</span></div>`; });
  document.getElementById('cust-extras-list').innerHTML = extrasHTML || '<div style="font-size:12px;color:var(--muted);">No extras selected</div>';
  document.getElementById('cust-total').textContent = formatMoney(basePrice + extras);
}

function placeCustomerOrder() {
  if (!currentUser) { toast('Please sign in.', 'error'); return; }
  const res = db.exec(`SELECT * FROM vehicles WHERE id=?`, [currentCarId]);
  if (!res.length) return;
  const car = rowToObj(res[0].columns, res[0].values[0]);
  if (car.stock < 1) { toast('Out of stock!', 'error'); return; }

  let extras = custColor.price + custWheel.price + custInterior.price;
  custAddons.forEach(a => extras += a.price);
  const subtotal = car.price + extras;
  const tax = Math.round(subtotal * settings.tax / 100);
  const total = subtotal + tax;

  const custParts = [];
  custParts.push(`Color: ${custColor.name}`);
  if (custWheel.price) custParts.push(`Wheels: ${custWheel.name}`);
  if (custInterior.price) custParts.push(`Interior: ${custInterior.name}`);
  custAddons.forEach(a => custParts.push(a.name));
  const custStr = custParts.join('; ');

  const payment = document.getElementById('cust-payment').value;
  const orderNum = genOrderNum();

  db.run(`INSERT INTO orders (order_num,customer_id,vehicle_id,vehicle_name,customization,subtotal,tax,discount,total,payment_method,status) VALUES (?,?,?,?,?,?,?,0,?,?,'Pending')`,
    [orderNum, currentUser.id, car.id, car.model, custStr, subtotal, tax, total, payment]);
  lastOrderId = db.exec(`SELECT last_insert_rowid()`)[0].values[0][0];
  db.run(`UPDATE vehicles SET stock=stock-1 WHERE id=?`, [car.id]);
  addLog(`Placed order ${orderNum} for ${car.model}`);
  closeModal('customize-modal');
  toast(`Order ${orderNum} placed! Total: ${formatMoney(total)}`, 'success');
  renderMyOrders();
}

// ════════════════════════════════════════════════
//  POS TERMINAL
// ════════════════════════════════════════════════
function renderPOSProducts() {
  const q = document.getElementById('pos-search').value.toLowerCase();
  const res = db.exec(`SELECT * FROM vehicles WHERE status='active' AND stock>0 ORDER BY id`);
  const cars = res.length ? res[0].values.map(r => rowToObj(res[0].columns, r)).filter(c => !q || c.model.toLowerCase().includes(q)) : [];
  document.getElementById('pos-products-grid').innerHTML = cars.map(car => `
    <div class="car-card" onclick="addToCart(${car.id})">
      <div class="car-img">
        <div class="car-img-bg">${car.emoji}</div>
        <span style="font-size:64px;position:relative;">${car.emoji}</span>
        <div class="car-badge">${car.type}</div>
      </div>
      <div class="car-info">
        <div class="car-name">${car.model}</div>
        <div class="car-type">${car.type}</div>
        <div class="car-price">${formatMoney(car.price)}</div>
        <div class="car-stock">Stock: ${car.stock}</div>
        <div style="margin-top:10px;"><button class="btn btn-gold btn-sm btn-full">+ Add to Sale</button></div>
      </div>
    </div>`).join('') || '<p style="color:var(--muted);">No available vehicles.</p>';
}

function loadPOSCustomers() {
  const res = db.exec(`SELECT id, fname||' '||lname as name FROM users WHERE role='customer' AND status='active' ORDER BY fname`);
  const sel = document.getElementById('pos-customer-select');
  sel.innerHTML = '<option value="">Walk-in Customer</option>';
  if (res.length) res[0].values.forEach(r => { const o = document.createElement('option'); o.value = r[0]; o.textContent = r[1]; sel.appendChild(o); });
}

function addToCart(vehicleId) {
  const existing = cart.find(i => i.id === vehicleId);
  if (existing) { toast('Vehicle already in sale. Each vehicle is sold individually.', 'info'); return; }
  const res = db.exec(`SELECT * FROM vehicles WHERE id=?`, [vehicleId]);
  if (!res.length) return;
  const car = rowToObj(res[0].columns, res[0].values[0]);
  cart.push({ id: car.id, name: car.model, price: car.price, emoji: car.emoji });
  renderCart();
  toast(`${car.model} added to sale`, 'success');
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  renderCart();
}

function renderCart() {
  const el = document.getElementById('cart-items');
  const totEl = document.getElementById('cart-totals');
  if (!cart.length) { el.innerHTML = '<div class="cart-empty">No items added</div>'; totEl.style.display = 'none'; return; }
  el.innerHTML = cart.map(i => `
    <div class="cart-item">
      <div>
        <div class="cart-item-name">${i.emoji} ${i.name}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <div class="cart-item-price">${formatMoney(i.price)}</div>
        <button onclick="removeFromCart(${i.id})" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:16px;">✕</button>
      </div>
    </div>`).join('');
  totEl.style.display = 'block';
  updateCartTotals();
}

function updateCartTotals() {
  const sub = cart.reduce((s, i) => s + i.price, 0);
  const discPct = Math.min(parseFloat(document.getElementById('discount-input')?.value || 0), currentUser?.role === 'cashier' ? settings.maxDiscount : 100);
  const disc = Math.round(sub * discPct / 100);
  const taxable = sub - disc;
  const tax = Math.round(taxable * settings.tax / 100);
  const total = taxable + tax;
  document.getElementById('cart-sub').textContent = formatMoney(sub);
  document.getElementById('cart-tax').textContent = formatMoney(tax);
  document.getElementById('cart-disc').textContent = '-' + formatMoney(disc);
  document.getElementById('cart-total').textContent = formatMoney(total);
}

function clearCart() { cart = []; renderCart(); }

function processCheckout() {
  if (!cart.length) { toast('Cart is empty.', 'error'); return; }
  const customerId = document.getElementById('pos-customer-select').value;
  const payment = document.getElementById('payment-method').value;
  const discPct = Math.min(parseFloat(document.getElementById('discount-input')?.value || 0), currentUser?.role === 'cashier' ? settings.maxDiscount : 100);
  
  const sub = cart.reduce((s, i) => s + i.price, 0);
  const disc = Math.round(sub * discPct / 100);
  const taxable = sub - disc;
  const tax = Math.round(taxable * settings.tax / 100);
  const total = taxable + tax;
  const orderNum = genOrderNum();
  const vehicleNames = cart.map(i => i.name).join(', ');
  const vehicleId = cart[0].id;

  db.run(`INSERT INTO orders (order_num,customer_id,cashier_id,vehicle_id,vehicle_name,customization,subtotal,tax,discount,total,payment_method,status) VALUES (?,?,?,?,?,'POS Sale',?,?,?,?,'Completed')`,
    [orderNum, customerId || null, currentUser.id, vehicleId, vehicleNames, sub, tax, disc, total]);
  lastOrderId = db.exec(`SELECT last_insert_rowid()`)[0].values[0][0];
  
  cart.forEach(item => db.run(`UPDATE vehicles SET stock=stock-1 WHERE id=?`, [item.id]));
  addLog(`Processed POS sale ${orderNum}, total: ${formatMoney(total)}`);

  const cRes = customerId ? db.exec(`SELECT fname||' '||lname FROM users WHERE id=?`, [customerId]) : null;
  const custName = cRes?.length ? cRes[0].values[0][0] : 'Walk-in Customer';
  showReceipt({ orderNum, custName, items: [...cart], sub, tax, disc, total, payment, date: new Date().toLocaleString() });
  clearCart();
  renderPOSProducts();
}

function showReceipt(d) {
  const sep = '─'.repeat(38);
  const r = `
  ┌──────────────────────────────────────┐
  │         SWAIN INC. AUTOMOTIVE        │
  │       Official Sales Receipt         │
  └──────────────────────────────────────┘
  Order #: ${d.orderNum}
  Date: ${d.date}
  Customer: ${d.custName}
  Cashier: ${currentUser.fname} ${currentUser.lname}
  ${sep}
  ITEMS PURCHASED:
  ${d.items.map(i => `  ${i.emoji} ${i.name}\n     ${formatMoney(i.price)}`).join('\n')}
  ${sep}
  Subtotal:   ${formatMoney(d.sub).padStart(20)}
  Discount:  -${formatMoney(d.disc).padStart(19)}
  VAT (${settings.tax}%): ${formatMoney(d.tax).padStart(20)}
  ${sep}
  TOTAL:      ${formatMoney(d.total).padStart(20)}
  Payment:   ${d.payment.padStart(21)}
  ${sep}
  Thank you for choosing SWAIN Inc.!
  Drive Safe. Drive in Style.
  `;
  document.getElementById('receipt-content').textContent = r;
  openModal('receipt-modal');
}

function printReceipt() { if (lastOrderId) printInvoice(lastOrderId); else window.print(); }

function printInvoice(orderId) {
  const res = db.exec(`
    SELECT o.*, 
           u.fname||' '||u.lname AS cname, u.email AS cemail, u.phone AS cphone,
           ca.fname||' '||ca.lname AS cashier_name
    FROM orders o
    LEFT JOIN users u  ON o.customer_id = u.id
    LEFT JOIN users ca ON o.cashier_id  = ca.id
    WHERE o.id = ?`, [orderId]);
  if (!res.length || !res[0].values.length) { toast('Order not found.', 'error'); return; }
  const o = rowToObj(res[0].columns, res[0].values[0]);

  const date = (o.created_at || '').split('T')[0] || new Date().toLocaleDateString('en-PH');
  const statusClass = o.status || 'Pending';
  const customLines = (o.customization && o.customization !== 'POS Sale')
    ? o.customization.split(';').map(s => s.trim()).filter(Boolean)
    : [];

  document.getElementById('print-area').innerHTML = `
    <div class="inv-header">
      <div>
        <div class="inv-logo">SWAIN</div>
        <div class="inv-sub">Inc. Automotive</div>
        <div style="font-size:11px;color:#888;margin-top:4px;">123 Ayala Avenue, Makati City<br>+63 2 8888 0000 · sales@swain.ph</div>
      </div>
      <div class="inv-meta">
        <div class="inv-num">${o.order_num}</div>
        <div class="inv-date">Date: ${date}</div>
        <div style="margin-top:6px;"><span class="inv-status ${statusClass}">${statusClass}</span></div>
      </div>
    </div>
    <hr class="inv-divider-thick">
    <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#888;margin-bottom:12px;">OFFICIAL SALES INVOICE</div>
    <div class="inv-parties">
      <div>
        <div class="inv-party-label">Bill To</div>
        <div class="inv-party-name">${o.cname || 'Walk-in Customer'}</div>
        <div class="inv-party-detail">
          ${o.cemail ? o.cemail + '<br>' : ''}
          ${o.cphone ? o.cphone : ''}
        </div>
      </div>
      <div>
        <div class="inv-party-label">Processed By</div>
        <div class="inv-party-name">${o.cashier_name || 'Online / Self-service'}</div>
        <div class="inv-party-detail">Payment: ${o.payment_method || '—'}</div>
      </div>
    </div>
    <hr class="inv-divider">
    <table class="inv-table">
      <thead>
        <tr>
          <th style="width:50%;">Description</th>
          <th>Details</th>
          <th class="right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${o.vehicle_name}</strong>${customLines.length ? '<br><span style="font-size:11px;color:#666;">' + customLines.join(' · ') + '</span>' : ''}</td>
          <td style="font-size:11px;color:#666;">Vehicle</td>
          <td class="right">${formatMoney(o.subtotal)}</td>
        </tr>
        ${o.discount > 0 ? `<tr><td style="color:#555;">Discount Applied</td><td style="font-size:11px;color:#888;"></td><td class="right" style="color:#c0392b;">−${formatMoney(o.discount)}</td></tr>` : ''}
        <tr>
          <td style="color:#555;">VAT (${settings.tax}%)</td>
          <td style="font-size:11px;color:#888;"></td>
          <td class="right">${formatMoney(o.tax)}</td>
        </tr>
      </tbody>
    </table>
    <div class="inv-totals">
      <div class="inv-totals-row"><span>Subtotal</span><span>${formatMoney(o.subtotal)}</span></div>
      ${o.discount > 0 ? `<div class="inv-totals-row" style="color:#c0392b;"><span>Discount</span><span>−${formatMoney(o.discount)}</span></div>` : ''}
      <div class="inv-totals-row"><span>VAT</span><span>${formatMoney(o.tax)}</span></div>
      <div class="inv-totals-row total"><span>TOTAL DUE</span><span>${formatMoney(o.total)}</span></div>
    </div>
    ${o.notes ? `<hr class="inv-divider"><div style="font-size:12px;color:#555;"><strong>Notes:</strong> ${o.notes}</div>` : ''}
    <hr class="inv-divider">
    <div class="inv-footer">
      Thank you for choosing SWAIN Inc. Automotive &mdash; Drive Excellence. Own Distinction.<br>
      This is a computer-generated invoice and is valid without a signature.
    </div>
  `;
  window.print();
}

// ════════════════════════════════════════════════
//  INVENTORY MANAGEMENT
// ════════════════════════════════════════════════
function renderInventoryTable() {
  const res = db.exec(`SELECT * FROM vehicles ORDER BY id`);
  const rows = res.length ? res[0].values.map(r => rowToObj(res[0].columns, r)) : [];
  const canEdit = ['admin', 'manager'].includes(currentUser.role);
  document.getElementById('inventory-table').innerHTML = rows.map(car => `
    <tr>
      <td>#${car.id}</td>
      <td><strong>${car.emoji} ${car.model}</strong></td>
      <td><span class="badge badge-blue">${car.type}</span></td>
      <td style="color:var(--accent);font-weight:600;">${formatMoney(car.price)}</td>
      <td><span class="${car.stock < 3 ? 'text-danger' : 'text-success'}">${car.stock}</span></td>
      <td>${car.status === 'active' ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-gray">Inactive</span>'}</td>
      <td>
        ${canEdit ? `<div class="gap-8">
          <button class="btn btn-ghost btn-sm" onclick="openCarModal(${car.id})">Edit</button>
          <button class="btn btn-red btn-sm" onclick="deleteCar(${car.id})">Delete</button>
        </div>` : 'View Only'}
      </td>
    </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:30px;">No vehicles.</td></tr>';
}

function openCarModal(id) {
  if (!['admin', 'manager'].includes(currentUser.role)) { toast('Access denied.', 'error'); return; }
  document.getElementById('car-id').value = '';
  document.getElementById('car-model').value = '';
  document.getElementById('car-price').value = '';
  document.getElementById('car-stock').value = '';
  document.getElementById('car-engine').value = '';
  document.getElementById('car-desc').value = '';
  document.getElementById('car-emoji').value = '🚗';
  document.getElementById('car-modal-title').textContent = 'Add Vehicle';
  if (id) {
    const res = db.exec(`SELECT * FROM vehicles WHERE id=?`, [id]);
    if (!res.length) return;
    const car = rowToObj(res[0].columns, res[0].values[0]);
    document.getElementById('car-id').value = car.id;
    document.getElementById('car-modal-title').textContent = 'Edit Vehicle';
    document.getElementById('car-model').value = car.model;
    document.getElementById('car-type').value = car.type;
    document.getElementById('car-price').value = car.price;
    document.getElementById('car-stock').value = car.stock;
    document.getElementById('car-engine').value = car.engine;
    document.getElementById('car-trans').value = car.transmission;
    document.getElementById('car-desc').value = car.description;
    document.getElementById('car-emoji').value = car.emoji;
  }
  openModal('car-modal');
}

function saveCar() {
  const id = document.getElementById('car-id').value;
  const model = document.getElementById('car-model').value.trim();
  const type = document.getElementById('car-type').value;
  const price = parseFloat(document.getElementById('car-price').value);
  const stock = parseInt(document.getElementById('car-stock').value);
  const engine = document.getElementById('car-engine').value.trim();
  const trans = document.getElementById('car-trans').value;
  const desc = document.getElementById('car-desc').value.trim();
  const emoji = document.getElementById('car-emoji').value.trim() || '🚗';
  if (!model || isNaN(price) || isNaN(stock)) { toast('Please fill required fields.', 'error'); return; }
  if (id) {
    db.run(`UPDATE vehicles SET model=?,type=?,price=?,stock=?,engine=?,transmission=?,description=?,emoji=? WHERE id=?`, [model, type, price, stock, engine, trans, desc, emoji, id]);
    addLog(`Updated vehicle #${id}: ${model}`);
  } else {
    db.run(`INSERT INTO vehicles (model,type,price,stock,engine,transmission,description,emoji) VALUES (?,?,?,?,?,?,?,?)`, [model, type, price, stock, engine, trans, desc, emoji]);
    addLog(`Added vehicle: ${model}`);
  }
  closeModal('car-modal');
  renderInventoryTable();
  renderStoreCars();
  toast('Vehicle saved!', 'success');
}

function deleteCar(id) {
  if (!confirm('Delete this vehicle?')) return;
  db.run(`UPDATE vehicles SET status='inactive' WHERE id=?`, [id]);
  addLog(`Deleted vehicle #${id}`);
  renderInventoryTable();
  renderStoreCars();
  toast('Vehicle removed.', 'info');
}

// ════════════════════════════════════════════════
//  ORDERS
// ════════════════════════════════════════════════
function renderOrdersTable() {
  const q = document.getElementById('orders-search')?.value.toLowerCase() || '';
  let sql = `SELECT o.id, o.order_num, u.fname||' '||u.lname as cname, o.vehicle_name, o.total, o.payment_method, o.status, o.created_at FROM orders o LEFT JOIN users u ON o.customer_id=u.id`;
  if (currentUser.role === 'cashier') sql += ` WHERE o.cashier_id=${currentUser.id}`;
  sql += ` ORDER BY o.id DESC`;
  const res = db.exec(sql);
  const rows = res.length ? res[0].values : [];
  const filtered = q ? rows.filter(r => JSON.stringify(r).toLowerCase().includes(q)) : rows;
  const canUpdate = ['admin', 'manager', 'cashier'].includes(currentUser.role);
  document.getElementById('orders-table').innerHTML = filtered.map(r => `
    <tr>
      <td><strong>${r[1]}</strong></td>
      <td>${r[2] || 'Walk-in'}</td>
      <td>${r[3]}</td>
      <td style="color:var(--accent);font-weight:600;">${formatMoney(r[4])}</td>
      <td>${r[5]}</td>
      <td>${statusBadge(r[6])}</td>
      <td class="text-muted">${(r[7] || '').split('T')[0] || r[7]}</td>
      <td>
        ${canUpdate ? `<button class="btn btn-ghost btn-sm" onclick="openOrderStatus(${r[0]}, '${r[1]}', '${r[6]}')">Status</button>` : ''}
        <button class="btn btn-ghost btn-sm" onclick="printInvoice(${r[0]})">🖨 Invoice</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:30px;">No orders found.</td></tr>';
}

function openOrderStatus(id, num, status) {
  document.getElementById('status-order-id').value = id;
  document.getElementById('status-order-num').textContent = num;
  document.getElementById('status-select').value = status;
  openModal('order-status-modal');
}

function updateOrderStatus() {
  const id = document.getElementById('status-order-id').value;
  const status = document.getElementById('status-select').value;
  db.run(`UPDATE orders SET status=? WHERE id=?`, [status, id]);
  addLog(`Updated order #${id} status to ${status}`);
  closeModal('order-status-modal');
  renderOrdersTable();
  renderOverview();
  toast('Order status updated.', 'success');
}

function renderMyOrders() {
  const res = db.exec(`SELECT o.order_num, o.vehicle_name, o.customization, o.total, o.payment_method, o.status, o.created_at FROM orders o WHERE o.customer_id=? ORDER BY o.id DESC`, [currentUser.id]);
  const rows = res.length ? res[0].values : [];
  document.getElementById('my-orders-table').innerHTML = rows.map(r => `
    <tr>
      <td><strong>${r[0]}</strong></td>
      <td>${r[1]}</td>
      <td style="font-size:11px;color:var(--muted);max-width:180px;">${r[2] || '—'}</td>
      <td style="color:var(--accent);font-weight:600;">${formatMoney(r[3])}</td>
      <td>${r[4]}</td>
      <td>${statusBadge(r[5])}</td>
      <td class="text-muted">${(r[6] || '').split('T')[0] || r[6]}</td>
    </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:30px;">No orders yet. Browse our inventory to make your first purchase!</td></tr>';
}

// ════════════════════════════════════════════════
//  USERS (ADMIN ONLY)
// ════════════════════════════════════════════════
function renderUsersTable() {
  if (currentUser.role !== 'admin') { toast('Admin access required.', 'error'); return; }
  const res = db.exec(`SELECT * FROM users ORDER BY id`);
  const rows = res.length ? res[0].values.map(r => rowToObj(res[0].columns, r)) : [];
  document.getElementById('users-table').innerHTML = rows.map(u => `
    <tr>
      <td>#${u.id}</td>
      <td><strong>${u.fname} ${u.lname}</strong></td>
      <td>${u.username}</td>
      <td>${u.email}</td>
      <td>${roleBadge(u.role)}</td>
      <td>${u.status === 'active' ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-gray">Inactive</span>'}</td>
      <td>
        <div class="gap-8">
          <button class="btn btn-ghost btn-sm" onclick="openUserModal(${u.id})">Edit</button>
          ${u.id !== currentUser.id ? `<button class="btn btn-red btn-sm" onclick="deleteUser(${u.id})">Delete</button>` : ''}
        </div>
      </td>
    </tr>`).join('');
}

function openUserModal(id) {
  ['user-id','user-fname','user-lname','user-uname','user-email','user-phone','user-pass'].forEach(f => document.getElementById(f).value = '');
  document.getElementById('user-role').value = 'customer';
  document.getElementById('user-status').value = 'active';
  document.getElementById('user-modal-title').textContent = 'Add User';
  if (id) {
    const res = db.exec(`SELECT * FROM users WHERE id=?`, [id]);
    if (!res.length) return;
    const u = rowToObj(res[0].columns, res[0].values[0]);
    document.getElementById('user-id').value = u.id;
    document.getElementById('user-modal-title').textContent = 'Edit User';
    document.getElementById('user-fname').value = u.fname;
    document.getElementById('user-lname').value = u.lname;
    document.getElementById('user-uname').value = u.username;
    document.getElementById('user-email').value = u.email;
    document.getElementById('user-phone').value = u.phone || '';
    document.getElementById('user-role').value = u.role;
    document.getElementById('user-status').value = u.status;
  }
  openModal('user-modal');
}

function saveUser() {
  const id = document.getElementById('user-id').value;
  const fname = document.getElementById('user-fname').value.trim();
  const lname = document.getElementById('user-lname').value.trim();
  const uname = document.getElementById('user-uname').value.trim();
  const email = document.getElementById('user-email').value.trim();
  const phone = document.getElementById('user-phone').value.trim();
  const role = document.getElementById('user-role').value;
  const status = document.getElementById('user-status').value;
  const pass = document.getElementById('user-pass').value;
  if (!fname || !lname || !uname || !email) { toast('Fill all required fields.', 'error'); return; }
  try {
    if (id) {
      if (pass) db.run(`UPDATE users SET fname=?,lname=?,username=?,email=?,phone=?,role=?,status=?,password=? WHERE id=?`, [fname, lname, uname, email, phone, role, status, pass, id]);
      else db.run(`UPDATE users SET fname=?,lname=?,username=?,email=?,phone=?,role=?,status=? WHERE id=?`, [fname, lname, uname, email, phone, role, status, id]);
      addLog(`Updated user #${id}: ${uname}`);
    } else {
      if (!pass) { toast('Password required for new user.', 'error'); return; }
      db.run(`INSERT INTO users (fname,lname,username,email,phone,password,role,status) VALUES (?,?,?,?,?,?,?,?)`, [fname, lname, uname, email, phone, pass, role, status]);
      addLog(`Created user: ${uname} (${role})`);
    }
    closeModal('user-modal');
    renderUsersTable();
    toast('User saved!', 'success');
  } catch(e) { toast('Username or email already exists.', 'error'); }
}

function deleteUser(id) {
  if (!confirm('Delete this user? This cannot be undone.')) return;
  db.run(`DELETE FROM users WHERE id=?`, [id]);
  addLog(`Deleted user #${id}`);
  renderUsersTable();
  toast('User deleted.', 'info');
}

// ════════════════════════════════════════════════
//  REPORTS
// ════════════════════════════════════════════════
function renderReports() {
  const totalRev = db.exec(`SELECT COALESCE(SUM(total),0) FROM orders WHERE status='Completed'`)[0].values[0][0];
  const totalOrders = db.exec(`SELECT COUNT(*) FROM orders WHERE status='Completed'`)[0].values[0][0];
  const avgOrder = totalOrders ? Math.round(totalRev / totalOrders) : 0;
  const bestMonth = db.exec(`SELECT COALESCE(SUM(total),0) FROM orders WHERE status='Completed' AND strftime('%Y-%m',created_at)=strftime('%Y-%m','now')`)[0].values[0][0];
  document.getElementById('report-stats').innerHTML = `
    <div class="stat-card"><div class="stat-label">Total Revenue</div><div class="stat-value gold">${formatMoney(totalRev)}</div></div>
    <div class="stat-card"><div class="stat-label">Completed Orders</div><div class="stat-value">${totalOrders}</div></div>
    <div class="stat-card"><div class="stat-label">Avg. Order Value</div><div class="stat-value">${formatMoney(avgOrder)}</div></div>
    <div class="stat-card"><div class="stat-label">This Month</div><div class="stat-value green">${formatMoney(bestMonth)}</div></div>
  `;

  const byType = db.exec(`SELECT v.type, COUNT(*) as units, SUM(o.total) as rev, AVG(o.total) as avg FROM orders o JOIN vehicles v ON o.vehicle_id=v.id WHERE o.status='Completed' GROUP BY v.type ORDER BY rev DESC`);
  document.getElementById('report-type-table').innerHTML = byType.length ? byType[0].values.map(r => `
    <tr>
      <td><span class="badge badge-blue">${r[0]}</span></td>
      <td>${r[1]}</td>
      <td style="color:var(--accent);font-weight:600;">${formatMoney(r[2])}</td>
      <td>${formatMoney(r[3])}</td>
    </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px;">No data</td></tr>';

  const topCars = db.exec(`SELECT o.vehicle_name, COUNT(*) as units, SUM(o.total) as rev FROM orders o WHERE o.status='Completed' GROUP BY o.vehicle_name ORDER BY units DESC LIMIT 5`);
  document.getElementById('report-top-table').innerHTML = topCars.length ? topCars[0].values.map(r => `
    <tr><td><strong>${r[0]}</strong></td><td>${r[1]}</td><td style="color:var(--accent);font-weight:600;">${formatMoney(r[2])}</td></tr>`).join('') : '<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:20px;">No data</td></tr>';
}

// ════════════════════════════════════════════════
//  PROFILE
// ════════════════════════════════════════════════
function loadProfile() {
  document.getElementById('prof-fname').value = currentUser.fname;
  document.getElementById('prof-lname').value = currentUser.lname;
  document.getElementById('prof-email').value = currentUser.email;
  document.getElementById('prof-phone').value = currentUser.phone || '';
}

function saveProfile() {
  const fname = document.getElementById('prof-fname').value.trim();
  const lname = document.getElementById('prof-lname').value.trim();
  const email = document.getElementById('prof-email').value.trim();
  const phone = document.getElementById('prof-phone').value.trim();
  const pass = document.getElementById('prof-pass').value;
  if (!fname || !lname || !email) { toast('Fill all required fields.', 'error'); return; }
  if (pass) {
    db.run(`UPDATE users SET fname=?,lname=?,email=?,phone=?,password=? WHERE id=?`, [fname, lname, email, phone, pass, currentUser.id]);
  } else {
    db.run(`UPDATE users SET fname=?,lname=?,email=?,phone=? WHERE id=?`, [fname, lname, email, phone, currentUser.id]);
  }
  currentUser.fname = fname; currentUser.lname = lname; currentUser.email = email; currentUser.phone = phone;
  updateNavForUser();
  addLog('Updated profile');
  toast('Profile saved!', 'success');
}

// ════════════════════════════════════════════════
//  SETTINGS & LOGS
// ════════════════════════════════════════════════
function saveSettings() {
  settings.company = document.getElementById('set-company').value;
  settings.tax = parseFloat(document.getElementById('set-tax').value) || 12;
  settings.maxDiscount = parseFloat(document.getElementById('set-maxdisc').value) || 10;
  settings.currency = document.getElementById('set-currency').value || '₱';
  addLog(`Updated system settings`);
  saveDB();
  toast('Settings saved!', 'success');
}

function renderLogs() {
  const res = db.exec(`SELECT created_at, username, action FROM logs ORDER BY id DESC LIMIT 50`);
  const rows = res.length ? res[0].values : [];
  document.getElementById('log-table').innerHTML = rows.map(r => `
    <tr>
      <td style="font-size:11px;color:var(--muted);">${(r[0]||'').split('T')[0]}</td>
      <td><strong>${r[1]}</strong></td>
      <td>${r[2]}</td>
    </tr>`).join('') || '<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:20px;">No logs.</td></tr>';
}

// ════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════
function rowToObj(cols, row) {
  const obj = {};
  cols.forEach((c, i) => obj[c] = row[i]);
  return obj;
}

function formatMoney(n) {
  return settings.currency + Math.round(n).toLocaleString('en-PH');
}

function genOrderNum() {
  const res = db.exec(`SELECT COUNT(*) FROM orders`)[0].values[0][0];
  return 'ORD-' + String(res + 1).padStart(4, '0');
}

function addLog(action) {
  if (!currentUser) return;
  db.run(`INSERT INTO logs (user_id,username,action) VALUES (?,?,?)`, [currentUser.id, currentUser.username, action]);
  saveDB();
}

function statusBadge(s) {
  const map = { Pending:'badge-warning', Processing:'badge-blue', Completed:'badge-green', Cancelled:'badge-red' };
  return `<span class="badge ${map[s]||'badge-gray'}">${s}</span>`;
}

function roleBadge(r) {
  const map = { admin:'badge-red', manager:'badge-gold', cashier:'badge-blue', customer:'badge-gray' };
  return `<span class="badge ${map[r]||'badge-gray'}">${r}</span>`;
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('open');
  });
});

let toastTimer;
function toast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

// Enter key on login
document.getElementById('login-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
document.getElementById('login-user').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

// Start!
init();