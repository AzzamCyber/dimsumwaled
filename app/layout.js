import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import './cashier.css';
import SessionProvider from "@/components/providers/SessionProvider";
import AttendanceProvider from "@/components/providers/AttendanceProvider";
import { Toaster } from "react-hot-toast";
import AppShell from '@/components/layout/AppShell';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "DIMSUM MENTAI WALED PREMIUM | Pusat Kendali Usaha",
  description: "Kasir, stok, operasional, dan laporan seluruh cabang Dimsum Mentai Waled Premium.",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Dimsum Waled",
  },
};

export const viewport = {
  themeColor: "#d95627",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider>
            <Toaster position="top-center" toastOptions={{
              style: {
                borderRadius: '16px',
                background: '#ffffff',
                color: '#061d3d',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                border: '1px solid #f1f5f9',
                fontWeight: '600'
              }
            }} />
            <AppShell><AttendanceProvider>{children}</AttendanceProvider></AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
