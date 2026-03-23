import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const DIST_PATH = path.join(ROOT, 'dist');
const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const ADMIN_EMAIL = 'yousefch1978@gmail.com';
const ADMIN_PASSWORD = 'Apple@2020';

function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'hash_' + Math.abs(hash).toString(16);
}

function readDb() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}
function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}
function sanitizeUser(user) {
  const { password, ...rest } = user;
  return rest;
}
function getSessionToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return req.headers['x-session-token'];
}
function requireAuth(req, res, next) {
  const token = getSessionToken(req);
  const db = readDb();
  const userId = db.sessions[token];
  const user = db.users.find((u) => u.id === userId);
  if (!token || !user) return res.status(401).json({ error: 'Unauthorized' });
  req.db = db;
  req.user = user;
  req.token = token;
  next();
}
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin' && req.user?.email !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}
function now() { return new Date().toISOString(); }

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: sanitizeUser(req.user) }));
app.post('/api/auth/register', (req, res) => {
  const { email, password, username } = req.body || {};
  const normalizedEmail = (email || '').toLowerCase().trim();
  if (!normalizedEmail || !password || !username) return res.status(400).json({ error: 'Missing fields' });
  const db = readDb();
  if (normalizedEmail === ADMIN_EMAIL) return res.status(400).json({ error: 'This email is reserved' });
  if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) return res.status(400).json({ error: 'Email already registered' });
  if (db.users.some((u) => u.username.toLowerCase() === String(username).toLowerCase())) return res.status(400).json({ error: 'Username already taken' });
  const newUser = { id: `user-${Date.now()}`, email: normalizedEmail, username, password: hashPassword(password), role: 'user', balance: 0, createdAt: now() };
  db.users.push(newUser);
  const token = uuidv4();
  db.sessions[token] = newUser.id;
  writeDb(db);
  res.json({ user: sanitizeUser(newUser), token });
});
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = (email || '').toLowerCase().trim();
  const db = readDb();
  const user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!user || user.password !== hashPassword(password)) return res.status(400).json({ error: 'Invalid email or password' });
  const token = uuidv4();
  db.sessions[token] = user.id;
  writeDb(db);
  res.json({ user: sanitizeUser(user), token });
});
app.post('/api/auth/logout', requireAuth, (req, res) => {
  delete req.db.sessions[req.token];
  writeDb(req.db);
  res.json({ success: true });
});

app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
  res.json({ users: req.db.users.map(sanitizeUser) });
});
app.post('/api/admin/users/:id/balance', requireAuth, requireAdmin, (req, res) => {
  const amount = Number(req.body.amount || 0);
  const idx = req.db.users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  req.db.users[idx].balance = Math.max(0, Number(req.db.users[idx].balance || 0) + amount);
  writeDb(req.db);
  res.json({ user: sanitizeUser(req.db.users[idx]) });
});

app.get('/api/transactions', requireAuth, (req, res) => {
  const items = req.user.role === 'admin' ? req.db.transactions : req.db.transactions.filter((t) => t.userId === req.user.id);
  res.json({ transactions: items.sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt)) });
});
app.post('/api/transactions', requireAuth, (req, res) => {
  const { type, amount, cryptoType, txHash } = req.body || {};
  const tx = { id: `tx-${Date.now()}`, userId: req.user.id, username: req.user.username, type, amount: Number(amount), cryptoType, txHash, status: 'pending', createdAt: now() };
  req.db.transactions.unshift(tx);
  writeDb(req.db);
  res.json({ transaction: tx });
});
app.post('/api/transactions/:id/approve', requireAuth, requireAdmin, (req, res) => {
  const tx = req.db.transactions.find((t) => t.id === req.params.id);
  if (!tx) return res.status(404).json({ error: 'Not found' });
  tx.status = 'approved';
  if (tx.type === 'deposit') {
    const user = req.db.users.find((u) => u.id === tx.userId);
    if (user) user.balance += Number(tx.amount || 0);
  }
  writeDb(req.db);
  res.json({ transaction: tx });
});
app.post('/api/transactions/:id/reject', requireAuth, requireAdmin, (req, res) => {
  const tx = req.db.transactions.find((t) => t.id === req.params.id);
  if (!tx) return res.status(404).json({ error: 'Not found' });
  tx.status = 'rejected';
  writeDb(req.db);
  res.json({ transaction: tx });
});

app.get('/api/withdrawals', requireAuth, (req, res) => {
  const items = req.user.role === 'admin' ? req.db.withdrawals : req.db.withdrawals.filter((w) => w.userId === req.user.id);
  res.json({ withdrawals: items.sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt)) });
});
app.post('/api/withdrawals', requireAuth, (req, res) => {
  const { amount, cryptoType, walletAddress } = req.body || {};
  const n = Number(amount);
  if (n < 10) return res.status(400).json({ error: 'Minimum withdrawal amount is $10' });
  const user = req.db.users.find((u) => u.id === req.user.id);
  if (!user || user.balance < n) return res.status(400).json({ error: 'Insufficient balance' });
  user.balance -= n;
  const item = { id: `wd-${Date.now()}`, userId: req.user.id, username: req.user.username, email: req.user.email, amount: n, cryptoType, walletAddress, status: 'pending', createdAt: now() };
  req.db.withdrawals.unshift(item);
  writeDb(req.db);
  res.json({ withdrawal: item, user: sanitizeUser(user) });
});
app.post('/api/withdrawals/:id/approve', requireAuth, requireAdmin, (req, res) => {
  const w = req.db.withdrawals.find((x) => x.id === req.params.id);
  if (!w) return res.status(404).json({ error: 'Not found' });
  w.status = 'approved'; w.processedAt = now(); w.processedBy = req.user.id; writeDb(req.db); res.json({ withdrawal: w });
});
app.post('/api/withdrawals/:id/reject', requireAuth, requireAdmin, (req, res) => {
  const w = req.db.withdrawals.find((x) => x.id === req.params.id);
  if (!w) return res.status(404).json({ error: 'Not found' });
  if (w.status === 'pending') {
    const user = req.db.users.find((u) => u.id === w.userId);
    if (user) user.balance += Number(w.amount || 0);
  }
  w.status = 'rejected'; w.processedAt = now(); w.processedBy = req.user.id; writeDb(req.db); res.json({ withdrawal: w });
});

app.get('/api/promocodes', requireAuth, (req, res) => {
  const all = req.user.role === 'admin' ? req.db.promoCodes : req.db.promoCodes.filter((p) => p.usesLeft > 0);
  res.json({ promoCodes: all });
});
app.post('/api/promocodes', requireAuth, requireAdmin, (req, res) => {
  const { code, amount, uses } = req.body || {};
  const promo = { id: `promo-${Date.now()}`, code: String(code).toUpperCase(), amount: Number(amount), usesLeft: Number(uses), totalUses: Number(uses), createdAt: now(), createdBy: req.user.username };
  req.db.promoCodes.unshift(promo); writeDb(req.db); res.json({ promoCode: promo });
});
app.delete('/api/promocodes/:id', requireAuth, requireAdmin, (req, res) => {
  req.db.promoCodes = req.db.promoCodes.filter((p) => p.id !== req.params.id); writeDb(req.db); res.json({ success: true });
});
app.post('/api/promocodes/use', requireAuth, (req, res) => {
  const { code } = req.body || {};
  const promo = req.db.promoCodes.find((p) => p.code === String(code).toUpperCase());
  if (!promo) return res.status(400).json({ error: 'Invalid promo code' });
  if (promo.usesLeft <= 0) return res.status(400).json({ error: 'This code has been fully used' });
  const used = req.db.usedCodes[req.user.id] || [];
  if (used.includes(promo.id)) return res.status(400).json({ error: 'You have already used this code' });
  promo.usesLeft -= 1;
  req.db.usedCodes[req.user.id] = [...used, promo.id];
  const user = req.db.users.find((u) => u.id === req.user.id); if (user) user.balance += promo.amount;
  writeDb(req.db);
  res.json({ success: true, amount: promo.amount, user: sanitizeUser(user) });
});

app.get('/api/chat', requireAuth, (req, res) => {
  const support = req.user.role === 'admin' ? req.db.chat.support : req.db.chat.support.filter((m) => m.userId === req.user.id || m.isAdmin);
  res.json({ messages: req.db.chat.global.slice(-100), supportMessages: support.slice(-200) });
});
app.post('/api/chat/global', requireAuth, (req, res) => {
  const msg = { id: `msg-${Date.now()}`, userId: req.user.id, username: req.user.username, message: String(req.body.message || ''), timestamp: now(), isAdmin: req.user.role === 'admin' };
  req.db.chat.global.push(msg); req.db.chat.global = req.db.chat.global.slice(-100); writeDb(req.db); res.json({ message: msg });
});
app.post('/api/chat/support', requireAuth, (req, res) => {
  const msg = { id: `support-${Date.now()}`, userId: req.body.userId || req.user.id, username: req.user.username, message: String(req.body.message || ''), timestamp: now(), isAdmin: req.user.role === 'admin', isSupport: true };
  req.db.chat.support.push(msg); req.db.chat.support = req.db.chat.support.slice(-200); writeDb(req.db); res.json({ message: msg });
});

app.post('/api/user/balance', requireAuth, (req, res) => {
  const amount = Number(req.body.amount || 0);
  const user = req.db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.balance = Math.max(0, user.balance + amount);
  writeDb(req.db);
  res.json({ user: sanitizeUser(user) });
});

if (fs.existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(DIST_PATH, 'index.html'));
  });
}

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
