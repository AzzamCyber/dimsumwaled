"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import release from "@/lib/app-release.json";
import {
  Download, Smartphone, ShieldCheck, Zap, Server, ChevronRight, X,
  Share, Plus, Apple, ArrowRight, CheckCircle2, Wifi, RefreshCw, HardDrive,
  Copy, Check, ExternalLink, Lock,
} from "lucide-react";

const FEATURES = [
  { icon: Zap, title: "Kasir dalam genggaman", desc: "Buat pesanan, cetak struk, dan tutup shift langsung dari HP kasir cabang." },
  { icon: Server, title: "Data selalu sinkron", desc: "Stok, transaksi, dan laporan tersambung langsung ke database pusat secara real-time." },
  { icon: ShieldCheck, title: "Akses sesuai peran", desc: "Admin mengelola seluruh cabang, karyawan hanya melihat cabangnya sendiri." },
  { icon: Wifi, title: "Tetap terkendali", desc: "Halaman koneksi khusus memastikan tidak ada transaksi ganda saat sinyal terputus." },
];

const subscribeToNothing = () => () => {};

function readPlatform() {
  const ua = window.navigator.userAgent.toLowerCase();
  const iOS = /iphone|ipad|ipod/.test(ua) || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  if (iOS) return "ios";
  return /android/.test(ua) ? "android" : "desktop";
}

function usePlatform() {
  return useSyncExternalStore(subscribeToNothing, readPlatform, () => "desktop");
}

function subscribeToDisplayMode(callback) {
  const query = window.matchMedia("(display-mode: standalone)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function readStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function useStandalone() {
  return useSyncExternalStore(subscribeToDisplayMode, readStandalone, () => false);
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return null;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export default function DownloadPage() {
  const device = usePlatform();
  const displayStandalone = useStandalone();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [installState, setInstallState] = useState("idle");
  const [copied, setCopied] = useState(false);
  const standalone = displayStandalone || installState === "installed";

  const apkReady = Boolean(release.verified && release.bytes > 0);
  const apkSize = formatBytes(release.bytes);
  const builtAt = formatDate(release.builtAt);
  const apkUrl = `${release.file}?v=${release.versionCode || release.version}`;

  useEffect(() => {
    function handlePrompt(event) {
      event.preventDefault();
      setInstallPrompt(event);
    }
    function handleInstalled() {
      setInstallState("installed");
      setInstallPrompt(null);
    }
    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (!guideOpen) return;
    function onKey(event) {
      if (event.key === "Escape") setGuideOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [guideOpen]);

  async function installPwa() {
    if (device === "ios") {
      setGuideOpen(true);
      return;
    }
    if (!installPrompt) {
      setGuideOpen(true);
      return;
    }
    setInstallState("prompting");
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice?.outcome === "accepted") setInstallState("installed");
      else setInstallState("idle");
    } catch {
      setInstallState("idle");
    } finally {
      setInstallPrompt(null);
    }
  }

  async function copyChecksum() {
    if (!release.sha256) return;
    try {
      await navigator.clipboard.writeText(release.sha256);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  const platformLabel = device === "ios" ? "iPhone / iPad" : device === "android" ? "Android" : "Desktop";

  return (
    <div className="min-h-screen bg-[#fffaf3] text-[#3b2a1e] font-sans selection:bg-[#dc6636]/20 relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -top-40 -right-32 h-[520px] w-[520px] rounded-full bg-[#dc6636]/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute top-[520px] -left-40 h-[420px] w-[420px] rounded-full bg-[#e9b384]/20 blur-3xl" />

      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-[#efe2d3]/80 bg-[#fffaf3]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[74px] w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/download" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white p-1.5 shadow-[0_4px_14px_rgba(97,64,33,0.08)] ring-1 ring-[#efe2d3]">
              <img src="/logo.png" alt="Logo Dimsum Waled" className="h-full w-full object-contain" />
            </span>
            <span className="text-[10px] font-bold uppercase leading-[1.7] tracking-[1px] text-[#7c6047]">
              Dimsum Mentai<br /><strong className="text-[15px] font-extrabold tracking-[0.5px] text-[#3b2a1e]">Waled Premium</strong>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-[#e7d8c6] bg-white px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#a06a3c] sm:inline-flex">
              <Lock size={12} /> Internal
            </span>
            <Link href="/portal-karyawan" className="inline-flex items-center gap-2 rounded-full bg-[#dc6636] px-4 py-2.5 text-[11px] font-bold text-white shadow-[0_8px_20px_-8px_rgba(220,102,54,0.9)] transition hover:bg-[#c85526]">
              Buka aplikasi <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* HERO */}
        <section className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-14 px-5 pb-16 pt-12 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-24 lg:pt-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#e7d8c6] bg-white/80 px-4 py-2 shadow-sm">
              <span className="relative flex h-2 w-2">
                {apkReady && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#6d9463] opacity-70" />}
                <span className={`relative inline-flex h-2 w-2 rounded-full ${apkReady ? "bg-[#6d9463]" : "bg-[#c9a06b]"}`} />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a6a4d]">
                {apkReady ? `Versi ${release.version} siap diunduh` : `Versi ${release.version} sedang disiapkan`}
              </span>
            </div>

            <h1 className="text-[42px] font-black leading-[1.03] tracking-[-2px] text-[#33241a] sm:text-6xl lg:text-[64px]">
              Satu aplikasi<br />
              <span className="bg-gradient-to-r from-[#d95b2b] via-[#e07a3e] to-[#e0a259] bg-clip-text text-transparent">untuk seluruh cabang.</span>
            </h1>

            <p className="mt-6 max-w-lg text-[15px] font-medium leading-[1.9] text-[#8b7561] sm:text-base">
              Aplikasi resmi kasir, stok, dan laporan <strong className="font-bold text-[#5b4432]">Dimsum Mentai Waled Premium</strong>.
              Dipakai oleh tim internal untuk melayani pesanan lebih cepat dan rapi.
            </p>

            {/* CTA CARD */}
            <div className="mt-9 rounded-[26px] border border-[#eddfd0] bg-white/90 p-5 shadow-[0_24px_60px_-40px_rgba(93,58,28,0.55)] backdrop-blur sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#a08063]">
                  <Smartphone size={14} /> Perangkat terdeteksi: {platformLabel}
                </span>
                {standalone && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#eef4e7] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#6d8b55]">
                    <CheckCircle2 size={11} /> Terpasang
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                {device === "ios" ? (
                  <button
                    type="button"
                    onClick={() => setGuideOpen(true)}
                    className="group inline-flex flex-1 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#dc6636] to-[#e6884b] px-6 py-4 text-[15px] font-black text-white shadow-[0_16px_32px_-16px_rgba(216,95,45,0.9)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_34px_-14px_rgba(216,95,45,0.85)]"
                  >
                    <Apple size={20} className="transition group-hover:scale-110" />
                    Cara pasang di iPhone
                  </button>
                ) : (
                  <a
                    href={apkReady ? apkUrl : undefined}
                    download={apkReady ? release.downloadName : undefined}
                    aria-disabled={!apkReady}
                    onClick={(event) => { if (!apkReady) event.preventDefault(); }}
                    className={`group inline-flex flex-1 items-center justify-center gap-3 rounded-2xl px-6 py-4 text-[15px] font-black text-white transition ${
                      apkReady
                        ? "bg-gradient-to-r from-[#dc6636] to-[#e6884b] shadow-[0_16px_32px_-16px_rgba(216,95,45,0.9)] hover:-translate-y-0.5"
                        : "cursor-not-allowed bg-[#d9c6b2] shadow-none"
                    }`}
                  >
                    <Download size={20} className={apkReady ? "transition group-hover:translate-y-0.5" : ""} />
                    {apkReady ? "Unduh APK Android" : "APK sedang disiapkan"}
                  </a>
                )}

                <button
                  type="button"
                  onClick={installPwa}
                  className="inline-flex flex-1 items-center justify-center gap-2.5 rounded-2xl border border-[#e3d3c1] bg-[#fffaf3] px-5 py-4 text-[13px] font-bold text-[#6d523b] transition hover:border-[#d9bda2] hover:bg-[#fdf1e4]"
                >
                  <Plus size={17} />
                  {installState === "installed" ? "Sudah terpasang" : "Pasang via browser"}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] font-semibold text-[#a28a73]">
                <span className="inline-flex items-center gap-1.5"><HardDrive size={12} /> {apkSize || "Menunggu build"} </span>
                <span className="inline-flex items-center gap-1.5"><Smartphone size={12} /> Android {release.minAndroid}+</span>
                <span className="inline-flex items-center gap-1.5"><RefreshCw size={12} /> {builtAt || "Belum dirilis"}</span>
              </div>

              {!apkReady && (
                <p className="mt-3 rounded-xl bg-[#fdf2e5] px-3.5 py-2.5 text-[11px] font-medium leading-relaxed text-[#a97a4b]">
                  Build APK baru sedang diproses otomatis. Halaman ini akan langsung menyediakan tombol unduh setelah selesai.
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-[11px] font-semibold text-[#9a7f65]">
              <span className="inline-flex items-center gap-2"><CheckCircle2 size={14} className="text-[#7d9a63]" /> Gratis untuk tim internal</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 size={14} className="text-[#7d9a63]" /> Tanpa iklan</span>
              <Link href="/katalog" className="inline-flex items-center gap-1.5 text-[#c06a37] hover:underline">
                Lihat katalog menu <ExternalLink size={12} />
              </Link>
            </div>
          </motion.div>

          {/* PHONE PREVIEW */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
            className="relative mx-auto w-full max-w-[340px]"
          >
            <div aria-hidden className="absolute inset-x-8 bottom-6 top-16 rounded-[52px] bg-[#e9c7a8]/50 blur-2xl" />
            <div className="relative rounded-[46px] border border-[#2f2118] bg-gradient-to-b from-[#3a2a20] to-[#241a13] p-3 shadow-[0_40px_80px_-40px_rgba(58,35,18,0.75)]">
              <div className="relative overflow-hidden rounded-[36px] bg-[#fffaf3]">
                <div className="flex items-center justify-between px-6 pb-2 pt-4 text-[9px] font-bold text-[#7c6047]">
                  <span>9:41</span>
                  <span className="flex items-center gap-1"><Wifi size={10} /> 4G</span>
                </div>
                <div className="px-5 pb-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img src="/logo.svg" alt="" className="h-9 w-9" />
                      <span className="text-[8px] font-bold uppercase leading-[1.6] tracking-[1px] text-[#8d6b4c]">
                        Dimsum Mentai<br /><strong className="text-[10px] tracking-[0.6px] text-[#3f2d22]">Waled Premium</strong>
                      </span>
                    </div>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f6e7d5] text-[9px] font-bold text-[#b0763f]">AW</span>
                  </div>

                  <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#e06a37] to-[#ef9159] p-5 text-white shadow-[0_18px_30px_-20px_rgba(200,85,38,0.9)]">
                    <div aria-hidden className="absolute -right-10 -top-10 h-32 w-32 rounded-full border border-white/20" />
                    <p className="text-[7px] font-bold uppercase tracking-[0.18em] text-[#ffe6cd]">Shift sore · Cabang Waled</p>
                    <h3 className="mt-2 text-[19px] font-extrabold leading-tight tracking-[-0.5px]">Siap melayani<br />pesanan baru.</h3>
                    <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#fffaf0] py-2.5 text-[10px] font-extrabold text-[#c05a2f]">
                      Mulai transaksi <ChevronRight size={13} />
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    <div className="rounded-2xl border border-[#efe3d5] bg-white/80 p-3">
                      <p className="text-[8px] font-semibold text-[#a58a70]">Pesanan hari ini</p>
                      <p className="mt-1 text-[17px] font-extrabold tracking-tight text-[#3f2d22]">128</p>
                    </div>
                    <div className="rounded-2xl border border-[#efe3d5] bg-white/80 p-3">
                      <p className="text-[8px] font-semibold text-[#a58a70]">Pendapatan</p>
                      <p className="mt-1 text-[17px] font-extrabold tracking-tight text-[#3f2d22]">4,2jt</p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {["Kasir", "Stok", "Riwayat"].map((item) => (
                      <div key={item} className="rounded-xl border border-[#f0e5d7] bg-white/70 py-2.5 text-center text-[8px] font-bold text-[#8a6d52]">{item}</div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-around border-t border-[#f0e5d7] bg-white/80 px-4 pb-4 pt-2.5">
                  {[["Beranda", true], ["Stok", false], ["Kasir", false], ["Riwayat", false], ["Akun", false]].map(([label, active]) => (
                    <span key={label} className={`text-[7px] font-bold ${active ? "text-[#d3743e]" : "text-[#c2ac96]"}`}>{label}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute -right-3 top-24 hidden rounded-2xl border border-[#efe2d3] bg-white/95 px-3.5 py-3 shadow-[0_16px_30px_-20px_rgba(92,58,28,0.6)] backdrop-blur sm:block">
              <p className="text-[8px] font-bold uppercase tracking-wider text-[#b0906f]">Sinkron live</p>
              <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-[#5e7d49]"><span className="h-1.5 w-1.5 rounded-full bg-[#6d9463]" /> Terhubung</p>
            </div>
          </motion.div>
        </section>

        {/* FEATURES */}
        <section className="border-y border-[#f0e5d7] bg-white/60">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 px-5 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:py-16">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-3xl border border-[#f0e5d7] bg-white p-5 shadow-[0_10px_30px_-25px_rgba(92,58,28,0.6)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-28px_rgba(92,58,28,0.6)]"
              >
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fdf0e2] text-[#cd6b34]">
                  <feature.icon size={20} />
                </span>
                <h3 className="text-[13px] font-extrabold tracking-tight text-[#3f2d22]">{feature.title}</h3>
                <p className="mt-2 text-[11px] font-medium leading-[1.8] text-[#9a8068]">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* INSTALL GUIDE */}
        <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
          <div className="mb-10 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#b49070]">Panduan pemasangan</p>
            <h2 className="mt-3 text-[32px] font-black tracking-[-1.2px] text-[#33241a] sm:text-[40px]">Pilih sesuai perangkat Anda.</h2>
            <p className="mx-auto mt-3 max-w-xl text-[13px] font-medium leading-relaxed text-[#94806a]">
              Android memakai file APK. iPhone dan iPad memakai mode PWA lewat Safari, tanpa perlu App Store.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* ANDROID */}
            <div className="relative overflow-hidden rounded-[30px] border border-[#eddfd0] bg-white p-6 shadow-[0_20px_50px_-40px_rgba(92,58,28,0.6)] sm:p-8">
              <div aria-hidden className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#7d9a63]/8 blur-2xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef4e7] text-[#6d8b55]"><Smartphone size={23} /></span>
                  <div>
                    <h3 className="text-lg font-extrabold tracking-tight text-[#3f2d22]">Android</h3>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7d9a63]">File APK · langsung pasang</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#f6f2ec] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#a28a73]">
                  {apkSize || "—"}
                </span>
              </div>

              <ol className="relative mt-7 space-y-5">
                {[
                  apkReady ? "Ketuk tombol oranye “Unduh APK Android” di bagian atas halaman." : "Tunggu proses build APK selesai, lalu muat ulang halaman ini.",
                  `Simpan file ${release.downloadName || "Dimsum-Waled-Premium.apk"} di perangkat.`,
                  "Buka file tersebut. Jika muncul peringatan, pilih “Tetap instal”.",
                  "Izinkan “Instal dari sumber tidak dikenal” saat Android memintanya.",
                  "Selesai — ikon Dimsum Waled muncul di layar utama.",
                ].map((step, index) => (
                  <li key={step} className="flex gap-3.5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eef4e7] text-[10px] font-extrabold text-[#6d8b55] ring-1 ring-[#dbe7d0]">{index + 1}</span>
                    <p className="text-[12px] font-medium leading-[1.75] text-[#7f6a57]">{step}</p>
                  </li>
                ))}
              </ol>

              <div className="mt-7 flex flex-wrap items-center gap-2 rounded-2xl bg-[#fbf7f0] p-3.5 text-[10px] font-semibold text-[#a08870]">
                <ShieldCheck size={14} className="text-[#7d9a63]" />
                Hanya unduh dari halaman ini. Jangan bagikan file APK ke luar tim.
              </div>
            </div>

            {/* IPHONE */}
            <div className="relative overflow-hidden rounded-[30px] border border-[#eddfd0] bg-white p-6 shadow-[0_20px_50px_-40px_rgba(92,58,28,0.6)] sm:p-8">
              <div aria-hidden className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#dc6636]/8 blur-2xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fdf0e2] text-[#cd6b34]"><Apple size={22} /></span>
                  <div>
                    <h3 className="text-lg font-extrabold tracking-tight text-[#3f2d22]">iPhone / iPad</h3>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#cd6b34]">PWA · lewat Safari</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#f6f2ec] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#a28a73]">Tanpa App Store</span>
              </div>

              <ol className="relative mt-7 space-y-5">
                {[
                  "Wajib buka halaman ini dengan Safari, bukan Chrome atau browser lain di iPhone.",
                  "Ketuk ikon Share (kotak dengan panah ke atas) di bilah bawah Safari.",
                  "Gulir menu lalu pilih “Tambah ke Layar Utama” (Add to Home Screen).",
                  "Ketuk “Tambah”. Ikon Dimsum Waled langsung tampil di layar utama.",
                  "Setelah itu selalu buka aplikasi dari ikon tersebut agar tampil layar penuh.",
                ].map((step, index) => (
                  <li key={step} className="flex gap-3.5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fdf0e2] text-[10px] font-extrabold text-[#cd6b34] ring-1 ring-[#f4ddc8]">{index + 1}</span>
                    <p className="text-[12px] font-medium leading-[1.75] text-[#7f6a57]">{step}</p>
                  </li>
                ))}
              </ol>

              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#e6d5c3] bg-[#fffaf3] px-4 py-3 text-[11px] font-bold text-[#8a5f3c] transition hover:bg-[#fdf1e4]"
              >
                <Share size={15} /> Lihat panduan bergambar
              </button>
            </div>
          </div>
        </section>

        {/* RELEASE INFO */}
        <section className="mx-auto w-full max-w-6xl px-5 pb-16 sm:px-8">
          <div className="rounded-[28px] border border-[#eddfd0] bg-white p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#b49070]">Informasi rilis</p>
                <h2 className="mt-2 text-xl font-black tracking-tight text-[#3f2d22]">Dimsum Waled {release.version}</h2>
              </div>
              <span className={`rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider ${apkReady ? "bg-[#eef4e7] text-[#6d8b55]" : "bg-[#fdf2e5] text-[#a97a4b]"}`}>
                {apkReady ? "Siap digunakan" : "Menunggu build"}
              </span>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ["Versi", release.version],
                ["Ukuran", apkSize || "—"],
                ["Minimum Android", `${release.minAndroid}+`],
                ["Tanggal rilis", builtAt || "—"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-[#fbf7f0] px-4 py-3">
                  <dt className="text-[9px] font-bold uppercase tracking-wider text-[#b09a83]">{label}</dt>
                  <dd className="mt-1 text-[12px] font-extrabold text-[#4a3525]">{value}</dd>
                </div>
              ))}
            </dl>

            {release.sha256 && (
              <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-[#fbf7f0] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[#b09a83]">Checksum SHA-256</p>
                  <code className="mt-1 block truncate text-[10px] font-semibold text-[#7b6450]">{release.sha256}</code>
                </div>
                <button type="button" onClick={copyChecksum} className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-[#e6d5c3] px-2.5 py-1.5 text-[9px] font-bold text-[#8a6a4d] transition hover:bg-white sm:self-auto">
                  {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? "Tersalin" : "Salin"}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto w-full max-w-4xl px-5 pb-20 sm:px-8">
          <h2 className="mb-6 text-center text-2xl font-black tracking-tight text-[#33241a]">Pertanyaan yang sering muncul</h2>
          <div className="space-y-3">
            {[
              ["Kenapa Android memperingatkan file berbahaya?", "Karena aplikasi dipasang di luar Play Store. Selama file diunduh dari halaman resmi ini, peringatan tersebut aman untuk dilewati dengan memilih “Tetap instal”."],
              ["Apa bedanya APK dengan PWA di iPhone?", "APK adalah aplikasi Android yang dipasang langsung. iPhone tidak mengizinkan APK, sehingga aplikasi dipasang sebagai PWA lewat Safari dan tetap tampil seperti aplikasi biasa."],
              ["Apakah data saya aman?", "Semua data berjalan melalui koneksi HTTPS dan hanya bisa diakses akun yang terdaftar. Aplikasi tidak menyimpan password di perangkat."],
              ["Aplikasi tidak bisa dibuka setelah dipasang?", "Pastikan perangkat terhubung internet, lalu buka kembali aplikasi. Jika masih gagal, hapus dan pasang ulang versi terbaru dari halaman ini."],
            ].map(([question, answer]) => (
              <details key={question} className="group rounded-2xl border border-[#eddfd0] bg-white px-5 py-4 open:shadow-[0_16px_40px_-32px_rgba(92,58,28,0.6)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[12px] font-extrabold text-[#4a3525]">
                  {question}
                  <ChevronRight size={16} className="shrink-0 text-[#c0a488] transition group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-[11px] font-medium leading-[1.85] text-[#907a65]">{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="relative overflow-hidden border-t border-[#234034]/10 bg-[#2b2019] py-14 text-center">
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#dc6636]/60 to-transparent" />
        <p className="text-[9px] font-bold uppercase tracking-[0.32em] text-[#a08d7d]">Design &amp; engineered by</p>
        <div className="mx-auto mt-5 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-7 py-3.5 backdrop-blur">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-[#dc6636] to-[#e8a55f]">
            <Zap size={15} className="fill-white text-white" />
          </span>
          <span className="bg-gradient-to-r from-white via-[#fff4e8] to-[#c9b3a2] bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-3xl">AZZAM CODEX</span>
        </div>
        <p className="mt-6 text-[10px] font-medium text-[#8d7a6b]">© {new Date().getFullYear()} Dimsum Mentai Waled Premium · Internal Use Only</p>
      </footer>

      {/* IOS / PWA GUIDE MODAL */}
      <AnimatePresence>
        {guideOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-[#2b2019]/55 p-0 backdrop-blur-sm sm:items-center sm:p-6"
            onClick={() => setGuideOpen(false)}
            role="dialog" aria-modal="true" aria-label="Panduan memasang aplikasi"
          >
            <motion.div
              initial={{ y: 40, opacity: 0.6, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              onClick={(event) => event.stopPropagation()}
              className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[30px] bg-[#fffaf3] p-6 shadow-2xl sm:rounded-[30px] sm:p-8"
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fdf0e2] text-[#cd6b34]">
                    {device === "ios" ? <Apple size={21} /> : <Download size={21} />}
                  </span>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#b49070]">Panduan pemasangan</p>
                    <h3 className="text-lg font-black tracking-tight text-[#33241a]">{device === "ios" ? "Pasang di iPhone / iPad" : "Pasang aplikasi di perangkat ini"}</h3>
                  </div>
                </div>
                <button type="button" onClick={() => setGuideOpen(false)} aria-label="Tutup panduan" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f4e9dc] text-[#8d7159] transition hover:bg-[#efe0cf]">
                  <X size={16} />
                </button>
              </div>

              {device === "ios" ? (
                <>
                  <div className="mb-5 flex items-center gap-2 rounded-2xl bg-[#fdf2e5] px-4 py-3 text-[11px] font-semibold leading-relaxed text-[#a97a4b]">
                    <Share size={15} className="shrink-0" />
                    Gunakan Safari. Di iPhone, tombol “Tambah ke Layar Utama” tidak tersedia di Chrome.
                  </div>
                  <ol className="space-y-4">
                    {[
                      ["Buka halaman aplikasi", "Ketuk tombol di bawah untuk membuka Portal Karyawan di Safari.", "buka"],
                      ["Ketuk ikon Share", "Ikon kotak dengan panah ke atas, biasanya di bilah bawah Safari.", "share"],
                      ["Pilih Tambah ke Layar Utama", "Gulir daftar menu ke bawah sampai menemukan opsi tersebut.", "add"],
                      ["Ketuk Tambah", "Aplikasi langsung muncul di layar utama dan siap dibuka layar penuh.", "done"],
                    ].map(([title, desc, key], index) => (
                      <li key={title} className="flex gap-3.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[11px] font-extrabold text-[#cd6b34] ring-1 ring-[#f0dfcd]">
                          {key === "share" ? <Share size={14} /> : key === "add" ? <Plus size={14} /> : key === "done" ? <CheckCircle2 size={14} /> : index + 1}
                        </span>
                        <div>
                          <p className="text-[12px] font-extrabold text-[#4a3525]">{title}</p>
                          <p className="mt-1 text-[11px] font-medium leading-relaxed text-[#9a8068]">{desc}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
                    <Link href="/portal-karyawan" onClick={() => setGuideOpen(false)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#dc6636] to-[#e6884b] px-5 py-3.5 text-[13px] font-black text-white">
                      Buka Portal Karyawan <ArrowRight size={15} />
                    </Link>
                    <button type="button" onClick={() => setGuideOpen(false)} className="inline-flex items-center justify-center rounded-2xl border border-[#e6d5c3] px-5 py-3.5 text-[12px] font-bold text-[#8a6a4d]">
                      Nanti saja
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[12px] font-medium leading-[1.8] text-[#907a65]">
                    Pasang aplikasi lewat browser agar tampil layar penuh tanpa address bar. Jika tombol pemasangan otomatis tidak muncul,
                    gunakan menu browser lalu pilih <strong className="font-bold text-[#4a3525]">“Instal aplikasi”</strong> atau
                    <strong className="font-bold text-[#4a3525]"> “Tambahkan ke layar utama”</strong>.
                  </p>
                  <div className="mt-5 rounded-2xl border border-[#eddfd0] bg-white p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#b09a83]">Alamat aplikasi</p>
                    <code className="mt-1 block break-all text-[11px] font-semibold text-[#7b6450]">/portal-karyawan</code>
                  </div>
                  <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
                    {installPrompt ? (
                      <button
                        type="button"
                        onClick={async () => { await installPwa(); setGuideOpen(false); }}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#dc6636] to-[#e6884b] px-5 py-3.5 text-[13px] font-black text-white"
                      >
                        <Download size={15} /> Pasang sekarang
                      </button>
                    ) : (
                      <Link
                        href="/portal-karyawan"
                        onClick={() => setGuideOpen(false)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#dc6636] to-[#e6884b] px-5 py-3.5 text-[13px] font-black text-white"
                      >
                        Buka aplikasi <ArrowRight size={15} />
                      </Link>
                    )}
                    <button type="button" onClick={() => setGuideOpen(false)} className="inline-flex items-center justify-center rounded-2xl border border-[#e6d5c3] px-5 py-3.5 text-[12px] font-bold text-[#8a6a4d]">
                      Tutup
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
