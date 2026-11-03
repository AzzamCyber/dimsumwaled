-- Apply in the NEW project after restoring the application data.
BEGIN;
CREATE TABLE IF NOT EXISTS public.branches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar(24) UNIQUE NOT NULL,
 name varchar(120) NOT NULL, address text NOT NULL DEFAULT '', phone varchar(32) NOT NULL DEFAULT '',
 is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
INSERT INTO public.branches (id,code,name) VALUES
 ('11111111-1111-4111-8111-111111111111','CBG-01','Cabang 1'),
 ('22222222-2222-4222-8222-222222222222','CBG-02','Cabang 2'),
 ('33333333-3333-4333-8333-333333333333','CBG-03','Cabang 3') ON CONFLICT (id) DO NOTHING;
DO $migration$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['categories','products','shifts','transactions','transaction_items','customers','suppliers','expenses','purchases','price_notes'] LOOP
  EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id)',t);
  EXECUTE format('UPDATE public.%I SET branch_id=%L WHERE branch_id IS NULL',t,'11111111-1111-4111-8111-111111111111');
  EXECUTE format('ALTER TABLE public.%I ALTER COLUMN branch_id SET NOT NULL',t);
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (branch_id)',t||'_branch_idx',t);
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 END LOOP;
END $migration$;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id);
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
UPDATE public.app_users SET role='super_admin',branch_id=NULL WHERE role='admin';
UPDATE public.app_users SET role='karyawan',branch_id='11111111-1111-4111-8111-111111111111' WHERE role='kasir';
ALTER TABLE public.app_users DROP CONSTRAINT IF EXISTS app_users_role_branch_check;
ALTER TABLE public.app_users ADD CONSTRAINT app_users_role_branch_check CHECK
 ((role='super_admin' AND branch_id IS NULL) OR (role='karyawan' AND branch_id IS NOT NULL));
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
UPDATE public.store_settings SET store_name='DIMSUM MENTAI WALED PREMIUM',updated_at=now() WHERE id=1;
UPDATE public.branches b SET address=coalesce(s.store_address,''),phone=coalesce(s.store_phone,'')
 FROM public.store_settings s WHERE b.id='11111111-1111-4111-8111-111111111111' AND s.id=1;
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.app_users(id) ON DELETE SET NULL;
UPDATE public.shifts s SET user_id=u.id FROM public.app_users u WHERE s.user_id IS NULL AND s.user_name=u.name
 AND (SELECT count(*) FROM public.app_users v WHERE v.name=s.user_name)=1;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.app_users(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS request_key uuid;
CREATE UNIQUE INDEX IF NOT EXISTS transactions_request_key_idx ON public.transactions(request_key) WHERE request_key IS NOT NULL;
ALTER TABLE public.transaction_items ADD COLUMN IF NOT EXISTS product_name text;
UPDATE public.transaction_items i SET product_name=p.name FROM public.products p WHERE i.product_id=p.id AND i.product_name IS NULL;
CREATE INDEX IF NOT EXISTS transactions_branch_created_idx ON public.transactions(branch_id,created_at DESC);
CREATE INDEX IF NOT EXISTS expenses_branch_date_idx ON public.expenses(branch_id,date);

-- Composite foreign keys prevent relations between different branches.
CREATE UNIQUE INDEX IF NOT EXISTS categories_id_branch_unique ON public.categories(id,branch_id);
CREATE UNIQUE INDEX IF NOT EXISTS products_id_branch_unique ON public.products(id,branch_id);
CREATE UNIQUE INDEX IF NOT EXISTS suppliers_id_branch_unique ON public.suppliers(id,branch_id);
CREATE UNIQUE INDEX IF NOT EXISTS transactions_id_branch_unique ON public.transactions(id,branch_id);
DO $constraints$
BEGIN
 IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname='products_category_branch_fk' AND conrelid='public.products'::regclass) THEN
  ALTER TABLE public.products ADD CONSTRAINT products_category_branch_fk FOREIGN KEY(category_id,branch_id) REFERENCES public.categories(id,branch_id);
  ALTER TABLE public.purchases ADD CONSTRAINT purchases_supplier_branch_fk FOREIGN KEY(supplier_id,branch_id) REFERENCES public.suppliers(id,branch_id);
  ALTER TABLE public.price_notes ADD CONSTRAINT price_notes_product_branch_fk FOREIGN KEY(product_id,branch_id) REFERENCES public.products(id,branch_id);
  ALTER TABLE public.transaction_items ADD CONSTRAINT items_product_branch_fk FOREIGN KEY(product_id,branch_id) REFERENCES public.products(id,branch_id);
  ALTER TABLE public.transaction_items ADD CONSTRAINT items_transaction_branch_fk FOREIGN KEY(transaction_id,branch_id) REFERENCES public.transactions(id,branch_id);
 END IF;
END $constraints$;

CREATE OR REPLACE FUNCTION public.checkout_branch(p_branch_id uuid,p_user_id uuid,p_items jsonb,p_payment text,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $checkout$
DECLARE
 actor public.app_users; existing public.transactions; product public.products; line record;
 trx_id uuid; total numeric(15,2):=0; items_json jsonb:='[]'::jsonb; timestamp_now timestamptz:=now();
BEGIN
 SELECT * INTO actor FROM public.app_users WHERE id=p_user_id AND is_active FOR SHARE;
 IF NOT FOUND OR (actor.role<>'super_admin' AND actor.branch_id IS DISTINCT FROM p_branch_id) THEN RAISE EXCEPTION 'Akses cabang ditolak'; END IF;
 IF NOT EXISTS (SELECT FROM public.branches WHERE id=p_branch_id AND is_active) THEN RAISE EXCEPTION 'Cabang tidak aktif'; END IF;
 IF actor.role<>'super_admin' AND NOT EXISTS (SELECT FROM public.shifts WHERE user_id=p_user_id AND branch_id=p_branch_id AND status='ACTIVE') THEN RAISE EXCEPTION 'Mulai shift sebelum melakukan transaksi'; END IF;
 IF p_request_key IS NULL THEN RAISE EXCEPTION 'ID permintaan wajib diisi'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_key::text,0));
 SELECT * INTO existing FROM public.transactions WHERE request_key=p_request_key;
 IF FOUND THEN
  IF existing.branch_id IS DISTINCT FROM p_branch_id OR existing.user_id IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION 'ID permintaan tidak valid'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',product_id,'name',product_name,'price',price,'quantity',quantity)),'[]'::jsonb)
   INTO items_json FROM public.transaction_items WHERE transaction_id=existing.id;
  RETURN jsonb_build_object('id',existing.id,'total_amount',existing.total_amount,'created_at',existing.created_at,'payment_method',existing.payment_method,'items',items_json);
 END IF;
 IF p_payment NOT IN ('CASH','QRIS') THEN RAISE EXCEPTION 'Metode pembayaran tidak valid'; END IF;
 IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Keranjang tidak valid'; END IF;
 IF jsonb_array_length(p_items)<1 OR jsonb_array_length(p_items)>200 THEN RAISE EXCEPTION 'Keranjang tidak valid'; END IF;
 IF EXISTS (SELECT FROM jsonb_array_elements(p_items) item WHERE (item->>'quantity') IS NULL OR (item->>'id') IS NULL OR (item->>'quantity') !~ '^[1-9][0-9]{0,5}$') THEN RAISE EXCEPTION 'Jumlah produk tidak valid'; END IF;
 FOR line IN SELECT (item->>'id')::uuid AS id,sum((item->>'quantity')::int)::int AS quantity
  FROM jsonb_array_elements(p_items) item GROUP BY (item->>'id')::uuid ORDER BY (item->>'id')::uuid LOOP
  SELECT * INTO product FROM public.products WHERE id=line.id AND branch_id=p_branch_id FOR UPDATE;
  IF NOT FOUND OR product.stock<line.quantity THEN RAISE EXCEPTION 'Stok produk tidak mencukupi'; END IF;
  total:=total+product.price*line.quantity;
  items_json:=items_json||jsonb_build_array(jsonb_build_object('id',product.id,'name',product.name,'price',product.price,'quantity',line.quantity));
 END LOOP;
 INSERT INTO public.transactions(branch_id,user_id,request_key,total_amount,payment_method,status,created_at)
 VALUES(p_branch_id,p_user_id,p_request_key,total,p_payment,'COMPLETED',timestamp_now) RETURNING id INTO trx_id;
 FOR line IN SELECT value FROM jsonb_array_elements(items_json) LOOP
  SELECT * INTO product FROM public.products WHERE id=(line.value->>'id')::uuid;
  INSERT INTO public.transaction_items(transaction_id,branch_id,product_id,product_name,quantity,price,base_price,subtotal)
  VALUES(trx_id,p_branch_id,product.id,product.name,(line.value->>'quantity')::int,product.price,product.base_price,product.price*(line.value->>'quantity')::int);
  UPDATE public.products SET stock=stock-(line.value->>'quantity')::int WHERE id=product.id;
 END LOOP;
 RETURN jsonb_build_object('id',trx_id,'total_amount',total,'created_at',timestamp_now,'payment_method',p_payment,'items',items_json);
END $checkout$;
REVOKE ALL ON FUNCTION public.checkout_branch(uuid,uuid,jsonb,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_branch(uuid,uuid,jsonb,text,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.start_branch_shift(p_branch_id uuid,p_user_id uuid)
RETURNS public.shifts LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $shift$
DECLARE actor public.app_users; result public.shifts;
BEGIN
 SELECT * INTO actor FROM public.app_users WHERE id=p_user_id AND is_active FOR SHARE;
 IF NOT FOUND OR (actor.role<>'super_admin' AND actor.branch_id IS DISTINCT FROM p_branch_id) OR NOT EXISTS(SELECT FROM public.branches WHERE id=p_branch_id AND is_active) THEN RAISE EXCEPTION 'Akses cabang ditolak'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text||p_branch_id::text,1));
 SELECT * INTO result FROM public.shifts WHERE user_id=p_user_id AND branch_id=p_branch_id AND status='ACTIVE' ORDER BY start_time DESC LIMIT 1;
 IF NOT FOUND THEN INSERT INTO public.shifts(branch_id,user_id,user_name,status) VALUES(p_branch_id,p_user_id,actor.name,'ACTIVE') RETURNING * INTO result; END IF;
 RETURN result;
END $shift$;
REVOKE ALL ON FUNCTION public.start_branch_shift(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.start_branch_shift(uuid,uuid) TO service_role;
-- New projects may not grant custom-table access to the backend role by default.
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
