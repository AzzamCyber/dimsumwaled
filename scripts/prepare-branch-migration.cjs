const fs = require('node:fs/promises');
const path = require('node:path');
const { randomBytes, randomUUID } = require('node:crypto');
const { hashPassword } = require('../lib/security.cjs');
const root = path.resolve(__dirname, '..');
(async () => {
 const dir = (await fs.readFile(path.join(root, 'backups/migration-source.txt'), 'utf8')).trim();
 const original = await fs.readFile(path.join(dir, 'restore-new-project.sql'), 'utf8');
 const migration = await fs.readFile(path.join(root, 'database/002_multi_branch.sql'), 'utf8');
 const users = JSON.parse(await fs.readFile(path.join(dir, 'data/app_users.json'), 'utf8'));
 if (!users.some(u => u.role === 'admin')) throw new Error('No existing primary admin; review before preparing migration');
 const credentialPath = path.join(dir, 'branch-accounts.private.json');
 let accounts;
 try { accounts = JSON.parse(await fs.readFile(credentialPath, 'utf8')); }
 catch (error) {
  if (error.code !== 'ENOENT') throw error;
  accounts = [1, 2, 3].map(n => ({ id: randomUUID(), username: 'CABANG' + n, name: 'Karyawan Cabang ' + n,
   password: randomBytes(15).toString('base64url') + '!7aA',
   branch_id: String(n).repeat(8) + '-' + String(n).repeat(4) + '-4' + String(n).repeat(3) + '-8' + String(n).repeat(3) + '-' + String(n).repeat(12) }));
  await fs.writeFile(credentialPath, JSON.stringify(accounts, null, 2));
 }
 if (accounts.some(a => users.some(u => u.username.toUpperCase() === a.username))) throw new Error('Branch login name already exists in source');
 const unwrap = sql => sql.replace(/^BEGIN;\s*$/m, '').replace(/^COMMIT;\s*$/m, '');
 let sql = '-- NEW project ysiuwdbycegoteyokjlx only. Full application restore + branch migration.\nBEGIN;\n';
 sql += unwrap(original) + '\n' + unwrap(migration) + '\n';
 for (const user of users) {
  const password = user.password.startsWith('scrypt$') ? user.password : hashPassword(user.password);
  sql += `UPDATE public.app_users SET password='${password}' WHERE id='${user.id}';\n`;
 }
 for (const user of accounts) sql += `INSERT INTO public.app_users(id,username,name,password,role,branch_id,is_active) VALUES ('${user.id}','${user.username}','${user.name}','${hashPassword(user.password)}','karyawan','${user.branch_id}',true);\n`;
 sql += "NOTIFY pgrst,'reload schema';\nCOMMIT;\n";
 await fs.writeFile(path.join(dir, 'IMPORT-DIMSUM-WALED.sql'), sql);
 await fs.writeFile(path.join(dir, 'AKUN-CABANG-RAHASIA.txt'),
  'DIMSUM MENTAI WALED PREMIUM — AKUN CABANG\nSimpan pribadi; jangan unggah ke Git.\n\n' + accounts.map(a => `${a.name}\nUsername: ${a.username}\nPassword: ${a.password}\n`).join('\n') + '\nAdmin utama: gunakan akun admin lama dengan password yang sama.\n');
 console.log('Combined import prepared: ' + path.join(dir, 'IMPORT-DIMSUM-WALED.sql'));
 console.log('Private branch login list saved locally; passwords are not printed.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
