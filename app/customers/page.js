"use client";
import { useState, useEffect } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { getCustomers, addCustomer, deleteCustomer } from "@/lib/actions";
import { Plus, Trash2, Loader2, Users } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useSession } from 'next-auth/react';

export default function CustomersPage() {
  const {data: session} = useSession();
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
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
      const data = await getCustomers();
      setDataList(data || []);
    } catch (error) {
      toast.error("Gagal memuat pelanggan");
      console.error(error);
    }
    setLoading(false);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    
    try {
      const newData = await addCustomer({ name, phone });
      if (newData) {
        setDataList([newData, ...dataList]);
        setName(""); setPhone("");
        toast.success("Pelanggan berhasil ditambahkan!");
      }
    } catch (error) {
      toast.error("Gagal menambahkan pelanggan");
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
      await deleteCustomer(deleteId);
      setDataList(dataList.filter(item => item.id !== deleteId));
      toast.success("Pelanggan berhasil dihapus!");
      setIsModalOpen(false);
    } catch (error) {
      toast.error("Gagal menghapus pelanggan");
      console.error(error);
    }
    setIsDeleting(false);
    setDeleteId(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto min-h-screen bg-white pb-20 relative">
      <PageHeader title="Pelanggan" />
      
      <div className="p-4 flex flex-col gap-6 mt-2 max-w-3xl mx-auto">
        <div className="bg-slate-50 border border-slate-200 shadow-sm p-5 rounded-2xl">
          <h3 className="font-bold text-navy mb-3 text-sm flex items-center gap-2">
            <Users size={18} className="text-icy" /> Tambah Pelanggan
          </h3>
          <form onSubmit={handleAdd} className="flex gap-2">
            <input 
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Nama" required
              className="w-1/2 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-icy focus:outline-none font-semibold text-navy"
            />
            <input 
              type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="No. HP"
              className="w-1/2 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-icy focus:outline-none font-semibold text-navy"
            />
            <button 
              type="submit" disabled={isSubmitting}
              className="w-14 bg-icy text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-icy/30 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            </button>
          </form>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-1 mb-3">Daftar Pelanggan</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {loading ? (
              <div className="col-span-full flex justify-center p-10"><Loader2 className="animate-spin text-icy" size={32} /></div>
            ) : dataList.length === 0 ? (
              <div className="col-span-full text-center p-8 text-sm text-slate-500 font-semibold bg-slate-50 rounded-2xl border border-slate-100">Belum ada pelanggan.</div>
            ) : (
              dataList.map((item) => (
                <div key={item.id} className="bg-white border border-slate-100 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                  <div>
                    <div className="font-bold text-navy text-sm">{item.name}</div>
                    <div className="text-xs text-slate-500 mt-1 font-semibold">{item.phone || "-"}</div>
                  </div>
                  {session?.user?.role === 'super_admin' && <button aria-label="Hapus pelanggan" onClick={() => openDeleteModal(item.id)} className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center cursor-pointer hover:bg-red-100 transition-colors">
                    <Trash2 size={16} />
                  </button>}
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
        title="Hapus Pelanggan"
        message="Yakin ingin menghapus data pelanggan ini dari daftar?"
      />
    </div>
  );
}
