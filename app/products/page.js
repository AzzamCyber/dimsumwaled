"use client";
import { useState, useEffect } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { getProducts, addProduct, deleteProduct as deleteProductAction, uploadProductImage } from "@/lib/actions";
import { getCategories } from "@/lib/actions";
import { Plus, Trash2, Loader2, Package, X } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import CustomSelect from "@/components/ui/CustomSelect";


export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [stock, setStock] = useState("");
  const [barcode, setBarcode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Variants State
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState([{ name: "", price: "", basePrice: "", stock: "" }]);

  // Image State
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const prodData = await getProducts();
      const catData = await getCategories();
      setProducts(prodData || []);
      setCategories(catData || []);
    } catch (error) {
      toast.error("Gagal memuat produk");
      console.error(error);
    }
    setLoading(false);
  };

  const handleAddVariant = () => {
    setVariants([...variants, { name: "", price: "", basePrice: "", stock: "" }]);
  };

  const updateVariant = (index, field, value) => {
    const newV = [...variants];
    newV[index][field] = value;
    setVariants(newV);
  };

  const removeVariant = (index) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) return toast.error("Ukuran maksimal gambar adalah 5MB");
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          
          // Max width/height 400px
          const MAX_SIZE = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to webp 0.7 quality
          canvas.toBlob((blob) => {
            if (blob) {
              const reader2 = new FileReader();
              reader2.onloadend = () => resolve(reader2.result); // Base64 string
              reader2.onerror = () => reject(new Error("Blob to Base64 failed"));
              reader2.readAsDataURL(blob);
            } else {
              reject(new Error("Canvas to Blob failed"));
            }
          }, "image/webp", 0.7);
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const uploadImage = async (base64Data) => {
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;
    try {
      return await uploadProductImage(base64Data, fileName);
    } catch (error) {
      throw new Error(error.message || "Gagal upload gambar.");
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Nama Induk Produk wajib diisi!");
    
    setIsSubmitting(true);
    
    try {
      let uploadedImageUrl = null;
      if (imageFile) {
        const compressedBase64 = await compressImage(imageFile);
        uploadedImageUrl = await uploadImage(compressedBase64);
      }

      let addedProducts = [];

      if (hasVariants) {
        if (variants.length === 0) throw new Error("Minimal 1 varian harus ada!");
        // Loop and add variants
        for (const v of variants) {
          if (!v.name || !v.price || !v.stock) continue; // Skip incomplete variants
          
          const fullName = `${name} - ${v.name}`;
          const data = await addProduct({
            name: fullName, 
            category_id: categoryId || null, 
            price: parseFloat(v.price), 
            base_price: parseFloat(v.basePrice) || 0,
            stock: parseInt(v.stock),
            barcode: barcode || null,
            image_url: uploadedImageUrl
          });
          if (data) addedProducts.push(data);
        }
      } else {
        if (!price || !stock) throw new Error("Harga dan stok wajib diisi!");
        const data = await addProduct({
          name, 
          category_id: categoryId || null, 
          price: parseFloat(price), 
          base_price: parseFloat(basePrice) || 0,
          stock: parseInt(stock),
          barcode,
          image_url: uploadedImageUrl
        });
        if (data) addedProducts.push(data);
      }

      if (addedProducts.length > 0) {
        setProducts([...addedProducts, ...products]);
        setName(""); setCategoryId(""); setPrice(""); setBasePrice(""); setStock(""); setBarcode("");
        setHasVariants(false);
        setVariants([{ name: "", price: "", basePrice: "", stock: "" }]);
        removeImage();
        toast.success(hasVariants ? `${addedProducts.length} Varian berhasil ditambahkan!` : "Produk berhasil ditambahkan!");
      } else {
        toast.error("Gagal menyimpan. Pastikan form lengkap.");
      }
    } catch (error) {
      toast.error(error.message || "Gagal menambahkan produk");
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
      await deleteProductAction(deleteId);
      setProducts(products.filter(p => p.id !== deleteId));
      toast.success("Produk dihapus!");
      setIsModalOpen(false);
    } catch (error) {
      toast.error("Gagal menghapus produk");
      console.error(error);
    }
    setIsDeleting(false);
    setDeleteId(null);
  };

  const categoryOptions = categories.map(c => ({ value: c.id, label: c.name }));

  return (
    <div className="min-h-screen bg-white pb-20 w-full max-w-7xl mx-auto relative">
      <PageHeader title="Daftar Produk" />
      
      <div className="p-4 flex flex-col gap-4">
        {/* Form Tambah Produk */}
        <div className="bg-slate-50 border border-slate-200 shadow-sm p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-navy text-sm">Tambah Produk Baru</h3>
            
            {/* Toggle Variants */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
              <button 
                onClick={() => setHasVariants(false)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${!hasVariants ? 'bg-icy text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                Tunggal
              </button>
              <button 
                onClick={() => setHasVariants(true)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${hasVariants ? 'bg-icy text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                Varian
              </button>
            </div>
          </div>

          <form onSubmit={handleAddProduct} className="flex flex-col gap-3">
            <input 
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder={hasVariants ? "Nama Induk Produk (Misal: Sosis Kanzler)" : "Nama Produk"} required
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-navy focus:outline-none focus:border-icy font-semibold"
            />
            
            {/* Image Upload */}
            <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-3">
              {imagePreview ? (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    type="button" 
                    onClick={removeImage}
                    className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-full hover:bg-rose-600 transition-colors cursor-pointer shadow-sm"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg bg-slate-50 border border-slate-200 border-dashed flex items-center justify-center text-slate-400 shrink-0">
                  <Package size={24} />
                </div>
              )}
              
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Foto Produk (Opsional)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-icy/10 file:text-icy hover:file:bg-icy/20 transition-colors file:cursor-pointer"
                />
              </div>
            </div>

            <CustomSelect 
              value={categoryId} 
              onChange={setCategoryId}
              options={categoryOptions}
              placeholder="-- Pilih Kategori (Opsional) --"
            />

            {!hasVariants && (
              <>
                <div className="flex gap-2">
                  <input 
                    type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="Harga Modal (Rp)" min="0"
                    className="w-1/2 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-navy focus:outline-none focus:border-icy font-semibold"
                  />
                  <input 
                    type="number" value={price} onChange={(e) => setPrice(e.target.value)}
                    placeholder="Harga Jual (Rp)" required min="0"
                    className="w-1/2 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-navy focus:outline-none focus:border-icy font-semibold"
                  />
                </div>
                
                <div className="flex gap-2">
                  <input 
                    type="number" value={stock} onChange={(e) => setStock(e.target.value)}
                    placeholder="Stok Awal" required min="0"
                    className="w-1/2 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-navy focus:outline-none focus:border-icy font-semibold"
                  />
                </div>
              </>
            )}

            {hasVariants && (
              <div className="flex flex-col gap-3 bg-white p-4 rounded-xl border border-slate-200 mt-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Daftar Varian</p>
                {variants.map((v, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center relative">
                    <input 
                      type="text" value={v.name} onChange={(e) => updateVariant(idx, 'name', e.target.value)}
                      placeholder="Nama Varian (Misal: Pedas)" required
                      className="w-full sm:w-1/4 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:border-icy font-semibold"
                    />
                    <input 
                      type="number" value={v.basePrice} onChange={(e) => updateVariant(idx, 'basePrice', e.target.value)}
                      placeholder="H.Modal" min="0"
                      className="w-full sm:w-1/4 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:border-icy font-semibold"
                    />
                    <input 
                      type="number" value={v.price} onChange={(e) => updateVariant(idx, 'price', e.target.value)}
                      placeholder="H.Jual" required min="0"
                      className="w-full sm:w-1/4 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:border-icy font-semibold"
                    />
                    <input 
                      type="number" value={v.stock} onChange={(e) => updateVariant(idx, 'stock', e.target.value)}
                      placeholder="Stok" required min="0"
                      className="w-full sm:w-[15%] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:border-icy font-semibold"
                    />
                    {variants.length > 1 && (
                      <button 
                        type="button" onClick={() => removeVariant(idx)}
                        className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 hover:bg-rose-100 absolute sm:static right-0 top-0 cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  type="button" onClick={handleAddVariant}
                  className="w-full bg-slate-100 text-slate-600 font-bold rounded-lg py-2 mt-2 text-sm hover:bg-slate-200 transition-colors border border-slate-200 border-dashed cursor-pointer"
                >
                  + Tambah Varian Lainnya
                </button>
              </div>
            )}
            
            <input 
              type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)}
              placeholder="Barcode (Opsional)"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-navy focus:outline-none focus:border-icy font-semibold"
            />

            <button 
              type="submit" disabled={isSubmitting}
              className="w-full mt-2 bg-icy text-white font-extrabold rounded-xl px-4 py-3 flex items-center justify-center gap-2 hover:bg-orange-600 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              {hasVariants ? "Simpan Semua Varian" : "Simpan Produk"}
            </button>
          </form>
        </div>

        {/* List Produk */}
        <div className="flex flex-col gap-2">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 size={32} className="animate-spin text-icy opacity-50" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center p-8 text-sm text-slate-500 font-semibold bg-slate-50 rounded-2xl border border-slate-100">
              Belum ada produk.
            </div>
          ) : (
            products.map((prod) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={prod.id} 
                className="bg-white border border-slate-100 p-4 rounded-xl flex gap-3 shadow-sm relative overflow-hidden"
              >
                {prod.image_url ? (
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden">
                    <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-icy/10 flex items-center justify-center text-icy shrink-0">
                    <Package size={24} />
                  </div>
                )}
                <div className="flex-1 flex flex-col justify-center">
                  <span className="font-bold text-navy leading-tight">{prod.name}</span>
                  <span className="text-[10px] font-semibold text-icy uppercase tracking-wider">
                    {prod.categories?.name || 'Tanpa Kategori'}
                  </span>
                  <div className="flex gap-3 mt-1 text-xs font-semibold text-slate-500">
                    <span>Rp {prod.price.toLocaleString('id-ID')}</span>
                    <span>•</span>
                    <span>Stok: {prod.stock}</span>
                  </div>
                </div>
                <button 
                  onClick={() => openDeleteModal(prod.id)}
                  className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors shrink-0 self-center cursor-pointer"
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
        title="Hapus Produk"
        message="Yakin ingin menghapus produk ini dari gudang? Semua data stok akan hilang."
      />
    </div>
  );
}
