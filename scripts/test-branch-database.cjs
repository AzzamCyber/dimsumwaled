// Runs the real PostgreSQL migration and checkout functions locally in PGlite.
// Install the validation-only dependency in ignored backups/validation first.
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PGlite } = require('../backups/validation/node_modules/@electric-sql/pglite');
const { verifyPassword, resolveBranch, requireAdmin, validateCart } = require('../lib/security.cjs');
(async () => {
 const root = path.resolve(__dirname, '..');
 const dir = (await fs.readFile(path.join(root, 'backups/migration-source.txt'), 'utf8')).trim();
 const accounts = JSON.parse(await fs.readFile(path.join(dir, 'branch-accounts.private.json'), 'utf8'));
 const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
 const db = new PGlite();
 try {
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
  await db.exec(await fs.readFile(path.join(dir, 'IMPORT-DIMSUM-WALED.sql'), 'utf8'));
  const one = async (sql, params = []) => (await db.query(sql, params)).rows[0];
  for (const [table, info] of Object.entries(manifest.tables)) {
   assert.equal(Number((await one(`SELECT count(*) FROM public.${table}`)).count), info.rows + (table === 'app_users' ? 3 : 0));
  }
  assert.equal(Number((await one('SELECT count(*) FROM branches')).count), 3);
  for (const account of accounts) {
   const user = await one('SELECT * FROM app_users WHERE id=$1', [account.id]);
   assert(verifyPassword(account.password, user.password));
   assert.equal(user.role, 'karyawan'); assert.equal(user.branch_id, account.branch_id);
  }
  console.log('PASS: complete backup imports; three branch accounts authenticate with hashed passwords');
  const worker = await one('SELECT * FROM app_users WHERE id=$1', [accounts[1].id]);
  const branches = (await db.query('SELECT * FROM branches')).rows;
  assert.equal(resolveBranch(worker, accounts[0].branch_id, branches), worker.branch_id);
  assert.throws(() => requireAdmin(worker));
  assert.throws(() => resolveBranch({ ...worker, is_active: false }, 'all', branches));
  assert.throws(() => validateCart([{ id: randomUUID(), quantity: -1 }]));
  console.log('PASS: forged branch selection, inactive accounts, admin access and invalid cart rejected');
  const productId = randomUUID();
  await db.query('INSERT INTO products(id,branch_id,name,price,base_price,stock) VALUES($1,$2,$3,5000,2000,3)', [productId, worker.branch_id, 'Local test product']);
  const checkout = async (branch, user, cart, key = randomUUID()) => one('SELECT checkout_branch($1,$2,$3::jsonb,$4,$5) AS result', [branch, user, JSON.stringify(cart), 'CASH', key]);
  const cart = [{ id: productId, quantity: 2, price: 1 }];
  await assert.rejects(checkout(worker.branch_id, worker.id, cart), /Mulai shift/);
  await db.query('SELECT start_branch_shift($1,$2)', [worker.branch_id, worker.id]);
  await db.query('SELECT start_branch_shift($1,$2)', [worker.branch_id, worker.id]);
  assert.equal(Number((await one("SELECT count(*) FROM shifts WHERE user_id=$1 AND status='ACTIVE'", [worker.id])).count), 1);
  await assert.rejects(checkout(accounts[0].branch_id, worker.id, cart), /Akses cabang/);
  const key = randomUUID();
  const sale = (await checkout(worker.branch_id, worker.id, cart, key)).result;
  assert.equal(sale.total_amount, 10000);
  assert.equal((await one('SELECT stock FROM products WHERE id=$1', [productId])).stock, 1);
  assert.equal((await checkout(worker.branch_id, worker.id, cart, key)).result.id, sale.id);
  const before = await one('SELECT count(*) FROM transactions');
  await assert.rejects(checkout(worker.branch_id, worker.id, cart), /Stok produk/);
  assert.deepEqual(await one('SELECT count(*) FROM transactions'), before);
  assert.equal((await one('SELECT stock FROM products WHERE id=$1', [productId])).stock, 1);
  console.log('PASS: shift ownership, server prices, stock deduction, idempotency, cross-branch access and failed-checkout rollback');
  await assert.rejects(db.query('INSERT INTO transaction_items(transaction_id,branch_id,product_id,quantity,price,subtotal,base_price) VALUES($1,$2,$3,1,1,1,0)', [sale.id, accounts[0].branch_id, productId]), /foreign key/);
  await db.exec('GRANT SELECT ON public.app_users TO anon; SET ROLE anon;');
  assert.equal(Number((await one('SELECT count(*) FROM app_users')).count), 0);
  await assert.rejects(db.query('SELECT checkout_branch($1,$2,$3::jsonb,$4,$5)', [worker.branch_id,worker.id,JSON.stringify(cart),'CASH',randomUUID()]), /permission denied/);
  await db.exec('RESET ROLE;');
  console.log('PASS: database cross-branch constraints, anonymous row protection and RPC access restrictions');
  console.log('ALL BRANCH DATABASE CHECKS PASSED');
 } finally { await db.close(); }
})().catch(error => { console.error('Database check failed: ' + error.message); process.exitCode = 1; });
