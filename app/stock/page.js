"use client";
import { useState, useEffect } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { getProducts, updateProductStock } from "@/lib/actions";
import { Search, Loader2, Package, ArrowDownToLine, ArrowUpFromLine, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useSession } from 'next-auth/react';

export default function StockPage() {
  const {data: session} = useSession();
  const canAdjust = session?.user?.role === 'super_admin';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modal State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // getProducts fetches all products including 0 stock
      const data = await getProducts();
      setProducts(data || []);
    } catch (error) {
      toast.error("Gagal memuat produk");
      console.error(error);
    }
    setLoading(false);
  };

  const handleUpdateStock = async (type) => {
    if (!selectedProduct) return;
    
    const amount = parseInt(adjustmentAmount);
    if (!amount || amount <= 0) {
      return toast.error("Masukkan jumlah yang valid (minimal 1)");
    }

    let newStock = selectedProduct.stock;
    if (type === 'IN') {
      newStock += amount;
    } else if (type === 'OUT') {
      if (amount > selectedProduct.stock) {
        return toast.error("Stok keluar tidak boleh melebihi sisa stok!");
      }
      newStock -= amount;
    }

    setIsUpdating(true);
    try {
      await updateProductStock(selectedProduct.id, newStock, selectedProduct.stock);
      
      // Update local state
      setProducts(prev => prev.map(p => 
        p.id === selectedProduct.id ? { ...p, stock: newStock } : p
      ));
      
      toast.success(type === 'IN' ? `Berhasil menambah ${amount} stok!` : `Berhasil mengurangi ${amount} stok!`);
      closeModal();
    } catch (error) {
      toast.error("Gagal memperbarui stok");
      console.error(error);
    }
    setIsUpdating(false);
  };

  const openModal = (product) => {
    if (!canAdjust) return;
    setSelectedProduct(product);
    setAdjustmentAmount("");
  };

  const closeModal = () => {
    setSelectedProduct(null);
    setAdjustmentAmount("");
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-white pb-20 w-full max-w-7xl mx-auto relative">
      <PageHeader title={canAdjust ? 'Keluar Masuk Barang' : 'Persediaan cabang'} />
      
      <div className="p-4 flex flex-col gap-4">
        {/* Banner Alert */}
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col gap-1">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">{canAdjust ? 'Area Khusus Gudang' : 'Cek stok sebelum melayani'}</p>
          <p className="text-sm font-medium text-amber-600 leading-tight">{canAdjust ? 'Halaman ini khusus untuk mengatur stok fisik masuk (dari supplier) atau keluar (barang rusak). Perubahan harga/nama hanya bisa di menu Produk.' : 'Lihat ketersediaan produk di cabang Anda. Hubungi admin utama jika jumlah fisik berbeda atau stok perlu ditambahkan.'}</p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40" size={18} />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={canAdjust ? "Cari produk untuk menyesuaikan stok..." : "Cari persediaan produk..."}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-navy focus:outline-none focus:border-icy shadow-sm font-semibold"
          />
        </div>

        {/* Product Grid */}
        <div className="flex flex-col gap-2">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 size={32} className="animate-spin text-icy opacity-50" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center p-8 text-sm text-slate-500 font-semibold bg-slate-50 rounded-2xl border border-slate-100">
              Tidak ada produk ditemukan.
            </div>
          ) : (
            filteredProducts.map(prod => (
              <motion.button 
                whileTap={canAdjust ? { scale: 0.98 } : undefined}
                aria-disabled={!canAdjust}
                tabIndex={canAdjust ? 0 : -1}
                key={prod.id} 
                onClick={() => openModal(prod)}
                className="w-full bg-white border border-slate-100 p-4 rounded-xl flex items-center gap-4 shadow-sm text-left relative overflow-hidden group cursor-pointer hover:border-icy/30 hover:shadow-md transition-all"
              >
                {prod.image_url ? (
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden">
                    <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-icy/10 rounded-xl flex items-center justify-center text-icy font-bold text-xl shrink-0">
                    <Package size={20} />
                  </div>
                )}
                
                <div className="flex-1">
                  <div className="font-bold text-navy text-sm leading-tight mb-1">
                    {prod.name}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`text-xs font-bold px-2 py-0.5 rounded-md ${prod.stock > 10 ? 'bg-emerald-100 text-emerald-700' : prod.stock > 0 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                      Sisa Stok: {prod.stock}
                    </div>
                  </div>
                </div>
                
                {canAdjust && <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-icy group-hover:text-white group-hover:border-icy transition-colors shrink-0">
                  <ArrowDownToLine size={14} strokeWidth={3} />
                </div>}
              </motion.button>
            ))
          )}
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-50 w-full max-w-7xl mx-auto"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 w-full max-w-7xl mx-auto bg-white p-6 rounded-t-[2rem] z-50 flex flex-col gap-6"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-extrabold text-navy text-xl leading-tight">Update Stok</h3>
                  <p className="text-sm font-semibold text-slate-500 mt-1">{selectedProduct.name}</p>
                </div>
                <button onClick={closeModal} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-navy/60 hover:bg-slate-200 transition-colors cursor-pointer shrink-0">
                  <X size={18} />
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex justify-between items-center">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Stok Saat Ini</span>
                <span className="text-3xl font-extrabold text-navy">{selectedProduct.stock}</span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Jumlah Penyesuaian</label>
                <input 
                  type="number" 
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  placeholder="Contoh: 50" 
                  min="1"
                  autoFocus
                  className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-4 text-2xl text-center text-navy focus:outline-none focus:border-icy font-extrabold shadow-inner"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <button 
                  onClick={() => handleUpdateStock('IN')}
                  disabled={isUpdating || !adjustmentAmount}
                  className="p-4 rounded-2xl flex flex-col items-center gap-2 border-2 border-emerald-100 bg-emerald-50 hover:bg-emerald-100 transition-all cursor-pointer disabled:opacity-50 group"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 group-active:scale-95 transition-transform">
                    {isUpdating ? <Loader2 size={24} className="animate-spin" /> : <ArrowDownToLine size={24} />}
                  </div>
                  <div className="text-center">
                    <span className="block font-bold text-emerald-700 text-sm">STOK MASUK</span>
                    <span className="block text-[10px] font-semibold text-emerald-600/70 mt-0.5">Barang Datang</span>
                  </div>
                </button>
                
                <button 
                  onClick={() => handleUpdateStock('OUT')}
                  disabled={isUpdating || !adjustmentAmount}
                  className="p-4 rounded-2xl flex flex-col items-center gap-2 border-2 border-rose-100 bg-rose-50 hover:bg-rose-100 transition-all cursor-pointer disabled:opacity-50 group"
                >
                  <div className="w-12 h-12 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 group-active:scale-95 transition-transform">
                    {isUpdating ? <Loader2 size={24} className="animate-spin" /> : <ArrowUpFromLine size={24} />}
                  </div>
                  <div className="text-center">
                    <span className="block font-bold text-rose-700 text-sm">STOK KELUAR</span>
                    <span className="block text-[10px] font-semibold text-rose-600/70 mt-0.5">Rusak / Hilang</span>
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
