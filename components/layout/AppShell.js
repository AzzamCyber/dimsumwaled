"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { LayoutDashboard, Store, ShoppingBag, Package, Boxes, ReceiptText, Users, Truck, Tags, ShoppingCart, Wallet, BarChart3, Settings2, LogOut, ChevronDown, ExternalLink, ShieldCheck, Menu, X, Loader2 } from 'lucide-react';
import { getBranchContext, selectBranch } from '@/lib/actions';
import toast from 'react-hot-toast';
import CashierShell from './CashierShell';

const sections = [
 { label: 'RINGKASAN', links: [['/', 'Dashboard', LayoutDashboard], ['/branches', 'Kelola cabang', Store, true]] },
 { label: 'OPERASIONAL', links: [['/pos', 'Kasir & pesanan', ShoppingBag], ['/products', 'Produk & menu', Package, true], ['/stock', 'Persediaan stok', Boxes], ['/transactions', 'Riwayat transaksi', ReceiptText], ['/expenses', 'Biaya operasional', Wallet], ['/customers', 'Pelanggan', Users]] },
 { label: 'MANAJEMEN', links: [['/reports', 'Analitik & laporan', BarChart3, true], ['/users', 'Tim & akses', ShieldCheck, true], ['/categories', 'Kategori', Tags, true], ['/suppliers', 'Supplier', Truck, true], ['/purchases', 'Pembelian', ShoppingCart, true], ['/settings', 'Pengaturan', Settings2]] },
];
export default function AppShell({ children }) {
 const pathname = usePathname();
 const { data: session, status } = useSession();
 const [context, setContext] = useState(null), [open, setOpen] = useState(false), [switching, setSwitching] = useState(false);
 const isPublic = pathname.startsWith('/katalog') || pathname.startsWith('/portal-karyawan') || pathname.startsWith('/download');
 useEffect(() => {
  if (status !== 'authenticated' || isPublic) return;
  let active = true;
  getBranchContext().then(data => { if (active) setContext(data); }).catch(() => { if (active) setContext(null); });
  return () => { active = false; };
 }, [status, isPublic]);
 useEffect(() => { setOpen(false); }, [pathname]);
 if (isPublic || status === 'unauthenticated') return children;
 if (status === 'loading') return <div className="loading-dashboard"><Loader2 size={20} className="animate-spin"/>Memuat akun…</div>;
 const actor = context?.actor || session?.user;
 const admin = actor?.role === 'super_admin';
 if (actor?.role === 'karyawan') return <CashierShell context={context} session={session}>{children}</CashierShell>;
 const aggregatePage = ['/', '/reports', '/branches', '/users', '/settings'].includes(pathname);
 const selection = aggregatePage ? context?.selected || 'all' : context?.operationalBranch?.id || '';
 const pageTitle = sections.flatMap(s => s.links).find(l => l[0] === pathname)?.[1] || 'Manajemen usaha';
 async function changeBranch(id) {
  setSwitching(true);
  try { await selectBranch(id); window.location.reload(); }
  catch (error) { toast.error(error.message); setSwitching(false); }
 }
 return <div className="app-shell">
  {open && <button aria-label="Tutup menu" className="sidebar-scrim" onClick={() => setOpen(false)} />}
  <aside className={`app-sidebar ${open ? 'is-open' : ''}`}>
   <Link href="/" className="sidebar-brand"><img src="/logo.svg" alt="" width="44" height="44" /><span>DIMSUM MENTAI<strong>WALED <i>PREMIUM</i></strong></span></Link>
   <button className="mobile-close" aria-label="Tutup menu" onClick={() => setOpen(false)}><X size={20}/></button>
   <div className="workspace-label"><span className="status-dot"/>{admin ? 'Pusat kendali bisnis' : context?.operationalBranch?.name || 'Area karyawan'}<span className="workspace-tag">POS</span></div>
   <nav aria-label="Navigasi utama" className="sidebar-nav">{sections.map(section => <div className="nav-section" key={section.label}>
    <p>{section.label}</p>{section.links.filter(l => !l[3] || admin).map(([href, label, Icon]) => <Link key={href} href={href} className={`nav-link ${pathname === href ? 'active' : ''}`}><Icon size={18} strokeWidth={1.8}/><span>{label}</span>{pathname === href && <span className="nav-active-dot"/>}</Link>)}
   </div>)}</nav>
   <div className="sidebar-bottom"><Link href="/katalog" target="_blank" className="catalog-link"><Store size={18}/><span>Lihat katalog online</span><ExternalLink size={14}/></Link>
    <div className="sidebar-user"><span className="user-avatar">{(actor?.name || 'W').slice(0,2).toUpperCase()}</span><span><strong>{actor?.name || 'Akun Waled'}</strong><small>{admin ? 'Admin utama' : 'Karyawan cabang'}</small></span><button aria-label="Keluar akun" onClick={() => signOut({callbackUrl:'/portal-karyawan'})}><LogOut size={17}/></button></div>
   </div>
  </aside>
  <div className="app-workspace"><header className="workspace-header">
   <div className="header-breadcrumb"><button className="mobile-menu" aria-label="Buka menu" onClick={() => setOpen(true)}><Menu size={22}/></button><span className="breadcrumb-brand">Workspace <span>/</span></span><strong>{pageTitle}</strong></div>
   <div className="header-tools"><span className="connection-label"><span className="status-dot"/> {context ? 'Terhubung' : 'Memuat akun'}</span>
    {admin && context ? <label className="branch-switcher"><Store size={16}/><select aria-label="Pilih cabang" value={selection} disabled={switching} onChange={e => changeBranch(e.target.value)}>{aggregatePage && <option value="all">Semua cabang</option>}{context.branches.filter(b => b.is_active).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>{switching ? <Loader2 size={14} className="animate-spin"/> : <ChevronDown size={14}/>}</label> : <span className="branch-badge"><Store size={14}/>{context?.operationalBranch?.name || 'Cabang'}</span>}
   </div>
  </header><div className="workspace-content">{children}</div><footer className="workspace-footer"><span>DIMSUM MENTAI WALED PREMIUM</span><span>Dibuat untuk usaha yang terus tumbuh.</span></footer></div>
 </div>;
}
