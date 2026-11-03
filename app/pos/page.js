"use client";
import { useState, useEffect, useRef } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { getAvailableProducts, processCheckout, toggleFavoriteProduct, getStoreSettings } from "@/lib/actions";
import { printToRawBT } from "@/lib/utils";
import { ShoppingCart, Plus, Minus, Search, Loader2, CheckCircle2, Wallet, QrCode, X, Printer, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";

export default function POSPage() {
  const { data: session } = useSession();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // "all" | "favorites"
  const [cart, setCart] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const checkoutRequest = useRef(null);
  const [success, setSuccess] = useState(false);
  
  // Checkout Modal State
  const [showModal, setShowModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  // Receipt Modal State
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // Settings State
  const [storeSettings, setStoreSettings] = useState({
    storeName: "DIMSUM MENTAI WALED PREMIUM",
    storeAddress: "Alamat cabang",
    storePhone: "08123456789"
  });

  useEffect(() => {
    fetchProducts();
    
    // Load settings
    getStoreSettings().then(settings => setStoreSettings({
      storeName: settings.store_name + ' · ' + settings.branch_name,
      storeAddress: settings.store_address,
      storePhone: settings.store_phone
    })).catch(() => toast.error('Informasi cabang belum dapat dimuat.'));
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await getAvailableProducts();
      setProducts(data || []);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleToggleFavorite = async (e, id, currentStatus) => {
    e.stopPropagation(); // Prevent adding to cart
    
    // Optimistic update
    setProducts(prev => prev.map(p => 
      p.id === id ? { ...p, is_favorite: !currentStatus } : p
    ));
    
    try {
      await toggleFavoriteProduct(id, currentStatus);
    } catch (error) {
      toast.error("Gagal memperbarui status favorit");
      // Revert if failed
      setProducts(prev => prev.map(p => 
        p.id === id ? { ...p, is_favorite: currentStatus } : p
      ));
    }
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev; 
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        if (newQ > item.stock) return item;
        return { ...item, quantity: newQ };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0 || isProcessing) return;
    setIsProcessing(true);

    try {
      const signature = JSON.stringify({ items: cart.map(i => [i.id, i.quantity]), paymentMethod });
      if (checkoutRequest.current?.signature !== signature) checkoutRequest.current = { signature, key: crypto.randomUUID() };
      const sale = await processCheckout(cart, total, paymentMethod, checkoutRequest.current.key);
      checkoutRequest.current = null;
      
      // Save data for receipt before clearing cart
      setReceiptData({
        items: sale.items,
        total: sale.total_amount,
        paymentMethod: sale.payment_method,
        date: new Date(sale.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Jakarta' }),
        receiptId: sale.id.slice(0,8).toUpperCase(),
        cashier: session?.user?.name || "Kasir"
      });
      
      setSuccess(true);
      setCart([]);
      setShowModal(false);
      fetchProducts(); // Refresh stock
      
      // Show receipt modal after a short delay to allow background to clear
      setTimeout(() => {
        setShowReceipt(true);
        setSuccess(false);
      }, 500);

      toast.success("Transaksi Berhasil!");
    } catch (error) {
      toast.error(error.message || "Gagal memproses transaksi!");
      console.error(error);
    }
    setIsProcessing(false);
  };

  const handlePrint = () => {
    printToRawBT(receiptData, storeSettings, false);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    if (activeTab === "favorites") {
      return matchesSearch && p.is_favorite;
    }
    return matchesSearch;
  });

  return (
    <div className="pos-page min-h-screen bg-background pb-[22rem] md:pb-0 w-full max-w-7xl mx-auto relative flex flex-col md:flex-row">
      
      {/* LEFT SIDE: Main Content */}
      <div className="flex-1 w-full flex flex-col min-w-0">
        <PageHeader title="Kasir (POS)" />
        
        <div className="p-4 flex flex-col gap-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40" size={18} />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-navy focus:outline-none focus:border-icy shadow-sm"
            />
          </div>

          {/* Tab Filters */}
          <div className="flex gap-2 mb-2">
            <button 
              onClick={() => setActiveTab("all")}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer ${activeTab === 'all' ? 'bg-navy text-white shadow-md shadow-navy/20' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
            >
              Semua Produk
            </button>
            <button 
              onClick={() => setActiveTab("favorites")}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'favorites' ? 'bg-amber-100 text-amber-700 border border-amber-300 shadow-md shadow-amber-500/20' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
            >
              <Star size={16} className={activeTab === 'favorites' ? 'fill-amber-500 text-amber-500' : ''} /> Favorit
            </button>
          </div>

          {/* Product Grid */}
          <div className="pos-products grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {loading ? (
              <div className="flex justify-center p-8 col-span-full">
                <Loader2 size={32} className="animate-spin text-icy opacity-50" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center p-8 text-sm text-navy/50 col-span-full">
                Tidak ada produk ditemukan.
              </div>
            ) : (
              filteredProducts.map(prod => (
                <motion.div 
                  whileTap={{ scale: 0.98 }}
                  key={prod.id} 
                  onClick={() => addToCart(prod)}
                  className="pos-product w-full bg-white border border-slate-100 p-4 rounded-xl flex items-center md:flex-col md:items-start gap-4 md:gap-3 shadow-sm text-left relative overflow-hidden group cursor-pointer"
                >
                  {prod.image_url ? (
                    <div className="pos-product-media w-14 h-14 md:w-full md:aspect-square md:h-auto rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden">
                      <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ) : (
                    <div className="pos-product-media w-14 h-14 md:w-full md:aspect-square md:h-auto bg-icy/10 rounded-lg flex items-center justify-center text-icy font-bold text-xl shrink-0">
                      {prod.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 w-full">
                    <div className="pos-product-name font-bold text-navy text-sm line-clamp-1 md:line-clamp-2 md:min-h-[40px]">
                      {prod.name}
                    </div>
                    <div className="text-xs text-navy/50 font-medium mt-0.5">
                      Stok: {prod.stock}
                    </div>
                    <div className="text-sm font-extrabold text-icy mt-1">
                      Rp {prod.price.toLocaleString('id-ID')}
                    </div>
                  </div>
                  
                  <div className="pos-product-add-mobile w-8 h-8 rounded-full bg-navy/5 flex items-center justify-center text-navy hover:bg-icy hover:text-white transition-colors md:hidden">
                    <Plus size={16} strokeWidth={3} />
                  </div>

                  {/* Tablet Add Button (only visible on tablet inside the card) */}
                  <div className="pos-product-add hidden md:flex w-full bg-slate-50 text-slate-500 font-bold text-xs py-2 rounded-lg items-center justify-center gap-1 group-hover:bg-icy group-hover:text-white transition-colors">
                    <Plus size={14} /> Tambah
                  </div>

                  {/* Favorite Toggle Button */}
                  <button 
                    onClick={(e) => handleToggleFavorite(e, prod.id, prod.is_favorite)}
                    className={`absolute top-2 left-2 md:top-3 md:left-3 w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95 ${prod.is_favorite ? 'text-amber-500' : 'text-slate-300'}`}
                  >
                    <Star size={16} className={prod.is_favorite ? 'fill-amber-500' : ''} />
                  </button>

                  {/* Active Cart Indicator */}
                  {cart.find(c => c.id === prod.id) && (
                    <div className="absolute top-0 right-0 bg-icy text-white rounded-bl-xl px-3 py-1 flex items-center justify-center text-xs font-bold shadow-md">
                      {cart.find(c => c.id === prod.id).quantity} x
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Persistent Sidebar Cart (TABLET/DESKTOP ONLY) */}
      <div className="pos-sidebar hidden md:flex w-[320px] lg:w-[350px] bg-white border-l border-slate-200 sticky top-0 h-screen flex-col shadow-xl z-20 shrink-0">
        <div className="p-5 border-b border-slate-100 bg-white">
          <h2 className="font-extrabold text-navy text-lg flex items-center gap-2">
            <ShoppingCart size={20} className="text-icy" /> Pesanan Saat Ini
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">{totalItems} Item dipilih</p>
        </div>

        {/* Sidebar Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 flex flex-col gap-3">
          {cart.length === 0 ? (
            <div className="text-center py-10 text-slate-400 font-semibold text-sm flex flex-col items-center gap-2">
              <ShoppingCart size={32} className="opacity-20" />
              Keranjang masih kosong
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-white border border-slate-100 p-3 rounded-2xl shadow-sm">
                <div className="flex-1 min-w-0 mr-3">
                  <div className="text-sm font-bold text-navy truncate">{item.name}</div>
                  <div className="text-xs font-extrabold text-icy mt-0.5">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</div>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-100 p-1 shrink-0">
                  <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 flex items-center justify-center text-slate-600 bg-white rounded-lg shadow-sm cursor-pointer hover:text-rose-500 transition-colors"><Minus size={14} strokeWidth={3} /></button>
                  <span className="text-xs font-extrabold w-4 text-center text-navy">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 flex items-center justify-center text-slate-600 bg-white rounded-lg shadow-sm cursor-pointer hover:text-orange-500 transition-colors"><Plus size={14} strokeWidth={3} /></button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sidebar Checkout Summary */}
        <div className="p-5 bg-white border-t border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-bold text-slate-500">Total Tagihan</span>
            <span className="text-2xl font-black text-navy">Rp {total.toLocaleString('id-ID')}</span>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            disabled={cart.length === 0}
            className="w-full bg-icy text-white font-extrabold rounded-2xl py-4 flex items-center justify-center gap-2 shadow-xl shadow-icy/30 hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none cursor-pointer"
          >
            BAYAR SEKARANG
          </button>
        </div>
      </div>

      {/* Floating Cart & Checkout Button (MOBILE ONLY - UNTOUCHED) */}
      <div className="pos-mobile-cart md:hidden fixed bottom-0 left-0 right-0 w-full max-w-7xl mx-auto bg-white/95 backdrop-blur-xl border-t border-slate-200 p-4 pb-6 rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-30">
        <AnimatePresence>
          {success && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute -top-14 left-4 right-4 bg-emerald-500 text-white p-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-emerald-500/25"
            >
              <CheckCircle2 size={18} /> Transaksi Berhasil!
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <ShoppingCart size={24} className="text-navy" />
            <span className="font-extrabold text-navy">{totalItems} Item</span>
          </div>
          <div className="text-right">
            <div className="text-xs text-navy/60 font-bold uppercase tracking-wider">Total Tagihan</div>
            <div className="text-xl font-extrabold text-icy">Rp {total.toLocaleString('id-ID')}</div>
          </div>
        </div>

        {/* Mini Cart List */}
        {cart.length > 0 && (
          <div className="max-h-40 overflow-y-auto no-scrollbar flex flex-col gap-2 mb-4 border-t border-slate-100 pt-4">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                <div className="flex-1 min-w-0 mr-2">
                  <div className="text-sm font-bold text-navy truncate">{item.name}</div>
                  <div className="text-xs font-semibold text-navy/60 mt-0.5">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</div>
                </div>
                <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
                  <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-navy bg-slate-50 rounded-lg active:bg-slate-200 cursor-pointer hover:bg-slate-100"><Minus size={16} strokeWidth={3} /></button>
                  <span className="text-sm font-extrabold w-4 text-center text-navy">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-navy bg-slate-50 rounded-lg active:bg-slate-200 cursor-pointer hover:bg-slate-100"><Plus size={16} strokeWidth={3} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button 
          onClick={() => setShowModal(true)}
          disabled={cart.length === 0}
          className="w-full bg-icy text-white font-extrabold rounded-2xl py-4 flex items-center justify-center gap-2 shadow-xl shadow-icy/30 hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none cursor-pointer"
        >
          BAYAR SEKARANG
        </button>
      </div>

      {/* Checkout Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="pos-checkout-backdrop fixed inset-0 bg-navy/60 backdrop-blur-sm z-50 w-full"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="pos-checkout-sheet fixed bottom-0 left-0 right-0 w-full max-w-lg mx-auto md:max-w-md md:left-1/2 md:-translate-x-1/2 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-3xl bg-white p-6 rounded-t-[2rem] z-50 flex flex-col gap-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-navy text-xl">Konfirmasi Pembayaran</h3>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-navy/60 hover:bg-slate-200 transition-colors cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl text-center">
                <div className="text-sm font-bold text-navy/60 uppercase tracking-wider mb-1">Total Tagihan</div>
                <div className="text-3xl font-extrabold text-icy">Rp {total.toLocaleString('id-ID')}</div>
              </div>

              <div>
                <div className="text-sm font-bold text-navy mb-3">Pilih Metode Pembayaran:</div>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setPaymentMethod("CASH")}
                    className={`p-4 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all cursor-pointer ${paymentMethod === 'CASH' ? 'border-icy bg-icy/5' : 'border-slate-100 bg-transparent'}`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${paymentMethod === 'CASH' ? 'bg-icy text-white' : 'bg-slate-100 text-navy'}`}>
                      <Wallet size={24} />
                    </div>
                    <span className={`font-bold ${paymentMethod === 'CASH' ? 'text-icy' : 'text-navy/70'}`}>TUNAI (CASH)</span>
                  </button>
                  <button 
                    onClick={() => setPaymentMethod("QRIS")}
                    className={`p-4 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all cursor-pointer ${paymentMethod === 'QRIS' ? 'border-icy bg-icy/5' : 'border-slate-100 bg-transparent'}`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${paymentMethod === 'QRIS' ? 'bg-icy text-white' : 'bg-slate-100 text-navy'}`}>
                      <QrCode size={24} />
                    </div>
                    <span className={`font-bold ${paymentMethod === 'QRIS' ? 'text-icy' : 'text-navy/70'}`}>QRIS</span>
                  </button>
                </div>
              </div>

              <button 
                onClick={handleCheckout}
                disabled={isProcessing}
                className="w-full bg-icy text-white font-extrabold rounded-2xl py-4 flex items-center justify-center gap-2 shadow-xl shadow-icy/30 hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-50 mt-2 cursor-pointer"
              >
                {isProcessing ? <Loader2 size={24} className="animate-spin" /> : "PROSES TRANSAKSI"}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Receipt Preview Modal */}
      <AnimatePresence>
        {showReceipt && receiptData && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pos-receipt-backdrop fixed inset-0 bg-navy/80 backdrop-blur-sm z-[60] w-full flex items-center justify-center p-4"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="pos-receipt-sheet fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm z-[70] flex flex-col gap-4"
            >
              {/* This is the actual receipt content that will be printed */}
              <div id="receipt-content" className="bg-white p-6 rounded-2xl shadow-2xl mx-auto w-full max-w-[300px]">
                <div className="text-center mb-4 flex flex-col items-center">
                  <img src="/logo.png" alt="Logo" className="w-12 h-12 mb-2 object-contain grayscale" />
                  <h2 className="font-extrabold text-lg text-black uppercase">{storeSettings.storeName}</h2>
                  <p className="text-[10px] text-gray-600 font-mono mt-1">{storeSettings.storeAddress}</p>
                  <p className="text-[10px] text-gray-600 font-mono">Telp: {storeSettings.storePhone}</p>
                </div>
                
                <div className="border-t border-b border-dashed border-gray-300 py-2 mb-3">
                  <div className="flex justify-between text-[10px] font-mono text-gray-800">
                    <span>{receiptData.date}</span>
                    <span>{receiptData.receiptId}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-gray-800 mt-1">
                    <span>Kasir: {receiptData.cashier}</span>
                    <span>Metode: {receiptData.paymentMethod}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mb-3">
                  {receiptData.items.map((item, idx) => (
                    <div key={idx} className="flex flex-col">
                      <div className="text-[11px] font-bold text-black font-sans">{item.name}</div>
                      <div className="flex justify-between text-[11px] font-mono text-gray-800">
                        <span>{item.quantity} x {item.price.toLocaleString('id-ID')}</span>
                        <span>{(item.quantity * item.price).toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-gray-300 pt-2 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-black">TOTAL</span>
                    <span className="font-bold text-base text-black font-mono">Rp {receiptData.total.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-[10px] font-mono text-gray-600">Terima kasih atas kunjungan Anda!</p>
                  <p className="text-[10px] font-mono text-gray-600 mt-1">Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.</p>
                </div>
              </div>

              {/* Action Buttons (Not Printed due to @media print rules) */}
              <div className="flex gap-3 px-4">
                <button 
                  onClick={() => setShowReceipt(false)}
                  className="flex-1 bg-white text-navy font-extrabold rounded-xl py-4 border border-slate-200 hover:bg-slate-50 transition-colors shadow-lg cursor-pointer"
                >
                  Selesai
                </button>
                <button 
                  onClick={handlePrint}
                  className="flex-[2] bg-icy text-white font-extrabold rounded-xl py-4 flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors shadow-lg shadow-icy/30 cursor-pointer"
                >
                  <Printer size={18} /> Print Struk
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
