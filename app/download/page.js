"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Smartphone, ShieldCheck, Zap, Server, ChevronRight } from "lucide-react";

export default function DownloadPage() {
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setIsIOS(true);
    }
  }, []);

  const features = [
    { icon: <Zap size={22} />, title: "Performa Kilat", desc: "Aplikasi ringan tanpa membebani memori HP Kasir." },
    { icon: <Server size={22} />, title: "Sinkronisasi Live", desc: "Otomatis terhubung langsung dengan database pusat." },
    { icon: <ShieldCheck size={22} />, title: "Akses Tertutup", desc: "Portal rahasia dengan keamanan enkripsi tinggi." },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-orange-500/20 flex flex-col relative overflow-hidden">
      
      {/* HEADER NAV */}
      <nav className="w-full py-6 px-8 flex justify-between items-center max-w-7xl mx-auto relative z-10 bg-white/70 backdrop-blur-md rounded-b-[2rem] shadow-sm border-b border-slate-200/50 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 shadow-md flex items-center justify-center p-1.5">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-black text-xl tracking-tight text-slate-900">DIMSUM MENTAI WALED PREMIUM</span>
        </div>
        <div className="text-[10px] sm:text-xs font-black text-orange-600 uppercase tracking-[0.2em] px-4 py-2 bg-orange-50 rounded-full border border-orange-100">
          Internal App
        </div>
      </nav>

      {/* MAIN HERO */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
        
        {/* LEFT: COPY & ACTION */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-start"
        >
          <div className="inline-block bg-white border border-slate-200 rounded-full px-4 py-1.5 mb-6 shadow-sm">
            <span className="text-xs font-bold text-orange-600 flex items-center gap-2 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
              Versi 2.0.1 Stable
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.05] mb-6 text-slate-900">
            Sistem Kasir<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-500">
              Super Cepat.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl font-medium text-slate-500 mb-10 max-w-md leading-relaxed">
            Unduh aplikasi resmi POS dan Manajemen Gudang DIMSUM MENTAI WALED PREMIUM. Eksklusif hanya untuk staf dan karyawan internal.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            {/* DIRECT APK DOWNLOAD BUTTON */}
            <a 
              href="/app/frozenmart.apk"
              download
              className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-white text-lg transition-all bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 hover:-translate-y-1 shadow-[0_15px_30px_-10px_rgba(37,99,235,0.4)] group"
            >
              <Download size={22} className="group-hover:animate-bounce" />
              Download APK (Android)
            </a>
          </div>
          <p className="text-xs text-slate-400 font-semibold mt-4 max-w-sm">
            *Untuk pengguna iPhone/iOS, silakan gulir ke bawah untuk panduan instalasi Safari.
          </p>
        </motion.div>

        {/* RIGHT: FEATURE CARDS */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="flex flex-col gap-4"
        >
          {features.map((feature, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-3xl p-6 flex gap-6 items-center shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all">
              <div className="w-16 h-16 rounded-2xl bg-orange-50/50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0 shadow-inner">
                {feature.icon}
              </div>
              <div>
                <h3 className="text-xl font-black mb-1 text-slate-800 tracking-tight">{feature.title}</h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">{feature.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </main>

      {/* INSTRUCTIONS SECTION */}
      <section className="w-full bg-white border-t border-slate-100 py-24 relative z-10 shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.02)]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black tracking-tight mb-4 text-slate-900">Panduan Instalasi</h2>
            <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto">Ikuti langkah-langkah mudah di bawah ini untuk memasang aplikasi di perangkat Kasir.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* ANDROID INSTRUCTIONS */}
            <div className="bg-slate-50 rounded-[2.5rem] p-8 lg:p-10 border border-slate-200 shadow-xl relative overflow-hidden group hover:border-orange-300 transition-all">
              <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/5 blur-[60px] rounded-full"></div>
              
              <div className="flex items-center gap-5 mb-8 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-green-500 shadow-sm">
                  <Smartphone size={32} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="font-black text-2xl tracking-tight text-slate-900">Android</h3>
                  <p className="text-xs font-black text-green-600 uppercase tracking-[0.2em] mt-1 bg-green-100/50 inline-block px-3 py-1 rounded-full">Via File APK</p>
                </div>
              </div>
              <ul className="flex flex-col gap-6 relative z-10">
                {[
                  "Ketuk tombol 'Download APK' berwarna biru di bagian atas halaman ini.",
                  "Tunggu hingga file 'frozenmart.apk' selesai diunduh.",
                  "Buka file tersebut. Jika muncul peringatan, pilih opsi 'Tetap Install'.",
                  "Jika diminta izin 'Install dari Sumber Tidak Dikenal', silakan izinkan di Pengaturan.",
                  "Selesai! Aplikasi DIMSUM MENTAI WALED PREMIUM siap digunakan dari Layar Utama HP."
                ].map((step, i) => (
                  <li key={i} className="flex gap-5 items-start">
                    <div className="w-7 h-7 mt-0.5 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 font-black text-xs shadow-sm border border-green-200">
                      {i + 1}
                    </div>
                    <p className="text-base font-semibold text-slate-600 leading-relaxed">{step}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* IOS INSTRUCTIONS */}
            <div className="bg-slate-50 rounded-[2.5rem] p-8 lg:p-10 border border-slate-200 shadow-xl relative overflow-hidden group hover:border-slate-400 transition-all">
              <div className="absolute top-0 right-0 w-40 h-40 bg-slate-400/5 blur-[60px] rounded-full"></div>

              <div className="flex items-center gap-5 mb-8 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-sm">
                  {/* USING SMARTPHONE ICON INSTEAD OF APPLE SO IT LOOKS LIKE A PHONE */}
                  <Smartphone size={32} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="font-black text-2xl tracking-tight text-slate-900">iPhone / iPad</h3>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mt-1 bg-slate-200/50 inline-block px-3 py-1 rounded-full">Via Safari Browser</p>
                </div>
              </div>
              <ul className="flex flex-col gap-6 relative z-10">
                {[
                  "PENTING: Anda WAJIB membuka halaman ini menggunakan browser Safari bawaan iPhone.",
                  "Di bagian bawah layar Safari, ketuk ikon 'Share' (Kotak dengan panah ke atas).",
                  "Gulir menu ke bawah dan temukan opsi 'Tambah ke Layar Utama' (Add to Home Screen).",
                  "Ketuk opsi tersebut, lalu tekan 'Tambah' di pojok kanan atas layar.",
                  "Aplikasi DIMSUM MENTAI WALED PREMIUM (PWA) langsung terpasang di Layar Utama iPhone Anda!"
                ].map((step, i) => (
                  <li key={i} className="flex gap-5 items-start">
                    <div className="w-7 h-7 mt-0.5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 font-black text-xs shadow-sm border border-slate-300">
                      {i + 1}
                    </div>
                    <p className="text-base font-semibold text-slate-600 leading-relaxed">{step}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* AZZAM CODEX BRANDING FOOTER */}
      <footer className="w-full py-16 text-center bg-slate-900 relative z-10 overflow-hidden flex flex-col items-center justify-center">
        {/* Subdued background styling for footer */}
        <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"></div>
        
        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-4">
          Design & Engineered By
        </p>
        
        <div className="inline-flex items-center gap-3 px-8 py-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 shadow-2xl backdrop-blur-sm">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-600 to-amber-400 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.5)]">
            <Zap size={16} className="text-white fill-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400">
            AZZAM CODEX
          </h2>
        </div>
        
        <p className="mt-6 text-sm font-medium text-slate-500">
          © {new Date().getFullYear()} Enterprise Solutions. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
