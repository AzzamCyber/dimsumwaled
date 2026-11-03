"use client";
import { useState, useEffect } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { getCategories, addCategory, deleteCategory as deleteCategoryAction } from "@/lib/actions";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await getCategories();
      setCategories(data || []);
    } catch (error) {
      toast.error("Gagal memuat kategori");
      console.error(error);
    }
    setLoading(false);
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    
    try {
      const data = await addCategory(name);
      if (data) {
        setCategories([data, ...categories]);
        setName("");
        toast.success("Kategori berhasil ditambahkan!");
      }
    } catch (error) {
      toast.error("Gagal menambahkan kategori.");
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
      await deleteCategoryAction(deleteId);
      setCategories(categories.filter(c => c.id !== deleteId));
      toast.success("Kategori berhasil dihapus!");
      setIsModalOpen(false);
    } catch (error) {
      toast.error("Gagal menghapus kategori!");
      console.error(error);
    }
    setIsDeleting(false);
    setDeleteId(null);
  };

  return (
    <div className="min-h-screen bg-white pb-20 w-full max-w-7xl mx-auto relative">
      <PageHeader title="Kategori Produk" />
      
      <div className="p-4 flex flex-col gap-4">
        {/* Form Tambah Kategori */}
        <div className="bg-slate-50 border border-slate-200 shadow-sm p-5 rounded-2xl">
          <h3 className="font-bold text-navy mb-3 text-sm">Tambah Kategori Baru</h3>
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Frozen Food"
              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-navy font-semibold focus:outline-none focus:border-icy"
              required
            />
            <button 
              type="submit"
              disabled={isSubmitting}
              className="bg-icy text-white px-4 py-2.5 rounded-xl flex items-center justify-center shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
            </button>
          </form>
        </div>

        {/* List Kategori */}
        <div className="flex flex-col gap-2">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 size={32} className="animate-spin text-icy opacity-50" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center p-8 text-sm text-slate-500 font-semibold">
              Belum ada kategori.
            </div>
          ) : (
            categories.map((cat) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={cat.id} 
                className="bg-white border border-slate-100 p-4 rounded-xl flex justify-between items-center shadow-sm"
              >
                <span className="font-bold text-navy">{cat.name}</span>
                <button 
                  onClick={() => openDeleteModal(cat.id)}
                  className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <ConfirmModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        title="Hapus Kategori"
        message="Yakin ingin menghapus kategori ini? Data yang terkait mungkin akan ikut terpengaruh."
      />
    </div>
  );
}
