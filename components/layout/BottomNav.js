"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Home, Boxes, ScanLine, ReceiptText, UserRound } from 'lucide-react';

const items = [
  ['/', 'Beranda', Home], ['/stock', 'Stok', Boxes], ['/pos', 'Kasir', ScanLine],
  ['/transactions', 'Riwayat', ReceiptText], ['/settings', 'Akun', UserRound],
];
export default function BottomNav({ standalone = false }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  if (!standalone || session?.user?.role !== 'karyawan') return null;
  return <nav className="cashier-bottom-nav" aria-label="Navigasi kasir">
    {items.map(([href, label, Icon]) => <Link key={href} href={href}
      aria-current={pathname === href ? 'page' : undefined}
      className={`cashier-tab ${pathname === href ? 'is-active' : ''} ${href === '/pos' ? 'cashier-tab-main' : ''}`}>
      <span><Icon size={21} strokeWidth={pathname === href ? 2.3 : 1.8}/></span><small>{label}</small>
    </Link>)}
  </nav>;
}
