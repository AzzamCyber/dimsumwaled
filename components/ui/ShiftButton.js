"use client";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { endShift } from '@/lib/actions';
import { useAttendance } from '@/components/providers/AttendanceProvider';
import toast from 'react-hot-toast';

export default function ShiftButton() {
  const { isShiftActive, shiftId, checkShift } = useAttendance() || {};
  const [loading, setLoading] = useState(false);
  
  // Note: if the provider blocks the app when shift is inactive, 
  // this button will only ever be rendered when isShiftActive === true.
  // We handle both cases just in case the component is reused elsewhere.

  const handleShift = async () => {
    if (loading) return;
    setLoading(true);
    
    try {
      if (isShiftActive && shiftId) {
        await endShift(shiftId);
        toast.success("Shift berhasil diakhiri!");
        // Notify the global provider to re-check and block the UI
        if (checkShift) await checkShift();
      } else {
        // This block might never be reached if provider blocks UI,
        // but kept for fallback.
      }
    } catch (error) {
      toast.error("Gagal mengubah status shift.");
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={handleShift}
      disabled={loading}
      className={cn(
        "w-full relative overflow-hidden rounded-3xl p-6 flex flex-col items-center justify-center gap-3 transition-all duration-500 cursor-pointer disabled:opacity-50",
        isShiftActive 
          ? "bg-gradient-to-br from-icy to-orange-600 text-white shadow-lg shadow-icy/30"
          : "bg-gradient-to-br from-navy to-slate-800 text-white shadow-lg shadow-navy/30"
      )}
    >
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/20 rounded-full blur-3xl pointer-events-none"></div>
      
      <motion.div
        animate={{ scale: isShiftActive ? [1, 1.2, 1] : 1 }}
        transition={{ duration: 0.5 }}
      >
        {loading ? <Loader2 size={48} className="animate-spin" /> : 
         isShiftActive ? <CheckCircle2 size={48} strokeWidth={1.5} /> : <Fingerprint size={48} strokeWidth={1.5} />}
      </motion.div>
      
      <div className="text-center z-10">
        <h2 className="text-2xl font-bold tracking-tight">
          {isShiftActive ? "Akhiri Shift" : "Mulai Shift"}
        </h2>
        <p className="text-sm font-medium text-white/80 mt-1">
          {isShiftActive ? "Tap untuk selesai bekerja" : "Tap untuk absen masuk"}
        </p>
      </div>
    </motion.button>
  );
}
