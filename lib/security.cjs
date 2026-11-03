const { randomBytes, scryptSync, timingSafeEqual } = require('node:crypto');
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
}
function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || typeof encoded !== 'string' || password.length > 256) return false;
  if (!encoded.startsWith('scrypt$')) {
    const a = Buffer.from(password), b = Buffer.from(encoded);
    return a.length === b.length && timingSafeEqual(a, b);
  }
  const [, salt, digest] = encoded.split('$');
  if (!/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(digest || '')) return false;
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(digest, 'hex'));
}
function resolveBranch(actor, selected, branches, requireOne = true) {
  if (!actor?.is_active) throw new Error('Akun tidak aktif. Silakan masuk kembali.');
  if (actor.role !== 'super_admin') {
    if (actor.role !== 'karyawan' || !actor.branch_id || !branches.some(b => b.id === actor.branch_id && b.is_active)) throw new Error('Akses cabang ditolak.');
    return actor.branch_id;
  }
  if (selected === 'all' && !requireOne) return null;
  const branch = branches.find(b => b.id === selected && b.is_active);
  if (branch) return branch.id;
  if (!selected || selected === 'all') {
    const first = branches.find(b => b.is_active);
    if (first) return first.id;
  }
  throw new Error('Pilih cabang aktif terlebih dahulu.');
}
const isAdmin = actor => actor?.role === 'super_admin' && actor?.is_active === true;
function requireAdmin(actor) { if (!isAdmin(actor)) throw new Error('Hanya admin utama yang memiliki akses.'); }
function validateCart(cart) {
  if (!Array.isArray(cart) || !cart.length || cart.length > 200) throw new Error('Keranjang tidak valid.');
  return cart.map(item => {
    if (!/^[a-f0-9-]{36}$/i.test(item.id || '') || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999999) throw new Error('Jumlah atau produk tidak valid.');
    return { id: item.id, quantity: item.quantity };
  });
}
module.exports = { hashPassword, verifyPassword, resolveBranch, isAdmin, requireAdmin, validateCart };
