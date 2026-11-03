"use client";
import { useState, useEffect } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { getPriceNotes, addPriceNote, getProducts, deletePriceNote } from "@/lib/actions";
import { Plus, Trash2, Loader2, StickyNote } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import CustomSelect from "@/components/ui/CustomSelect";

export default function PriceNotesPage() {
  const [dataList, setDataList] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [productId, setProductId] = useState("");
  const [note, setNote] = useState("");
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
      const pData = await getPriceNotes();
      const prodData = await getProducts();
      setDataList(pData || []);
      setProducts(prodData || []);
    } catch (error) {
      toast.error("Gagal memuat catatan");
      console.error(error);
    }
    setLoading(false);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setIsSubmitting(true);
    
    try {
      const newData = await addPriceNote({
        product_id: productId || null,
        note
      });
      if (newData) {
        setDataList([newData, ...dataList]);
        setNote(""); setProductId("");
        toast.success("Catatan berhasil ditambahkan!");
      }
    } catch (error) {
      toast.error("Gagal menyimpan catatan");
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
      await deletePriceNote(deleteId);
      setDataList(dataList.filter(item => item.id !== deleteId));
      toast.success("Catatan dihapus!");
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
      <PageHeader title="Catatan Harga" />
      
      <div className="p-4 flex flex-col gap-6 mt-2 max-w-3xl mx-auto">
        
        {/* Form Tambah */}
        <div className="bg-slate-50 border border-slate-200 shadow-sm p-5 rounded-2xl">
          <h3 className="font-bold text-navy mb-3 text-sm flex items-center gap-2">
            <StickyNote size={18} className="text-orange-500" /> Memo Baru
          </h3>
          <form onSubmit={handleAdd} className="flex flex-col gap-3">
            <CustomSelect 
              value={productId} 
              onChange={setProductId}
              options={products.map(p => ({ value: p.id, label: p.name }))}
              placeholder="-- Terkait Produk (Opsional) --"
              className="mb-1"
            />
            <div className="flex gap-2">
              <input 
                type="text" value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="Tulis catatan (misal: Harga promo suplier A...)" required
                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-orange-500 focus:outline-none font-semibold text-navy"
              />
              <button 
                type="submit" disabled={isSubmitting}
                className="w-14 bg-orange-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/30 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              </button>
            </div>
          </form>
        </div>

        {/* List Data */}
        <div>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-1 mb-3">Daftar Catatan</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {loading ? (
              <div className="col-span-full flex justify-center p-10"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
            ) : dataList.length === 0 ? (
              <div className="col-span-full text-center p-8 text-sm text-slate-500 font-semibold bg-slate-50 rounded-2xl border border-slate-100">Belum ada catatan.</div>
            ) : (
              dataList.map((item) => (
                <div key={item.id} className="bg-orange-50/50 border border-orange-100 p-4 rounded-2xl flex justify-between items-start shadow-sm">
                  <div className="flex-1">
                    {item.products?.name && (
                      <div className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-md inline-block mb-2">
                        {item.products.name}
                      </div>
                    )}
                    <p className="text-sm font-bold text-navy leading-relaxed">
                      {item.note}
                    </p>
                    <div className="text-xs text-slate-500 font-semibold mt-2">
                      {new Date(item.created_at).toLocaleDateString('id-ID', { dateStyle: 'long' })}
                    </div>
                  </div>
                  <button onClick={() => openDeleteModal(item.id)} className="w-8 h-8 rounded-full bg-white text-rose-500 flex items-center justify-center shrink-0 shadow-sm ml-3 cursor-pointer hover:bg-rose-50 transition-colors">
                    <Trash2 size={16} />
                  </button>
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
        title="Hapus Memo"
        message="Yakin ingin menghapus catatan harga ini secara permanen?"
      />
    </div>
  );
}
