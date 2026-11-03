"use client";
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScanLine, Boxes, ReceiptText, UsersRound, Wallet, UserRound, ArrowUpRight, ArrowRight, RefreshCw, Clock3, Fingerprint, LogOut, Loader2, Package, Check, TriangleAlert } from 'lucide-react';
import { getCashierHomeData, startShift, endShift } from '@/lib/actions';
import { useAttendance } from '@/components/providers/AttendanceProvider';
import ConfirmModal from '@/components/ui/ConfirmModal';
import finance from '@/lib/finance.cjs';
import toast from 'react-hot-toast';

const shortcuts = [
  ['/pos','Buka kasir',ScanLine,'orange'], ['/stock','Cek stok',Boxes,'green'],
  ['/transactions','Transaksi',ReceiptText,'blue'], ['/customers','Pelanggan',UsersRound,'purple'],
  ['/expenses','Operasional',Wallet,'pink'], ['/settings','Akun saya',UserRound,'brown'],
];
export default function CashierHome() {
  const router = useRouter();
  const { checkShift } = useAttendance() || {};
  const [data,setData] = useState(null), [loading,setLoading] = useState(true), [error,setError] = useState(false);
  const [shiftBusy,setShiftBusy] = useState(false), [confirmEnd,setConfirmEnd] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try { setData(await getCashierHomeData()); } catch { setError(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  async function begin() {
    if (shiftBusy) return;
    setShiftBusy(true);
    try { await startShift(); toast.success('Shift dimulai. Selamat melayani!'); await checkShift?.(); router.push('/pos'); }
    catch(e) { toast.error(e.message); } finally { setShiftBusy(false); }
  }
  async function finish() {
    setShiftBusy(true);
    try { await endShift(data.shift.id); setConfirmEnd(false); toast.success('Shift selesai. Terima kasih sudah bekerja!'); await checkShift?.(); await load(); }
    catch(e) { toast.error(e.message); } finally { setShiftBusy(false); }
  }
  if (!data && loading) return <div className="cashier-loading"><Loader2 className="animate-spin" size={24}/><p>Menyiapkan beranda kasir…</p></div>;
  if (error) return <div className="error-card"><strong>Beranda belum bisa dimuat.</strong><p>Coba periksa koneksi lalu muat ulang.</p><button className="btn-secondary" onClick={load}>Coba lagi</button></div>;
  if (!data) return null;
  const date = new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',timeZone:'Asia/Jakarta'});
  return <main className="cashier-home" aria-busy={loading}>
    <section className="cashier-greeting"><div><p>Selamat datang kembali 👋</p><h1>Halo, {data.actor.name}!</h1><span>{date}</span></div><button className="cashier-refresh" aria-label="Perbarui ringkasan kasir" disabled={loading} onClick={load}><RefreshCw size={17} className={loading?'animate-spin':''}/></button></section>
    <section className="cashier-welcome-card">
      <div className="cashier-welcome-copy"><span className="cashier-card-kicker">DIBUAT DENGAN HATI, DISAJIKAN HANGAT.</span><h2>Siap melayani<br/><em>senyum berikutnya?</em></h2><p>Pesanan rapi. Pelanggan happy.</p></div><img src="/logo.svg" className="cashier-welcome-logo" alt="" width="100" height="100"/>
      {data.shift?<Link href="/pos" className="cashier-start-button"><ScanLine size={20}/>Buka kasir<ArrowRight size={18}/></Link>:<button className="cashier-start-button" disabled={shiftBusy} onClick={begin}>{shiftBusy?<Loader2 size={19} className="animate-spin"/>:<Fingerprint size={20}/>}Mulai shift & buka kasir<ArrowRight size={18}/></button>}
    </section>
    <section className={`cashier-shift-card ${data.shift?'shift-is-active':''}`}><span className="cashier-shift-icon">{data.shift?<Check size={18}/>:<Clock3 size={18}/>}</span><div><strong>{data.shift?'Shift sedang berjalan':'Belum absen masuk'}</strong><p>{data.shift?'Mulai '+new Date(data.shift.start_time).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'})+' WIB':'Mulai shift sebelum menerima pesanan.'}</p></div>{data.shift&&<button onClick={()=>setConfirmEnd(true)} aria-label="Akhiri shift" disabled={shiftBusy}><LogOut size={17}/></button>}</section>
    <section><div className="cashier-section-title"><h2>Ringkasan hari ini</h2><span>Khusus {data.branch.name}</span></div><div className="cashier-today-grid">
      {[['Penjualan',finance.rupiah(data.revenue),Wallet,'orange'],['Transaksi',data.transactionCount+' pesanan',ReceiptText,'green'],['Operasional',finance.rupiah(data.expenses),ArrowUpRight,'pink'],['Stok menipis',data.lowStockCount+' produk',Boxes,'brown']].map(([label,value,Icon,color])=><article className="cashier-stat" key={label}><span className={`cashier-small-icon tone-${color}`}><Icon size={17}/></span><span className="cashier-stat-label">{label}</span><strong>{value}</strong></article>)}
    </div></section>
    <section><div className="cashier-section-title"><h2>Mau lakukan apa?</h2><span>Menu cabang</span></div><div className="cashier-shortcuts">{shortcuts.map(([href,label,Icon,color])=><Link href={href} key={href}><span className={`tone-${color}`}><Icon size={24} strokeWidth={1.7}/></span><strong>{label}</strong></Link>)}</div></section>
    {data.lowStock.length>0&&<section className="cashier-stock-warning"><div className="cashier-section-title"><h2><TriangleAlert size={15}/>Perlu dicek, nih</h2><Link href="/stock">Lihat stok<ArrowRight size={12}/></Link></div>{data.lowStock.map(p=><div key={p.id} className="cashier-stock-row"><span><Package size={16}/></span><strong>{p.name}</strong><small>{p.stock===0?'Habis':`Sisa ${p.stock}`}</small></div>)}</section>}
    <section className="cashier-recent"><div className="cashier-section-title"><h2>Transaksi terbaru</h2><Link href="/transactions">Lihat semua<ArrowRight size={12}/></Link></div>{data.recentTransactions.length?data.recentTransactions.map(t=><Link href="/transactions" key={t.id} className="cashier-recent-row"><span className="cashier-receipt-icon"><ReceiptText size={19}/></span><div><strong>#{t.id.slice(0,8).toUpperCase()}</strong><small>{new Date(t.created_at).toLocaleDateString('id-ID',{day:'numeric',month:'short',timeZone:'Asia/Jakarta'})} · {t.payment_method}</small></div><strong>{finance.rupiah(t.total_amount)}</strong><span className="cashier-sale-status"><Check size={10}/></span></Link>):<div className="cashier-empty"><ReceiptText size={26}/><strong>Pesanan pertama menanti.</strong><p>Transaksi yang selesai akan muncul di sini.</p></div>}</section>
    <p className="cashier-home-footer">Satu tim. Satu rasa. Sepenuh hati.</p>
    <ConfirmModal isOpen={confirmEnd} onClose={()=>!shiftBusy&&setConfirmEnd(false)} onConfirm={finish} isLoading={shiftBusy} title="Selesaikan shift sekarang?" message="Pastikan pesanan dan pencatatan operasional sudah selesai sebelum mengakhiri shift."/>
  </main>;
}
