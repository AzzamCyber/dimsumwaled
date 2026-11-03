// Read-only HTTP acceptance tests against the running local app.
// Credentials stay in memory; no real sales, shifts or stock changes are made.
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = process.env.TEST_BASE_URL || 'http://localhost:3100';
const root = path.resolve(__dirname, '..');
class Session {
 constructor() { this.cookies = new Map(); }
 header() { return [...this.cookies].map(([k,v]) => k + '=' + v).join('; '); }
 async request(route, options = {}) {
  const response = await fetch(base + route, { ...options, redirect: 'manual',
   headers: { Cookie: this.header(), ...options.headers } });
  for (const cookie of response.headers.getSetCookie()) {
   const pair = cookie.split(';')[0], at = pair.indexOf('=');
   if (at > 0) this.cookies.set(pair.slice(0, at), pair.slice(at + 1));
  }
  return response;
 }
 async login(username, password) {
  const csrf = await (await this.request('/api/auth/csrf')).json();
  await this.request('/api/auth/callback/credentials', { method: 'POST',
   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
   body: new URLSearchParams({ csrfToken: csrf.csrfToken, username, password, callbackUrl: base + '/', json: 'true' }) });
  return (await this.request('/api/auth/session')).json();
 }
}
(async () => {
 const dir = (await fs.readFile(path.join(root, 'backups/migration-source.txt'), 'utf8')).trim();
 const accounts = JSON.parse(await fs.readFile(path.join(dir, 'branch-accounts.private.json'), 'utf8'));
 const oldUsers = JSON.parse(await fs.readFile(path.join(dir, 'data/app_users.json'), 'utf8'));
 const products = JSON.parse(await fs.readFile(path.join(dir, 'data/products.json'), 'utf8'));
 const manifest = JSON.parse(await fs.readFile(path.join(root, '.next/server/server-reference-manifest.json'), 'utf8'));
 const ids = Object.fromEntries(Object.entries(manifest.node).map(([id, info]) => [info.exportedName, id]));
 async function action(session, name, args = [], reject = false) {
  const response = await session.request('/katalog', { method: 'POST',
   headers: { 'Next-Action': ids[name], 'Content-Type': 'text/plain;charset=UTF-8', Origin: base, Accept: 'text/x-component' },
   body: JSON.stringify(args) });
  const body = await response.text();
  if (reject) { assert(response.status >= 400, name + ' should be rejected'); return; }
  assert.equal(response.status, 200, name + ' failed');
  const result = body.split('\n').find(line => /^1:/.test(line));
  assert(result, 'No action result: ' + name);
  const raw = JSON.parse(result.slice(2));
  // React Flight deduplicates repeated objects (e.g. the selected branch).
  function decode(value) {
   if (typeof value === 'string' && value.startsWith('$1:')) return decode(value.slice(3).split(':').reduce((v,k) => v[k], raw));
   if (Array.isArray(value)) return value.map(decode);
   if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,decode(v)]));
   return value;
  }
  return decode(raw);
 }
 const anonymous = new Session();
 assert.equal((await anonymous.request('/portal-karyawan')).status, 200);
 assert.equal((await anonymous.request('/')).status, 307);
 const publicCatalog = await action(anonymous, 'getPublicCatalog', ['CBG-01']);
 assert(publicCatalog.products.length > 0);
 assert(publicCatalog.products.every(p => !('base_price' in p) && !('branch_id' in p)));
 await action(anonymous, 'getAppUsers', [], true);
 await action(anonymous, 'getDashboardData', [], true);
 await action(anonymous, 'getCashierHomeData', [], true);
 console.log('PASS: public catalog safe; unauthenticated private actions rejected');
 for (const account of accounts) {
  const worker = new Session();
  const session = await worker.login(account.username, account.password);
  assert.equal(session.user?.role, 'karyawan', 'Branch login failed');
  assert.equal(session.user.branch_id, account.branch_id, 'Session branch assignment');
  for (const route of ['/users', '/branches', '/reports', '/products']) assert.equal((await worker.request(route)).status, 307);
  worker.cookies.set('waled_branch', '11111111-1111-4111-8111-111111111111');
  const ctx = await action(worker, 'getBranchContext');
  assert.equal(ctx.operationalBranch.id, account.branch_id, 'Server branch assignment');
  const cashierHome = await action(worker, 'getCashierHomeData');
  assert.equal(cashierHome.branch.id, account.branch_id, 'Cashier mobile home branch assignment');
  assert.equal(cashierHome.actor.role, 'karyawan');
  assert.equal(typeof cashierHome.revenue, 'number');
  assert.equal(typeof cashierHome.lowStockCount, 'number');
  assert(!('cogs' in cashierHome) && !('netProfit' in cashierHome) && !('branches' in cashierHome));
  assert(cashierHome.lowStock.every(p => !('base_price' in p)));
  await action(worker, 'getAdvancedReportsData', ['2026-01-01', '2026-12-31', 'all'], true);
  const items = await action(worker, 'getProducts');
  assert(items.every(p => p.branch_id === account.branch_id && !('base_price' in p)));
  await action(worker, 'getAppUsers', [], true);
  await action(worker, 'selectBranch', ['all'], true);
  await action(worker, 'updateProductStock', [products[0].id, 1, products[0].stock], true);
  await action(worker, 'addAppUser', [{name:'forged',username:'FORGED',password:'NeverPersist123',role:'super_admin'}], true);
  await action(worker, 'updateStoreSettings', [{store_name:'forged'}], true);
  await action(worker, 'processCheckout', [[{id:products[0].id,quantity:-1}], 1, 'CASH', '11111111-1111-4111-8111-111111111111'], true);
 }
 console.log('PASS: all three branch logins; forged branch selection and employee admin mutations denied');
 const originalAdmin = oldUsers.find(u => u.role === 'admin' && !u.password.startsWith('scrypt$'));
 assert(originalAdmin, 'Original admin login credential unavailable for acceptance test');
 const admin = new Session();
 const adminSession = await admin.login(originalAdmin.username, originalAdmin.password);
 assert.equal(adminSession.user?.role, 'super_admin');
 const users = await action(admin, 'getAppUsers');
 assert.equal(users.length, oldUsers.length + 3); assert(users.every(u => !('password' in u)));
 for (const route of ['/users', '/branches', '/reports', '/products', '/settings', '/pos']) assert.equal((await admin.request(route)).status, 200);
 const data = await action(admin, 'getAdvancedReportsData', ['2000-01-01', '2099-01-01', 'all']);
 assert.equal(data.transactions.length, 28); assert.equal(data.branches.length, 3);
 const branchTwo = await action(admin, 'getAdvancedReportsData', ['2000-01-01', '2099-01-01', accounts[1].branch_id]);
 assert.equal(branchTwo.transactions.length, 0); assert.equal(branchTwo.expenses.length, 0);
 assert.equal(branchTwo.branches.length, 1);
 console.log('PASS: original admin login, private account fields, joined reports and branch-specific totals');
 // No server credentials should appear in client-delivered build files.
 const env = require('node:util').parseEnv(await fs.readFile(path.join(root,'.env.local'),'utf8'));
 async function scan(dirPath) { for(const e of await fs.readdir(dirPath,{withFileTypes:true})) {
  const file = path.join(dirPath,e.name); if(e.isDirectory()) await scan(file);
  else if(/\.(js|html|json)$/.test(file)) assert(!(await fs.readFile(file,'utf8')).includes(env.SUPABASE_SERVICE_ROLE_KEY), 'Secret found in public artifact');
 } }
 await scan(path.join(root,'.next/static'));
 console.log('PASS: server secret absent from browser bundles');
 console.log('ALL LIVE ACCESS CHECKS PASSED');
})().catch(error => { console.error('Acceptance test failed: ' + error.message); process.exitCode=1; });
