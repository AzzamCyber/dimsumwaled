"use client";
import { useState, useEffect } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { getPurchases, addPurchase, getSuppliers, deletePurchase } from "@/lib/actions";
import { Plus, Trash2, Loader2, ArrowUpRight } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import CustomSelect from "@/components/ui/CustomSelect";

export default function PurchasesPage() {
  const [dataList, setDataList] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [supplierId, setSupplierId] = useState("");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const pData = await getPurchases();
      const sData = await getSuppliers();
      setDataList(pData || []);
      setSuppliers(sData || []);
    } catch (error) {
      toast.error("Gagal memuat catatan pembelian");
      console.error(error);
    }
    setLoading(false);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!amount) return;
    setIsSubmitting(true);
    
    try {
      const newData = await addPurchase({
        supplier_id: supplierId || null,
        total_amount: parseFloat(amount),
        status: 'COMPLETED'
      });
      if (newData) {
        setDataList([newData, ...dataList]);
        setAmount(""); setSupplierId("");
        toast.success("Pembelian berhasil dicatat!");
      }
    } catch (error) {
      toast.error("Gagal mencatat pembelian");
      console.error(error);
    }
    setIsSubmitting(false);
  };

  const openDeleteModal = (id) => {
    setDeleteId(id);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deletePurchase(deleteId);
      setDataList(dataList.filter(item => item.id !== deleteId));
      toast.success("Catatan pembelian dihapus!");
      setIsModalOpen(false);
    } catch (error) {
      toast.error("Gagal menghapus catatan pembelian");
      console.error(error);
    }
    setIsDeleting(false);
    setDeleteId(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto min-h-screen bg-white pb-20 relative">
      <PageHeader title="Pembelian Barang" />
      
      <div className="p-4 flex flex-col gap-6 mt-2 max-w-3xl mx-auto">
        
        {/* Form Tambah */}
        <div className="bg-slate-50 border border-slate-200 shadow-sm p-5 rounded-2xl">
          <h3 className="font-bold text-navy mb-3 text-sm flex items-center gap-2">
            <ArrowUpRight size={18} className="text-icy" /> Catat Restock / Pembelian
          </h3>
          <form onSubmit={handleAdd} className="flex flex-col gap-3">
            <CustomSelect 
              value={supplierId} 
              onChange={setSupplierId}
              options={suppliers.map(s => ({ value: s.id, label: s.name }))}
              placeholder="-- Pilih Supplier (Opsional) --"
            />
            <div className="flex gap-2">
              <input 
                type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="Total Pembelian (Rp)" required min="0"
                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-icy focus:outline-none font-semibold text-navy"
              />
              <button 
                type="submit" disabled={isSubmitting}
                className="w-14 bg-icy text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-icy/30 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              </button>
            </div>
          </form>
        </div>

        {/* List Data */}
        <div>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-1 mb-3">Riwayat Pembelian</h3>
          <div className="flex flex-col gap-3">
            {loading ? (
              <div className="flex justify-center p-10"><Loader2 className="animate-spin text-icy" size={32} /></div>
            ) : dataList.length === 0 ? (
              <div className="text-center p-8 text-sm text-slate-500 font-semibold bg-slate-50 rounded-2xl border border-slate-100">Belum ada pembelian.</div>
            ) : (
              dataList.map((item) => (
                <div key={item.id} className="bg-white border border-slate-100 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                  <div>
                    <div className="font-bold text-navy text-sm">
                      {item.suppliers?.name || "Supplier Umum"}
                    </div>
                    <div className="text-xs text-slate-500 font-semibold mt-1">
                      {new Date(item.created_at).toLocaleDateString('id-ID', { dateStyle: 'long' })}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-extrabold text-icy">
                      Rp {item.total_amount.toLocaleString('id-ID')}
                    </div>
                    <button onClick={() => openDeleteModal(item.id)} className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center cursor-pointer hover:bg-red-100 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      <ConfirmModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        title="Hapus Pembelian"
        message="Yakin ingin menghapus riwayat pembelian ini?"
      />
    </div>
  );
}
