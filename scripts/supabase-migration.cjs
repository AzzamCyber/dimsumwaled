// Local migration tooling. Never prints API keys or application row contents.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseEnv, isDeepStrictEqual } = require('node:util');
const { createClient } = require('@supabase/supabase-js');
const { verifyPassword } = require('../lib/security.cjs');
// Next bundles a WebSocket transport for local Node 20 environments.
const WebSocketTransport = globalThis.WebSocket || require('next/dist/compiled/ws');

const root = path.resolve(__dirname, '..');
const tableOrder = ['branches', 'categories', 'suppliers', 'customers', 'app_users', 'store_settings',
  'products', 'transactions', 'shifts', 'expenses', 'purchases', 'price_notes', 'transaction_items'];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const writeJson = (file, value) => fs.writeFile(file, json(value));
const checked = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
const client = env => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false }, realtime: { transport: WebSocketTransport } });

async function schema(env) {
  const headers = { apikey: env.SUPABASE_SERVICE_ROLE_KEY };
  if (env.SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ')) headers.Authorization = 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY;
  const response = await fetch(env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/',
    { headers, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error('Schema request failed: ' + response.status);
  return response.json();
}

async function rows(db, table) {
  const result = [];
  for (let offset = 0; ; offset += 500) {
    const batch = checked(await db.from(table).select('*').order('id').range(offset, offset + 499));
    result.push(...batch);
    if (batch.length < 500) return result;
  }
}

async function listObjects(db, bucket, prefix = '') {
  const result = [];
  for (let offset = 0; ; offset += 100) {
    const batch = checked(await db.storage.from(bucket).list(prefix,
      { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } }));
    for (const item of batch) {
      const name = prefix ? prefix + '/' + item.name : item.name;
      if (item.id) result.push({ ...item, name });
      else result.push(...await listObjects(db, bucket, name));
    }
    if (batch.length < 100) return result;
  }
}

function filePath(dir, bucket, name) {
  const base = path.resolve(dir, 'storage');
  const destination = path.resolve(base, bucket, ...name.split('/'));
  if (!destination.startsWith(base + path.sep)) throw new Error('Unsafe storage path');
  return destination;
}

function rewriteRows(data, sourceUrl, targetUrl) {
  return data.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) =>
    [key, typeof value === 'string' && value.startsWith(sourceUrl + '/storage/v1/')
      ? targetUrl + value.slice(sourceUrl.length) : value])));
}

async function backup(env) {
  const db = client(env);
  const snapshot = await schema(env);
  const tables = Object.keys(snapshot.definitions || {});
  if (tables.some(name => !tableOrder.includes(name))) throw new Error('Unrecognized tables; review migration order first');
  const dir = path.join(root, 'backups', new Date().toISOString().replace(/[:.]/g, '-') + '-supabase');
  await fs.mkdir(path.join(dir, 'data'), { recursive: true });
  await fs.copyFile(path.join(root, '.env.local'), path.join(dir, 'source.env.local'));
  let restoreSchema = await fs.readFile(path.join(root, snapshot.definitions.branches ? 'supabase_schema.sql' : 'database/001_base.sql'), 'utf8');
  // A backup restores the actual branches from JSON, never seeded branch rows.
  restoreSchema = restoreSchema.replace(/INSERT INTO public\.branches[\s\S]*?ON CONFLICT \(id\) DO NOTHING;/i, '');
  await fs.writeFile(path.join(dir, 'source-schema.sql'), restoreSchema);
  await writeJson(path.join(dir, 'openapi.json'), snapshot);
  const manifest = { format: 1, startedAt: new Date().toISOString(), sourceUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    scope: 'Application public tables exposed through REST and all Storage files; not a PostgreSQL system/auth/roles dump',
    tables: {}, buckets: [], objects: [] };
  for (const table of tableOrder.filter(name => tables.includes(name))) {
    const data = await rows(db, table);
    const bytes = json(data);
    await fs.writeFile(path.join(dir, 'data', table + '.json'), bytes);
    manifest.tables[table] = { rows: data.length, sha256: hash(bytes) };
    console.log('Backed up ' + table + ': ' + data.length + ' rows');
  }
  manifest.buckets = checked(await db.storage.listBuckets());
  for (const bucket of manifest.buckets) {
    for (const object of await listObjects(db, bucket.id)) {
      const blob = checked(await db.storage.from(bucket.id).download(object.name));
      const bytes = Buffer.from(await blob.arrayBuffer());
      const destination = filePath(dir, bucket.id, object.name);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, bytes);
      manifest.objects.push({ bucket: bucket.id, name: object.name, bytes: bytes.length,
        sha256: hash(bytes), contentType: object.metadata?.mimetype || blob.type || 'application/octet-stream' });
    }
  }
  // REST export has no shared transaction; reject row changes observed during export.
  for (const table of Object.keys(manifest.tables)) {
    if (!isDeepStrictEqual(await rows(db, table), await readJson(path.join(dir, 'data', table + '.json')))) {
      throw new Error('Source changed during backup: ' + table + '; retry during a quiet period');
    }
  }
  manifest.completedAt = new Date().toISOString();
  await writeJson(path.join(dir, 'manifest.json'), manifest);
  await fs.writeFile(path.join(dir, 'restore-database.sql'), await restoreSql(dir, manifest, manifest.sourceUrl));
  await fs.writeFile(path.join(root, 'backups', 'latest.txt'), dir);
  console.log('BACKUP VERIFIED: ' + dir);
  console.log('Storage files: ' + manifest.objects.length);
}

async function restoreSql(dir, manifest, targetUrl) {
  let ddl = await fs.readFile(path.join(dir, 'source-schema.sql'), 'utf8');
  ddl = ddl.replace(/INSERT INTO app_users[\s\S]*?ON CONFLICT \(username\) DO NOTHING;/, '')
    .replace(/INSERT INTO store_settings[\s\S]*?ON CONFLICT \(id\) DO NOTHING;/, '')
    .replaceAll('DISABLE ROW LEVEL SECURITY', 'ENABLE ROW LEVEL SECURITY')
    .replace(/^BEGIN;[ \t]*$/gm, '').replace(/^COMMIT;[ \t]*$/gm, '');
  let sql = '-- Restore application schema and data into the NEW project only.\n-- Contains private business data. Do not publish.\nBEGIN;\n' + ddl + '\n';
  for (const table of tableOrder.filter(name => manifest.tables[name])) {
    const dataFile = path.join(dir, 'data', table + '.json');
    const bytes = await fs.readFile(dataFile);
    if (hash(bytes) !== manifest.tables[table].sha256) throw new Error('Backup checksum mismatch: ' + table);
    const data = rewriteRows(JSON.parse(bytes), manifest.sourceUrl, targetUrl);
    sql += `\nDO $guard$ BEGIN IF EXISTS (SELECT 1 FROM public.${table} LIMIT 1) THEN RAISE EXCEPTION 'Target table ${table} must be empty'; END IF; END $guard$;\n`;
    if (data.length) {
      const tag = '$restore_' + crypto.randomBytes(12).toString('hex') + '$';
      sql += `INSERT INTO public.${table} SELECT * FROM json_populate_recordset(NULL::public.${table}, ${tag}${JSON.stringify(data)}${tag}::json);\n`;
    }
  }
  sql += "\nNOTIFY pgrst, 'reload schema';\nCOMMIT;\n";
  return sql;
}

async function prepare(dir, targetEnv) {
  const manifest = await readJson(path.join(dir, 'manifest.json'));
  const target = client(targetEnv);
  if (manifest.sourceUrl === targetEnv.NEXT_PUBLIC_SUPABASE_URL) throw new Error('Source equals target');
  await fs.writeFile(path.join(dir, 'restore-new-project.sql'), await restoreSql(dir, manifest, targetEnv.NEXT_PUBLIC_SUPABASE_URL));
  // Copy objects without overwriting any pre-existing different file.
  const existing = checked(await target.storage.listBuckets());
  for (const bucket of manifest.buckets) {
    const current = existing.find(item => item.id === bucket.id);
    if (current && current.public !== bucket.public) throw new Error('Target bucket visibility differs: ' + bucket.id);
    if (!current) checked(await target.storage.createBucket(bucket.id, { public: bucket.public,
      fileSizeLimit: bucket.file_size_limit || undefined, allowedMimeTypes: bucket.allowed_mime_types || undefined }));
  }
  for (const object of manifest.objects) {
    const bytes = await fs.readFile(filePath(dir, object.bucket, object.name));
    if (hash(bytes) !== object.sha256) throw new Error('Object checksum mismatch: ' + object.name);
    const existingObject = await target.storage.from(object.bucket).download(object.name);
    if (!existingObject.error) {
      if (hash(Buffer.from(await existingObject.data.arrayBuffer())) !== object.sha256) throw new Error('Target object conflicts: ' + object.name);
    } else {
      if (!['404', '400'].includes(String(existingObject.error.statusCode)) || !/not found/i.test(existingObject.error.message)) {
        throw new Error('Cannot inspect target object: ' + existingObject.error.message);
      }
      checked(await target.storage.from(object.bucket).upload(object.name, bytes,
        { contentType: object.contentType, upsert: false }));
    }
    const downloaded = checked(await target.storage.from(object.bucket).download(object.name));
    if (hash(Buffer.from(await downloaded.arrayBuffer())) !== object.sha256) throw new Error('Target storage verification failed');
  }
  console.log('Target storage verified: ' + manifest.objects.length + ' files');
  console.log('SQL restore ready: ' + path.join(dir, 'restore-new-project.sql'));
}

async function verify(dir, targetEnv, cutover, branchMode = false) {
  const manifest = await readJson(path.join(dir, 'manifest.json'));
  const sourceEnv = parseEnv(await fs.readFile(path.join(dir, 'source.env.local'), 'utf8'));
  const source = client(sourceEnv);
  const target = client(targetEnv);
  const targetSchema = await schema(targetEnv);
  const sourceSchema = await readJson(path.join(dir, 'openapi.json'));
  for (const table of Object.keys(manifest.tables)) {
    if (!targetSchema.definitions?.[table]) throw new Error('Target table missing: ' + table + '. Run restore-new-project.sql in the new project SQL Editor first.');
    const fields = s => Object.keys(s.definitions[table].properties).sort();
    if (!branchMode && !isDeepStrictEqual(fields(sourceSchema), fields(targetSchema))) throw new Error('Target columns differ: ' + table);
    const original = await readJson(path.join(dir, 'data', table + '.json'));
    if (!isDeepStrictEqual(await rows(source, table), original)) throw new Error('Source changed since backup: ' + table + '; create a fresh backup before cutover');
    const expected = rewriteRows(original, manifest.sourceUrl, targetEnv.NEXT_PUBLIC_SUPABASE_URL);
    const actual = await rows(target, table);
    if (branchMode) {
      if (actual.length !== original.length + (table === 'app_users' ? 3 : 0)) throw new Error('Target row count differs: ' + table);
      for (const expectedRow of expected) {
        const actualRow = actual.find(row => row.id === expectedRow.id);
        if (!actualRow) throw new Error('Missing restored row: ' + table);
        const projected = {};
        for (const key of Object.keys(expectedRow)) {
          if (table === 'app_users' && key === 'password') {
            if (!verifyPassword(expectedRow.password, actualRow.password)) throw new Error('Restored password differs');
            projected[key] = expectedRow.password;
          } else if (table === 'app_users' && key === 'role') {
            const newRole = expectedRow.role === 'admin' ? 'super_admin' : expectedRow.role === 'kasir' ? 'karyawan' : expectedRow.role;
            if (actualRow.role !== newRole) throw new Error('Restored role differs');
            projected[key] = expectedRow.role;
          } else if (table === 'store_settings' && key === 'store_name') {
            if (actualRow.store_name !== 'DIMSUM MENTAI WALED PREMIUM') throw new Error('Brand migration missing');
            projected[key] = expectedRow[key];
          } else if (table === 'store_settings' && key === 'updated_at') projected[key] = expectedRow[key];
          else projected[key] = actualRow[key];
        }
        if (!isDeepStrictEqual(projected, expectedRow)) throw new Error('Restored values differ: ' + table);
        if (table !== 'store_settings') {
          const branch = table === 'app_users' && actualRow.role === 'super_admin' ? null : '11111111-1111-4111-8111-111111111111';
          if (actualRow.branch_id !== branch) throw new Error('Legacy branch assignment differs: ' + table);
        }
      }
    } else if (!isDeepStrictEqual(actual, expected)) throw new Error('Target data differs: ' + table);
    console.log('Verified ' + table + ': ' + expected.length + ' rows');
  }
  if (branchMode) {
    const accounts = await readJson(path.join(dir, 'branch-accounts.private.json'));
    const branches = await rows(target, 'branches');
    if (branches.length !== 3) throw new Error('Expected three branches');
    const users = await rows(target, 'app_users');
    for (const account of accounts) {
      const user = users.find(row => row.id === account.id);
      if (!user || user.role !== 'karyawan' || user.branch_id !== account.branch_id || !user.is_active || !verifyPassword(account.password, user.password)) throw new Error('Branch account verification failed');
    }
    console.log('Verified three branches and all employee logins');
  }
  for (const object of manifest.objects) {
    const blob = checked(await target.storage.from(object.bucket).download(object.name));
    if (hash(Buffer.from(await blob.arrayBuffer())) !== object.sha256) throw new Error('Target object mismatch: ' + object.name);
  }
  const report = { verifiedAt: new Date().toISOString(), targetUrl: targetEnv.NEXT_PUBLIC_SUPABASE_URL,
    rows: Object.values(manifest.tables).reduce((sum, value) => sum + value.rows, 0), files: manifest.objects.length };
  await writeJson(path.join(dir, 'verification.json'), report);
  if (cutover) {
    const envFile = path.join(root, '.env.local');
    let text = await fs.readFile(envFile, 'utf8');
    for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
      const pattern = new RegExp('^' + key + '=.*$', 'm');
      if (!pattern.test(text)) throw new Error('Missing environment variable: ' + key);
      text = text.replace(pattern, () => key + '=' + targetEnv[key]);
    }
    await fs.writeFile(envFile + '.migration-tmp', text);
    await fs.rename(envFile + '.migration-tmp', envFile);
    console.log('LOCAL ENVIRONMENT SWITCHED. Restart the app; production hosting variables require a separate update.');
  }
  console.log('VERIFIED: ' + JSON.stringify(report));
}

(async () => {
  const command = process.argv[2];
  const env = parseEnv(await fs.readFile(path.join(root, '.env.local'), 'utf8'));
  if (command === 'backup') return backup(env);
  if (!['prepare', 'verify', 'cutover', 'verify-branches', 'cutover-branches', 'restore-sql'].includes(command)) throw new Error('Usage: node scripts/supabase-migration.cjs backup|prepare|verify|cutover|verify-branches|cutover-branches|restore-sql [backup-directory]');
  const pointer = command.endsWith('-branches') ? 'migration-source.txt' : 'latest.txt';
  const dir = process.argv[3] ? path.resolve(process.argv[3]) : (await fs.readFile(path.join(root, 'backups', pointer), 'utf8')).trim();
  if (command === 'restore-sql') {
    const manifest = await readJson(path.join(dir, 'manifest.json'));
    await fs.writeFile(path.join(dir, 'restore-database.sql'), await restoreSql(dir, manifest, manifest.sourceUrl));
    console.log('Standalone restore SQL generated.'); return;
  }
  const targetEnv = parseEnv(await fs.readFile(path.join(root, '.env.supabase-target.local'), 'utf8'));
  if (command === 'prepare') return prepare(dir, targetEnv);
  return verify(dir, targetEnv, command.startsWith('cutover'), command.endsWith('-branches'));
})().catch(error => { console.error('Migration stopped: ' + error.message); process.exitCode = 1; });
