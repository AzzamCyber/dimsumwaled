"use server";
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { supabase } from './supabase';
import { getActor, getScope, scoped, unwrap, fetchAll } from './access';
import security from './security.cjs';

const productFields = 'id,branch_id,category_id,name,barcode,price,stock,created_at,is_favorite,image_url,categories!products_category_id_fkey(name)';
const transactionFields = 'id,branch_id,user_id,total_amount,payment_method,status,created_at,transaction_items!transaction_items_transaction_id_fkey(id,product_id,product_name,quantity,price,subtotal,products!transaction_items_product_id_fkey(name))';
function text(value, max = 255) { const s = String(value || '').trim(); if (!s || s.length > max) throw new Error('Data teks tidak valid.'); return s; }
function money(value) { const n = Number(value); if (!Number.isFinite(n) || n < 0 || n > 1e12) throw new Error('Nominal tidak valid.'); return Math.round(n * 100) / 100; }
function date(value) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '') || Number.isNaN(Date.parse(value))) throw new Error('Tanggal tidak valid.'); return value; }
async function list(table, fields = '*', admin = false) {
 const { branchId } = await getScope({ admin });
 return fetchAll(() => scoped(supabase.from(table).select(fields).order('created_at', { ascending: false }).order('id'), branchId));
}
async function insert(table, values, fields = '*', admin = false) {
 const { actor, branchId } = await getScope({ admin });
 if (actor.role !== 'super_admin') {
  const shift = unwrap(await supabase.from('shifts').select('id').eq('user_id',actor.id).eq('branch_id',branchId).eq('status','ACTIVE').limit(1).maybeSingle());
  if (!shift) throw new Error('Mulai shift sebelum mencatat aktivitas.');
 }
 const row = unwrap(await supabase.from(table).insert({ ...values, branch_id: branchId }).select(fields).single());
 revalidatePath('/'); return row;
}
async function remove(table, id, admin = true) {
 const { branchId } = await getScope({ admin });
 const data = unwrap(await supabase.from(table).delete().eq('id', id).eq('branch_id', branchId).select('id'));
 if (!data.length) throw new Error('Data tidak ditemukan di cabang ini.');
 revalidatePath('/'); return true;
}

export async function getBranchContext() {
 const scope = await getScope({ requireOne: false });
 return { actor: scope.actor, branches: scope.branches, selected: scope.selected,
  operationalBranch: scope.branches.find(b => b.id === scope.branchId) || scope.branches.find(b => b.is_active) || null };
}
export async function selectBranch(id) {
 const actor = await getActor(); security.requireAdmin(actor);
 if (id !== 'all') {
  const branch = unwrap(await supabase.from('branches').select('id').eq('id', id).eq('is_active', true).maybeSingle());
  if (!branch) throw new Error('Cabang tidak tersedia.');
 }
 (await cookies()).set('waled_branch', id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30 });
 revalidatePath('/');
}
export async function getCategories() { return list('categories'); }
export async function addCategory(name) { return insert('categories', { name: text(name) }, '*', true); }
export async function deleteCategory(id) { return remove('categories', id); }
export async function getProducts() {
 const { actor, branchId } = await getScope();
 return fetchAll(() => supabase.from('products').select(productFields + (actor.role === 'super_admin' ? ',base_price' : '')).eq('branch_id', branchId).order('name').order('id'));
}
export async function addProduct(product) {
 const stock = Number(product.stock || 0);
 if (!Number.isInteger(stock) || stock < 0) throw new Error('Stok tidak valid.');
 if (product.image_url && !String(product.image_url).startsWith(process.env.NEXT_PUBLIC_SUPABASE_URL + '/storage/v1/object/public/product-images/')) throw new Error('URL gambar tidak valid.');
 return insert('products', { name: text(product.name), category_id: product.category_id || null,
  barcode: product.barcode ? text(product.barcode, 100) : null, price: money(product.price), base_price: money(product.base_price || 0), stock, image_url: product.image_url || null }, productFields + ',base_price', true);
}
export async function deleteProduct(id) { return remove('products', id); }
export async function toggleFavoriteProduct(id, currentStatus) {
 const { branchId } = await getScope();
 return unwrap(await supabase.from('products').update({ is_favorite: !currentStatus }).eq('id', id).eq('branch_id', branchId).select('id,is_favorite').single());
}
export async function updateProductStock(id, newStock, expectedStock) {
 const { branchId } = await getScope({ admin: true });
 if (!Number.isInteger(newStock) || newStock < 0 || !Number.isInteger(expectedStock)) throw new Error('Stok tidak valid.');
 const result = unwrap(await supabase.from('products').update({ stock: newStock }).eq('id', id).eq('branch_id', branchId).eq('stock', expectedStock).select('id,stock').maybeSingle());
 if (!result) throw new Error('Stok telah berubah. Muat ulang sebelum menyesuaikan.');
 revalidatePath('/'); return result;
}
export async function uploadProductImage(base64Data) {
 const { branchId } = await getScope({ admin: true });
 const match = /^data:image\/(webp|png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(base64Data || '');
 if (!match) throw new Error('Format gambar tidak valid.');
 const bytes = Buffer.from(match[2], 'base64');
 if (bytes.length > 5 * 1024 * 1024) throw new Error('Maksimum ukuran gambar 5 MB.');
 const file = `${branchId}/${randomUUID()}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`;
 unwrap(await supabase.storage.from('product-images').upload(file, bytes, { contentType: 'image/' + match[1], upsert: false }));
 return supabase.storage.from('product-images').getPublicUrl(file).data.publicUrl;
}
export async function getAvailableProducts() {
 const { branchId } = await getScope();
 return fetchAll(() => supabase.from('products').select(productFields).eq('branch_id', branchId).gt('stock', 0).order('name').order('id'));
}
export async function processCheckout(cart, _clientTotal, paymentMethod = 'CASH', requestKey) {
 const { actor, branchId } = await getScope();
 if (!['CASH', 'QRIS'].includes(paymentMethod) || !/^[a-f0-9-]{36}$/i.test(requestKey || '')) throw new Error('Pembayaran tidak valid.');
 const result = unwrap(await supabase.rpc('checkout_branch', { p_branch_id: branchId, p_user_id: actor.id,
  p_items: security.validateCart(cart), p_payment: paymentMethod, p_request_key: requestKey }));
 revalidatePath('/'); return result;
}
export async function getRecentTransactions() {
 const { branchId } = await getScope();
 return unwrap(await supabase.from('transactions').select(transactionFields).eq('branch_id', branchId).order('created_at', { ascending: false }).limit(100));
}
export async function getActiveShift() {
 const { actor, branchId } = await getScope();
 return unwrap(await supabase.from('shifts').select('*').eq('branch_id', branchId).eq('user_id', actor.id).eq('status', 'ACTIVE').order('start_time', { ascending: false }).limit(1).maybeSingle());
}
export async function startShift() {
 const { actor, branchId } = await getScope();
 return unwrap(await supabase.rpc('start_branch_shift', { p_branch_id: branchId, p_user_id: actor.id }));
}
export async function endShift(id) {
 const { actor, branchId } = await getScope();
 return unwrap(await supabase.from('shifts').update({ status: 'ENDED', end_time: new Date().toISOString() }).eq('id', id).eq('branch_id', branchId).eq('user_id', actor.id).eq('status', 'ACTIVE').select('id').single());
}
export async function getShiftsByUser(userId) {
 const actor = await getActor(); security.requireAdmin(actor);
 return fetchAll(() => supabase.from('shifts').select('*,branches(name)').eq('user_id', userId).order('start_time', { ascending: false }).order('id'));
}
export async function getExpenses() { return list('expenses'); }
export async function addExpense(expense) {
 const amount = money(expense.amount); if (!amount) throw new Error('Nominal harus lebih dari nol.');
 return insert('expenses', { description: text(expense.description), amount, date: date(expense.date) });
}
export async function deleteExpense(id) { return remove('expenses', id); }
export async function getCustomers() { return list('customers'); }
export async function addCustomer(customer) { return insert('customers', { name: text(customer.name), phone: String(customer.phone || '').slice(0, 50) }); }
export async function deleteCustomer(id) { return remove('customers', id); }
export async function getSuppliers() { return list('suppliers', '*', true); }
export async function addSupplier(supplier) { return insert('suppliers', { name: text(supplier.name), phone: String(supplier.phone || '').slice(0, 50), address: String(supplier.address || '').slice(0, 2000) }, '*', true); }
export async function deleteSupplier(id) { return remove('suppliers', id); }
export async function getPurchases() { return list('purchases', '*,suppliers!purchases_supplier_id_fkey(name)', true); }
export async function addPurchase(purchase) { return insert('purchases', { supplier_id: purchase.supplier_id || null, total_amount: money(purchase.total_amount), status: 'COMPLETED' }, '*,suppliers!purchases_supplier_id_fkey(name)', true); }
export async function deletePurchase(id) { return remove('purchases', id); }
export async function getPriceNotes() { return list('price_notes', '*,products!price_notes_product_id_fkey(name)', true); }
export async function addPriceNote(note) { return insert('price_notes', { product_id: note.product_id || null, note: text(note.note, 5000) }, '*,products!price_notes_product_id_fkey(name)', true); }
export async function deletePriceNote(id) { return remove('price_notes', id); }

export async function getAppUsers() {
 const actor = await getActor(); security.requireAdmin(actor);
 return unwrap(await supabase.from('app_users').select('id,username,name,role,branch_id,is_active,created_at,branches(name)').order('created_at', { ascending: false }));
}
export async function addAppUser(user) {
 const actor = await getActor(); security.requireAdmin(actor);
 const role = user.role === 'super_admin' ? 'super_admin' : 'karyawan';
 const branchId = role === 'super_admin' ? null : user.branch_id;
 if (role !== 'super_admin') {
  const branch = unwrap(await supabase.from('branches').select('id').eq('id', branchId).eq('is_active', true).maybeSingle());
  if (!branch) throw new Error('Pilih cabang aktif.');
 }
 const username = text(user.username, 50).toUpperCase();
 if (!/^[A-Z0-9_]{3,50}$/.test(username) || typeof user.password !== 'string' || user.password.length < 10 || user.password.length > 256) throw new Error('Username minimal 3 karakter; password minimal 10 karakter.');
 return unwrap(await supabase.from('app_users').insert({ username, password: security.hashPassword(user.password),
  name: text(user.name, 100), role, branch_id: branchId, is_active: true }).select('id,username,name,role,branch_id,is_active,created_at,branches(name)').single());
}
export async function deleteAppUser(id) {
 const actor = await getActor(); security.requireAdmin(actor);
 if (id === actor.id) throw new Error('Tidak dapat menonaktifkan akun sendiri.');
 return unwrap(await supabase.from('app_users').update({ is_active: false }).eq('id', id).select('id').single());
}
export async function updateAppUser(id, values) {
 const actor = await getActor(); security.requireAdmin(actor);
 if (id === actor.id) throw new Error('Perubahan akses akun sendiri tidak diizinkan.');
 const payload = {};
 if (typeof values.is_active === 'boolean') payload.is_active = values.is_active;
 if (values.password) {
  if (typeof values.password !== 'string' || values.password.length < 10 || values.password.length > 256) throw new Error('Password minimal 10 karakter.');
  payload.password = security.hashPassword(values.password);
 }
 if (values.branch_id) {
  const branch = unwrap(await supabase.from('branches').select('id').eq('id', values.branch_id).eq('is_active', true).maybeSingle());
  if (!branch) throw new Error('Cabang tidak tersedia.');
  payload.branch_id = branch.id;
 }
 return unwrap(await supabase.from('app_users').update(payload).eq('id', id).eq('role', 'karyawan').select('id').single());
}
export async function saveBranch(branch) {
 const actor = await getActor(); security.requireAdmin(actor);
 const values = { name: text(branch.name, 120), address: String(branch.address || '').slice(0, 2000),
  phone: String(branch.phone || '').replace(/\D/g, '').slice(0, 32), is_active: branch.is_active !== false };
 if (values.phone.startsWith('0')) values.phone = '62' + values.phone.slice(1);
 if (branch.id) {
  const result = unwrap(await supabase.from('branches').update(values).eq('id', branch.id).select('*').single());
  if (!values.is_active && (await cookies()).get('waled_branch')?.value === branch.id) (await cookies()).set('waled_branch', 'all', {httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'});
  revalidatePath('/'); return result;
 }
 return unwrap(await supabase.from('branches').insert({ ...values, code: text(branch.code, 24).toUpperCase() }).select('*').single());
}
export async function getStoreSettings() {
 const { branchId } = await getScope();
 const settings = unwrap(await supabase.from('store_settings').select('*').eq('id', 1).single());
 const branch = unwrap(await supabase.from('branches').select('*').eq('id', branchId).single());
 return { ...settings, store_name: 'DIMSUM MENTAI WALED PREMIUM', branch_name: branch.name,
  store_address: branch.address || settings.store_address, store_phone: branch.phone || settings.store_phone };
}
export async function getGlobalSettings() {
 const actor = await getActor(); security.requireAdmin(actor);
 return unwrap(await supabase.from('store_settings').select('*').eq('id', 1).single());
}
export async function updateStoreSettings(settings) {
 const actor = await getActor(); security.requireAdmin(actor);
 const payload = { store_name: 'DIMSUM MENTAI WALED PREMIUM', updated_at: new Date().toISOString() };
 for (const field of ['store_phone', 'store_address', 'shift_rules']) if (typeof settings[field] === 'string') payload[field] = settings[field].slice(0, 5000);
 if (settings.low_stock_threshold !== undefined) {
  if (!Number.isInteger(settings.low_stock_threshold) || settings.low_stock_threshold < 0) throw new Error('Batas stok tidak valid.');
  payload.low_stock_threshold = settings.low_stock_threshold;
 }
 return unwrap(await supabase.from('store_settings').update(payload).eq('id', 1).select('*').single());
}
export async function getPublicCatalog(code) {
 const branches = unwrap(await supabase.from('branches').select('id,code,name').eq('is_active', true).order('code'));
 const branch = branches.find(b => b.code === code) || branches[0];
 if (!branch) return { branches: [], products: [], settings: { store_name: 'DIMSUM MENTAI WALED PREMIUM' } };
 const row = unwrap(await supabase.from('branches').select('name,phone,address').eq('id', branch.id).single());
 const settings = unwrap(await supabase.from('store_settings').select('store_phone,store_address').eq('id', 1).single());
 const products = await fetchAll(() => supabase.from('products').select('id,name,price,stock,image_url,is_favorite').eq('branch_id', branch.id).gt('stock', 0).order('name').order('id'));
 return { branches: branches.map(({ code, name }) => ({ code, name })), selected: branch.code, products,
  settings: { store_name: 'DIMSUM MENTAI WALED PREMIUM', branch_name: row.name, store_phone: row.phone || settings.store_phone, store_address: row.address || settings.store_address } };
}
export async function getAdvancedReportsData(startDate, endDate, requestedBranch) {
 const scope = await getScope({ admin: true, requireOne: false });
 const branches = scope.branches;
 let branchId = scope.branchId;
 if (requestedBranch === 'all') branchId = null;
 else if (requestedBranch) {
  if (!branches.some(b => b.id === requestedBranch)) throw new Error('Cabang tidak tersedia.');
  branchId = requestedBranch;
 }
 const start = date(startDate), end = date(endDate);
 if (start > end) throw new Error('Tanggal akhir harus setelah tanggal awal.');
 const from = start + 'T00:00:00+07:00';
 const until = new Date(Date.parse(end + 'T00:00:00+07:00') + 86400000).toISOString();
 const [transactions, expenses, shifts, purchases] = await Promise.all([
  fetchAll(() => scoped(supabase.from('transactions').select('*,transaction_items!transaction_items_transaction_id_fkey(*,products!transaction_items_product_id_fkey(name,category_id,categories!products_category_id_fkey(name)))').eq('status', 'COMPLETED').gte('created_at', from).lt('created_at', until).order('created_at', { ascending: false }).order('id'), branchId)),
  fetchAll(() => scoped(supabase.from('expenses').select('*').gte('date', start).lte('date', end).order('date', { ascending: false }).order('id'), branchId)),
  fetchAll(() => scoped(supabase.from('shifts').select('*').gte('start_time', from).lt('start_time', until).order('start_time', { ascending: false }).order('id'), branchId)),
  fetchAll(() => scoped(supabase.from('purchases').select('*').gte('created_at', from).lt('created_at', until).order('created_at', { ascending: false }).order('id'), branchId)),
 ]);
 return { transactions, expenses, shifts, purchases, branches: branchId ? branches.filter(b => b.id === branchId) : branches };
}
export async function getCashierHomeData() {
 const { actor, branchId, branches } = await getScope();
 const today = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Jakarta'}).format(new Date());
 const from = today + 'T00:00:00+07:00';
 const until = new Date(Date.parse(from) + 86400000).toISOString();
 const settings = unwrap(await supabase.from('store_settings').select('low_stock_threshold').eq('id',1).single());
 const threshold = settings.low_stock_threshold ?? 5;
 const [sales, expenses, lowStock, recent, shift] = await Promise.all([
  fetchAll(()=>supabase.from('transactions').select('id,total_amount').eq('branch_id',branchId).eq('status','COMPLETED').gte('created_at',from).lt('created_at',until).order('id')),
  fetchAll(()=>supabase.from('expenses').select('id,amount').eq('branch_id',branchId).eq('date',today).order('id')),
  supabase.from('products').select('id,name,stock',{count:'exact'}).eq('branch_id',branchId).lte('stock',threshold).order('stock').order('name').limit(3),
  supabase.from('transactions').select('id,total_amount,payment_method,created_at').eq('branch_id',branchId).eq('status','COMPLETED').order('created_at',{ascending:false}).limit(4),
  supabase.from('shifts').select('id,start_time').eq('branch_id',branchId).eq('user_id',actor.id).eq('status','ACTIVE').order('start_time',{ascending:false}).limit(1).maybeSingle(),
 ]);
 const branch = branches.find(b=>b.id===branchId);
 return { actor, branch:{id:branch.id,name:branch.name,code:branch.code},
  revenue:sales.reduce((sum,t)=>sum+Number(t.total_amount),0),transactionCount:sales.length,
  expenses:expenses.reduce((sum,e)=>sum+Number(e.amount),0),lowStock:unwrap(lowStock),lowStockCount:lowStock.count,
  recentTransactions:unwrap(recent),shift:unwrap(shift) };
}

export async function getDashboardData(startDate, endDate) {
 const scope = await getScope({ requireOne: false });
 const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
 const [firstSale, firstExpense] = await Promise.all([
  scoped(supabase.from('transactions').select('created_at').order('created_at').limit(1),scope.branchId).maybeSingle(),
  scoped(supabase.from('expenses').select('date').order('date').limit(1),scope.branchId).maybeSingle(),
 ]);
 const earliestDate = [today, unwrap(firstSale)?.created_at?.slice(0,10), unwrap(firstExpense)?.date].filter(Boolean).sort()[0];
 const start = startDate || today.slice(0, 8) + '01', end = endDate || today;
 if (scope.actor.role === 'super_admin') {
  const reports = await getAdvancedReportsData(start, end);
  return { ...reports, actor: scope.actor, selected: scope.selected, earliestDate };
 }
 const from = date(start) + 'T00:00:00+07:00';
 const until = new Date(Date.parse(date(end) + 'T00:00:00+07:00') + 86400000).toISOString();
 return { actor: scope.actor, selected: scope.branchId, branches: scope.branches, earliestDate,
  transactions: await fetchAll(() => supabase.from('transactions').select('id,total_amount,payment_method,created_at,branch_id').eq('branch_id', scope.branchId).eq('status', 'COMPLETED').gte('created_at', from).lt('created_at', until).order('created_at').order('id')),
  expenses: await fetchAll(() => supabase.from('expenses').select('*').eq('branch_id', scope.branchId).gte('date', start).lte('date', end).order('date').order('id')), shifts: [], purchases: [] };
}
export async function getReportsData() {
 const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
 return getAdvancedReportsData(today.slice(0, 8) + '01', today);
}
