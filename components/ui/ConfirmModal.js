"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, AlertTriangle, X } from "lucide-react";

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Konfirmasi Aksi", 
  message = "Apakah Anda yakin ingin melanjutkan tindakan ini?", 
  isLoading = false 
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isLoading ? undefined : onClose}
            className="fixed inset-0 bg-navy/40 backdrop-blur-sm z-[100]"
          />
          <div className="fixed inset-0 flex items-center justify-center z-[101] p-4 pointer-events-none">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl shadow-navy/20 pointer-events-auto border border-slate-100"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
                  <AlertTriangle size={24} strokeWidth={2.5} />
                </div>
                {!isLoading && (
                  <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 hover:text-navy transition-colors">
                    <X size={16} strokeWidth={2.5} />
                  </button>
                )}
              </div>
              
              <h2 className="text-xl font-black text-navy mb-2">{title}</h2>
              <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
                {message}
              </p>

              <div className="flex gap-3">
                <button 
                  onClick={onClose} 
                  disabled={isLoading}
                  className="flex-1 bg-slate-50 text-navy font-bold py-3.5 rounded-2xl hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button 
                  onClick={onConfirm} 
                  disabled={isLoading}
                  className="flex-1 bg-rose-500 text-white font-bold py-3.5 rounded-2xl hover:bg-rose-600 shadow-lg shadow-rose-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-80"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    "Ya, Lanjutkan"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
