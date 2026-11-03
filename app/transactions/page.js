"use client";
import { useState, useEffect } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { getRecentTransactions, getStoreSettings } from "@/lib/actions";
import { printToRawBT } from "@/lib/utils";
import { Loader2, Receipt, Printer, X, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/layout/BottomNav";
import { useSession } from "next-auth/react";

export default function TransactionsPage() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Settings State for Receipt
  const [storeSettings, setStoreSettings] = useState({
    storeName: "DIMSUM MENTAI WALED PREMIUM",
    storeAddress: "Alamat cabang",
    storePhone: "08123456789"
  });

  // Receipt Modal State
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  useEffect(() => {
    fetchTransactions();
    
    // Load settings for receipt printing
    getStoreSettings().then(settings => setStoreSettings({
      storeName: settings.store_name + ' · ' + settings.branch_name,
      storeAddress: settings.store_address,
      storePhone: settings.store_phone
    })).catch(() => {});
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const data = await getRecentTransactions();
      setTransactions(data || []);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handlePrint = () => {
    printToRawBT(receiptData, storeSettings, true);
  };

  const openReceipt = (trx) => {
    // Format the transaction data to match the expected receiptData structure
    const formattedData = {
      items: trx.transaction_items.map(item => ({
        name: item.product_name || item.products?.name || "Produk terdahulu",
        quantity: item.quantity,
        price: item.price
      })),
      total: trx.total_amount,
      paymentMethod: trx.payment_method,
      date: new Date(trx.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
      receiptId: trx.id.split('-')[0].toUpperCase(), // Short ID
      cashier: session?.user?.name || "Kasir"
    };
    
    setReceiptData(formattedData);
    setShowReceipt(true);
  };

  const filteredTransactions = transactions.filter(t => 
    t.id.toLowerCase().includes(search.toLowerCase()) || 
    t.payment_method.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl mx-auto min-h-screen bg-slate-50 pb-24 relative font-sans">
      <PageHeader title="Riwayat Transaksi" />
      
      <div className="p-4 flex flex-col gap-4 mt-2 max-w-3xl mx-auto">
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40" size={18} />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari ID transaksi atau metode pembayaran..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-navy focus:outline-none focus:border-icy shadow-sm"
          />
        </div>

        {/* Transaction List */}
        <div className="flex flex-col gap-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={32} className="animate-spin text-icy opacity-50" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 font-semibold text-sm shadow-sm">
              Tidak ada transaksi ditemukan.
            </div>
          ) : (
            filteredTransactions.map((trx) => (
              <div key={trx.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">ID: {trx.id.split('-')[0].toUpperCase()}</div>
                      <div className="font-bold text-navy text-sm">
                        {new Date(trx.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </div>
                    <div className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                      {trx.payment_method}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-end mt-3">
                    <div className="text-xs text-slate-500 font-semibold">
                      {trx.transaction_items?.length || 0} Item
                    </div>
                    <div className="text-base font-extrabold text-icy">
                      Rp {Number(trx.total_amount).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
                
                <div className="ml-4 pl-4 border-l border-slate-100 flex items-center">
                  <button 
                    onClick={() => openReceipt(trx)}
                    className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center hover:bg-orange-100 transition-colors shadow-sm cursor-pointer"
                  >
                    <Receipt size={24} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Receipt Preview Modal */}
      <AnimatePresence>
        {showReceipt && receiptData && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReceipt(false)}
              className="fixed inset-0 bg-navy/80 backdrop-blur-sm z-[60] w-full max-w-7xl mx-auto flex items-center justify-center p-4"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm z-[70] flex flex-col gap-4"
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
                  <p className="text-[10px] font-mono text-gray-600 mt-1">Struk Dicetak Ulang (Reprint)</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 px-4">
                <button 
                  onClick={() => setShowReceipt(false)}
                  className="flex-1 bg-white text-navy font-extrabold rounded-xl py-4 border border-slate-200 hover:bg-slate-50 transition-colors shadow-lg cursor-pointer"
                >
                  Tutup
                </button>
                <button 
                  onClick={handlePrint}
                  className="flex-[2] bg-icy text-white font-extrabold rounded-xl py-4 flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors shadow-lg shadow-icy/30 cursor-pointer"
                >
                  <Printer size={18} /> Cetak Ulang
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
