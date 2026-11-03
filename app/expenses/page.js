"use client";
import { useState, useEffect } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { getExpenses, addExpense, deleteExpense } from "@/lib/actions";
import { Plus, Trash2, Loader2, ArrowDownRight } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useSession } from 'next-auth/react';

export default function ExpensesPage() {
  const {data: session} = useSession();
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
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
      const data = await getExpenses();
      setDataList(data || []);
    } catch (error) {
      toast.error("Gagal memuat pengeluaran");
      console.error(error);
    }
    setLoading(false);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;
    setIsSubmitting(true);
    
    try {
      const newData = await addExpense({
        description,
        amount: parseFloat(amount),
        date
      });
      if (newData) {
        setDataList([newData, ...dataList]);
        setDescription(""); setAmount("");
        toast.success("Pengeluaran berhasil dicatat!");
      }
    } catch (error) {
      toast.error("Gagal mencatat pengeluaran");
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
      await deleteExpense(deleteId);
      setDataList(dataList.filter(item => item.id !== deleteId));
      toast.success("Catatan berhasil dihapus!");
      setIsModalOpen(false);
    } catch (error) {
      toast.error("Gagal menghapus catatan");
      console.error(error);
    }
    setIsDeleting(false);
    setDeleteId(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto min-h-screen bg-white pb-20 relative">
      <PageHeader title="Pengeluaran" />
      
      <div className="p-4 flex flex-col gap-6 mt-2 max-w-3xl mx-auto">
        
        {/* Form Tambah */}
        <div className="bg-slate-50 border border-slate-200 shadow-sm p-5 rounded-2xl">
          <h3 className="font-bold text-navy mb-3 text-sm flex items-center gap-2">
            <ArrowDownRight size={18} className="text-rose-500" /> 
            Catat Pengeluaran Baru
          </h3>
          <form onSubmit={handleAdd} className="flex flex-col gap-3">
            <input 
              type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi (ex: Listrik, Gaji, dll)" required
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-icy focus:outline-none font-semibold text-navy"
            />
            <div className="grid grid-cols-2 gap-3">
              <input 
                type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="Jumlah (Rp)" required min="0"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-icy focus:outline-none font-semibold text-navy"
              />
              <input 
                type="date" value={date} onChange={(e) => setDate(e.target.value)} required
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-icy focus:outline-none text-navy font-semibold"
              />
            </div>
            <button 
              type="submit" disabled={isSubmitting}
              className="w-full bg-rose-500 text-white font-bold rounded-xl py-3 flex items-center justify-center gap-2 shadow-lg shadow-rose-500/30 hover:bg-rose-600 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Simpan Pengeluaran
            </button>
          </form>
        </div>

        {/* List Data */}
        <div>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-1 mb-3">Riwayat Pengeluaran</h3>
          <div className="flex flex-col gap-3">
            {loading ? (
              <div className="flex justify-center p-10"><Loader2 className="animate-spin text-icy" size={32} /></div>
            ) : dataList.length === 0 ? (
              <div className="text-center p-8 text-sm text-slate-500 font-semibold bg-slate-50 rounded-2xl border border-slate-100">
                Belum ada data pengeluaran.
              </div>
            ) : (
              dataList.map((item) => (
                <div key={item.id} className="bg-white border border-slate-100 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                  <div>
                    <div className="font-bold text-navy text-sm">{item.description}</div>
                    <div className="text-xs text-slate-500 font-semibold mt-1">
                      {new Date(item.date).toLocaleDateString('id-ID', { dateStyle: 'long' })}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-extrabold text-rose-500">
                      - Rp {item.amount.toLocaleString('id-ID')}
                    </div>
                    {session?.user?.role === 'super_admin' && <button 
                      onClick={() => openDeleteModal(item.id)}
                      className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>}
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
        title="Hapus Pengeluaran"
        message="Yakin ingin menghapus catatan pengeluaran ini? Data akan dihapus secara permanen dari pembukuan."
      />
    </div>
  );
}
