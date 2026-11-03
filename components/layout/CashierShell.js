"use client";
import Link from 'next/link';
import { Store, ShieldCheck } from 'lucide-react';
import BottomNav from './BottomNav';

export default function CashierShell({ context, session, children }) {
  const actor = context?.actor || session?.user;
  const branch = context?.operationalBranch;
  return <div className="cashier-stage">
    <div className="cashier-app">
      <header className="cashier-app-header">
        <Link href="/" className="cashier-app-brand" aria-label="Beranda kasir Waled">
          <img src="/logo.svg" alt="" width="40" height="40"/>
          <span>DIMSUM MENTAI<strong>WALED PREMIUM</strong></span>
        </Link>
        <Link href="/settings" className="cashier-profile" aria-label="Buka akun kasir">{(actor?.name || 'K').slice(0,2).toUpperCase()}</Link>
      </header>
      <div className="cashier-branch-strip"><span><Store size={13}/>{branch?.name || 'Memuat cabang…'}</span><span><ShieldCheck size={12}/>Kasir cabang</span></div>
      <div className="cashier-content">{children}</div>
      <BottomNav standalone />
    </div>
  </div>;
}
