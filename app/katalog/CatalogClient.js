"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShoppingCart, Plus, Minus, X, Package, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function CatalogClient({ initialProducts = [], settings }) {
  const [products] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  // Cart operations
  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.qty >= product.stock) {
        return toast.error("Maksimal stok tercapai!");
      }
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
    toast.success(`${product.name} ditambahkan`, { icon: '🛒' });
  };

  const updateQty = (id, newQty) => {
    if (newQty <= 0) {
      setCart(cart.filter(item => item.id !== id));
      return;
    }
    const product = products.find(p => p.id === id);
    if (product && newQty > product.stock) {
      return toast.error("Maksimal stok tercapai!");
    }
    setCart(cart.map(item => item.id === id ? { ...item, qty: newQty } : item));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const handleWhatsAppCheckout = () => {
    if (cart.length === 0) return;

    if (!settings?.store_phone) return toast.error('Nomor pemesanan cabang belum tersedia.');
    let text = `Halo *${settings?.store_name || 'DIMSUM MENTAI WALED PREMIUM'}* (${settings?.branch_name || ''}), saya mau pesan:\n\n`;
    cart.forEach(item => {
      text += `▪️ ${item.qty}x ${item.name} - Rp ${(item.price * item.qty).toLocaleString('id-ID')}\n`;
    });
    text += `\n*Total: Rp ${cartTotal.toLocaleString('id-ID')}*\n\nMohon diinfokan total transfer beserta ongkirnya ya. Terima kasih!`;

    const encodedText = encodeURIComponent(text);
    const phone = settings.store_phone;
    
    // Create wa.me link
    const waUrl = `https://wa.me/${phone}?text=${encodedText}`;
    window.open(waUrl, "_blank");
    
    // Clear cart after redirect
    setCart([]);
    setIsCartOpen(false);
  };

  return (
    <div className="w-full max-w-7xl mx-auto bg-slate-50 min-h-screen relative pb-24 md:pb-0 shadow-2xl overflow-hidden flex flex-col md:flex-row">
      
      {/* LEFT SIDE: Main Content */}
      <div className="flex-1 w-full flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 bg-white/80 backdrop-blur-xl z-40 px-5 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-icy text-white rounded-2xl flex items-center justify-center font-extrabold text-xl shadow-lg shadow-icy/30 shrink-0">
              <img src="/logo.svg" alt="" className="w-full h-full rounded-2xl" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-navy tracking-tight line-clamp-1">
                {settings?.store_name || "Katalog Toko"}
              </h1>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Katalog {settings?.branch_name || 'cabang'}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari dimsum dan menu favorit Anda..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold text-navy focus:outline-none focus:border-icy focus:bg-white transition-colors"
            />
          </div>
        </header>

        {/* Product Grid */}
        <div className="p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-20 text-slate-400 font-semibold text-sm">
              Produk tidak ditemukan.
            </div>
          ) : (
            filteredProducts.map((product) => (
              <motion.div 
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => window.innerWidth < 768 && addToCart(product)}
                className="bg-white border border-slate-100 rounded-3xl p-3 flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative group cursor-pointer md:cursor-default"
              >
                {/* Product Image */}
                <div className="w-full aspect-square bg-slate-50 rounded-2xl mb-3 overflow-hidden border border-slate-100/50 flex items-center justify-center">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                  ) : (
                    <Package className="text-slate-300" size={32} />
                  )}
                </div>
                
                {/* Info */}
                <div className="flex flex-col flex-1 px-1">
                  <h3 className="text-xs font-extrabold text-navy leading-tight mb-1 line-clamp-2 min-h-[32px]">
                    {product.name}
                  </h3>
                  <div className="text-sm font-black text-icy mb-3">
                    Rp {product.price.toLocaleString('id-ID')}
                  </div>
                </div>

                {/* Add Button (Mobile styles applied conditionally, Tablet has distinct button) */}
                <button 
                  onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                  className="w-full bg-slate-50 hover:bg-icy text-slate-600 hover:text-white border border-slate-200 hover:border-icy py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Plus size={14} /> Tambah
                </button>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT SIDE: Persistent Sidebar Cart (TABLET/DESKTOP ONLY) */}
      <div className="hidden md:flex w-[350px] lg:w-[400px] bg-white border-l border-slate-200 sticky top-0 h-screen flex-col shadow-2xl z-20 shrink-0">
        <div className="p-5 border-b border-slate-100 bg-white">
          <h2 className="font-extrabold text-navy text-lg flex items-center gap-2">
            <ShoppingCart size={20} className="text-icy" /> Keranjang Belanja
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">{cartCount} Item dipilih</p>
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
              <div key={item.id} className="bg-white p-3 rounded-2xl flex items-center gap-3 border border-slate-100 shadow-sm">
                <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 shrink-0">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300"><Package size={20}/></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-navy truncate">{item.name}</div>
                  <div className="text-xs font-black text-icy mt-0.5">Rp {item.price.toLocaleString('id-ID')}</div>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100 shrink-0">
                  <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-slate-600 shadow-sm cursor-pointer hover:bg-rose-50 hover:text-rose-500 transition-colors"><Minus size={12} strokeWidth={3} /></button>
                  <span className="text-xs font-extrabold w-4 text-center text-navy">{item.qty}</span>
                  <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-slate-600 shadow-sm cursor-pointer hover:bg-orange-50 hover:text-orange-500 transition-colors"><Plus size={12} strokeWidth={3} /></button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sidebar Checkout Summary */}
        <div className="p-5 bg-white border-t border-slate-100 flex flex-col gap-4">
          <div className="flex justify-between items-center px-2">
            <span className="text-sm font-bold text-slate-500">Total Pembayaran</span>
            <span className="text-xl font-black text-navy">Rp {cartTotal.toLocaleString('id-ID')}</span>
          </div>
          <button 
            onClick={handleWhatsAppCheckout}
            disabled={cart.length === 0}
            className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-extrabold rounded-2xl py-4 flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/30 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none cursor-pointer"
          >
            <MessageCircle size={20} />
            Pesan via WhatsApp
          </button>
          <p className="text-[10px] text-center text-slate-400 font-medium px-4">
            Anda akan diarahkan ke WhatsApp untuk mengirim pesanan.
          </p>
        </div>
      </div>

      {/* Floating Cart Button (MOBILE ONLY) */}
      <AnimatePresence>
        {cartCount > 0 && !isCartOpen && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="md:hidden fixed bottom-6 left-0 right-0 px-5 z-40 max-w-lg mx-auto"
          >
            <button 
              onClick={() => setIsCartOpen(true)}
              className="w-full bg-navy text-white rounded-2xl p-4 flex items-center justify-between shadow-2xl shadow-navy/30 cursor-pointer hover:bg-navy/90 active:scale-95 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center relative">
                  <ShoppingCart size={18} />
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-icy text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-navy">
                    {cartCount}
                  </span>
                </div>
                <div className="text-left">
                  <div className="text-[10px] text-white/70 font-bold uppercase tracking-wider">Total Pesanan</div>
                  <div className="font-extrabold text-sm">Rp {cartTotal.toLocaleString('id-ID')}</div>
                </div>
              </div>
              <div className="bg-icy text-white text-xs font-extrabold px-4 py-2 rounded-xl">
                Lihat Keranjang
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Modal (MOBILE ONLY) */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="md:hidden fixed inset-0 bg-navy/60 backdrop-blur-sm z-50 max-w-lg mx-auto"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="md:hidden fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white rounded-t-[2rem] z-[60] flex flex-col max-h-[85vh] overflow-hidden shadow-[0_-20px_40px_rgba(0,0,0,0.2)]"
            >
              {/* Modal Header */}
              <div className="p-6 pb-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-icy/10 text-icy rounded-xl flex items-center justify-center">
                    <ShoppingCart size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-navy text-lg">Keranjang Anda</h3>
                    <p className="text-xs text-slate-500 font-medium">{cartCount} Item dipilih</p>
                  </div>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              {/* Cart Items */}
              <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 flex flex-col gap-3">
                {cart.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 font-semibold text-sm">
                    Keranjang masih kosong.
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="bg-white p-3 rounded-2xl flex items-center gap-3 border border-slate-100 shadow-sm">
                      <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 shrink-0">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300"><Package size={20}/></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-navy line-clamp-1">{item.name}</h4>
                        <div className="text-xs font-black text-icy mt-0.5">Rp {item.price.toLocaleString('id-ID')}</div>
                      </div>
                      
                      {/* Qty Controls */}
                      <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100 shrink-0">
                        <button 
                          onClick={() => updateQty(item.id, item.qty - 1)}
                          className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-slate-600 shadow-sm cursor-pointer hover:bg-rose-50 hover:text-rose-500 transition-colors"
                        >
                          <Minus size={12} strokeWidth={3} />
                        </button>
                        <span className="w-4 text-center text-xs font-extrabold text-navy">{item.qty}</span>
                        <button 
                          onClick={() => updateQty(item.id, item.qty + 1)}
                          className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-slate-600 shadow-sm cursor-pointer hover:bg-orange-50 hover:text-orange-500 transition-colors"
                        >
                          <Plus size={12} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Checkout Footer */}
              {cart.length > 0 && (
                <div className="p-6 bg-white border-t border-slate-100 flex flex-col gap-4">
                  <div className="flex justify-between items-center px-2">
                    <span className="text-sm font-bold text-slate-500">Total Pembayaran</span>
                    <span className="text-xl font-black text-navy">Rp {cartTotal.toLocaleString('id-ID')}</span>
                  </div>
                  <button 
                    onClick={handleWhatsAppCheckout}
                    className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-extrabold rounded-2xl py-4 flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/30 active:scale-95 transition-all cursor-pointer"
                  >
                    <MessageCircle size={20} />
                    Pesan via WhatsApp
                  </button>
                  <p className="text-[10px] text-center text-slate-400 font-medium px-4">
                    Anda akan diarahkan ke WhatsApp untuk mengirim detail pesanan ke toko.
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
