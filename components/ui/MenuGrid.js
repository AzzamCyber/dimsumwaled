"use client";
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSession } from "next-auth/react";
import { 
 Calculator, 
 Package, 
 LayoutGrid, 
 Boxes, 
 Users, 
 Truck, 
 Tags, 
 ShoppingCart, 
 Receipt, 
 BarChart3,
 ScrollText,
 ClipboardList
} from 'lucide-react';

const menuItems = [
 { name: 'Kasir', icon: Calculator, color: 'bg-navy text-white shadow-md shadow-navy/20', href: '/pos' },
 { name: 'Produk', icon: Package, color: 'bg-white text-navy shadow-sm border border-slate-100', href: '/products' },
 { name: 'Kategori', icon: LayoutGrid, color: 'bg-white text-navy shadow-sm border border-slate-100', href: '/categories' },
 { name: 'Stok', icon: Boxes, color: 'bg-white text-navy shadow-sm border border-slate-100', href: '/stock' },
 { name: 'Pelanggan', icon: Users, color: 'bg-white text-navy shadow-sm border border-slate-100', href: '/customers' },
 { name: 'Riwayat', icon: ScrollText, color: 'bg-white text-navy shadow-sm border border-slate-100', href: '/transactions' },
 { name: 'Supplier', icon: Truck, color: 'bg-white text-navy shadow-sm border border-slate-100', href: '/suppliers' },
 { name: 'Harga', icon: Tags, color: 'bg-white text-navy shadow-sm border border-slate-100', href: '/price-notes' },
 { name: 'Pembelian', icon: ShoppingCart, color: 'bg-icy text-white shadow-md shadow-icy/20', href: '/purchases' },
 { name: 'Pengeluaran', icon: Receipt, color: 'bg-white text-navy shadow-sm border border-slate-100', href: '/expenses' },
 { name: 'Laporan', icon: BarChart3, color: 'bg-white text-navy shadow-sm border border-slate-100', href: '/reports' },
 { name: 'Pegawai', icon: Users, color: 'bg-rose-50 text-rose-600 shadow-sm border border-rose-100', href: '/users' },
 { name: 'Aturan Shift', icon: ClipboardList, color: 'bg-orange-50 text-orange-600 shadow-sm border border-orange-100', href: '/shift-rules', adminOnly: true },
];

export default function MenuGrid() {
  const { data: session } = useSession();
  const role = session?.user?.role || "karyawan";

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  // Filter menus for KASIR role
  const displayedMenus = menuItems.filter(menu => {
    if (role !== "super_admin") {
      return ["/pos", "/stock", "/customers", "/transactions", "/expenses"].includes(menu.href); 
    }
    return true; // Admin sees everything
  });

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-4 gap-y-6 gap-x-2 py-4"
    >
      {displayedMenus.map((menu, idx) => (
        <motion.div key={idx} variants={item} className="flex flex-col items-center gap-2">
          <Link href={menu.href} className={`w-[3.25rem] h-[3.25rem] rounded-2xl flex items-center justify-center ${menu.color} shadow-sm active:scale-95 transition-transform`}>
            <menu.icon size={22} strokeWidth={1.5} />
          </Link>
          <span className="text-[10px] font-bold text-navy text-center leading-tight mt-1">
            {menu.name}
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
}
