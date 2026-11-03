"use client";
import { useState, useEffect } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { Save, Loader2, ClipboardList, Info } from "lucide-react";
import { getStoreSettings, updateStoreSettings } from "@/lib/actions";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function ShiftRulesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [rules, setRules] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Only Admin can access
    if (status === "authenticated" && session?.user?.role !== "super_admin") {
      router.push("/");
    } else if (status === "authenticated") {
      fetchRules();
    }
  }, [status, session]);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const data = await getStoreSettings();
      if (data && data.shift_rules) {
        setRules(data.shift_rules);
      }
    } catch (error) {
      console.error(error);
      toast.error("Gagal memuat aturan shift.");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateStoreSettings({ shift_rules: rules });
      toast.success("Peraturan Shift berhasil disimpan!");
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyimpan peraturan.");
    }
    setIsSaving(false);
  };

  if (status === "loading" || loading) {
    return <div className="min-h-screen bg-slate-50 flex justify-center items-center"><Loader2 className="animate-spin text-icy" size={32} /></div>;
  }

  if (session?.user?.role !== "super_admin") return null;

  return (
    <div className="w-full max-w-7xl mx-auto min-h-screen bg-slate-50 pb-24 relative font-sans">
      <PageHeader title="Peraturan Shift" />
      
      <div className="p-4 mt-2 max-w-3xl mx-auto flex flex-col gap-5">
        
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex gap-3 shadow-sm">
          <div className="mt-0.5 text-orange-600"><Info size={20} /></div>
          <div>
            <h4 className="font-extrabold text-orange-900 text-sm mb-1">Catatan Khusus Admin</h4>
            <p className="text-xs text-orange-700 font-medium leading-relaxed">
              Teks yang Anda tulis di bawah ini akan **ditampilkan secara otomatis** kepada Kasir setiap kali mereka akan melakukan Absen (Check-In). Gunakan untuk menulis Standar Operasional Prosedur (SOP) atau Denda Keterlambatan.
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
              <ClipboardList size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-navy text-sm">Editor Peraturan</h3>
              <p className="text-xs text-slate-500 font-medium">Bebas diisi dengan teks panjang</p>
            </div>
          </div>

          <textarea 
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            rows={12}
            placeholder="Ketik peraturan shift di sini..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:border-icy focus:outline-none text-navy font-semibold transition-colors resize-y leading-relaxed"
          ></textarea>

          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-icy text-white font-extrabold rounded-xl py-4 flex items-center justify-center gap-2 hover:bg-orange-600 active:scale-95 transition-all cursor-pointer shadow-lg shadow-icy/20 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Simpan Peraturan
          </button>
        </div>

      </div>
    </div>
  );
}
