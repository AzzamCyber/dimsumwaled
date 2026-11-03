-- FROZEN MART: SUPABASE FULL SCHEMA (PHASE 1 & 2)

-- 1. Tabel Kategori
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabel Produk
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  barcode VARCHAR(100),
  price NUMERIC(15, 2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabel Absensi / Shift
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name VARCHAR(100) NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'ACTIVE'
);

-- 4. Tabel Transaksi Kasir
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(50) DEFAULT 'CASH',
  status VARCHAR(50) DEFAULT 'COMPLETED',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabel Detail Transaksi (Item Kasir)
CREATE TABLE IF NOT EXISTS transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity INT NOT NULL,
  price NUMERIC(15, 2) NOT NULL,
  subtotal NUMERIC(15, 2) NOT NULL
);

-- 6. Tabel Pelanggan
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabel Supplier
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Tabel Pengeluaran (Expenses)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description VARCHAR(255) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Tabel Pembelian (Purchases dari Supplier)
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  status VARCHAR(50) DEFAULT 'COMPLETED',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Catatan Harga (Price Notes)
CREATE TABLE IF NOT EXISTS price_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Public access is disabled; application access uses authenticated server actions. 
-- The server secret key is never sent to the browser.
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_notes ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- UPDATE FASE 5: PENAMBAHAN HARGA MODAL (BASE PRICE) UNTUK LAPORAN MARGIN
-- SILAKAN JALANKAN 2 BARIS PERINTAH DI BAWAH INI DI SQL EDITOR SUPABASE ANDA:
-- ==============================================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS base_price NUMERIC(15, 2) NOT NULL DEFAULT 0;
ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS base_price NUMERIC(15, 2) NOT NULL DEFAULT 0;

-- ==============================================================================
-- UPDATE FASE 6: MANAJEMEN USER DINAMIS & FAVORIT PRODUK
-- SILAKAN JALANKAN PERINTAH DI BAWAH INI DI SQL EDITOR SUPABASE ANDA:
-- ==============================================================================
-- 1. Tambah Kolom Favorit pada Tabel Produk
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- ==============================================================================
-- UPDATE FASE 7: GAMBAR PRODUK (SUPABASE STORAGE)
-- SILAKAN JALANKAN PERINTAH DI BAWAH INI DI SQL EDITOR SUPABASE ANDA:
-- ==============================================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Buat Tabel Users
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'kasir',
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Insert Default Users (Password disimpan dalam bentuk plain text untuk kemudahan fase ini)


-- ==============================================================================
-- UPDATE FASE 8: GLOBAL SETTINGS (KATALOG ONLINE)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS store_settings (
  id INT PRIMARY KEY DEFAULT 1,
  store_name VARCHAR(255) DEFAULT 'Frozen Mart',
  store_phone VARCHAR(50) DEFAULT '6281234567890',
  store_address TEXT DEFAULT 'Jl. Raya Frozen',
  low_stock_threshold INT DEFAULT 5,
  shift_rules TEXT DEFAULT '1. Kasir wajib datang tepat waktu.',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Pastikan kolom shift_rules ditambahkan jika tabel sudah pernah dibuat sebelumnya
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS shift_rules TEXT DEFAULT '1. Kasir wajib datang tepat waktu.';


