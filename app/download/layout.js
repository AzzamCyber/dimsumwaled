const SITE_URL = "https://dimsumwaled.azzamcodex.dev";
const TITLE = "Download Aplikasi Dimsum Waled Premium";
const DESCRIPTION =
  "Unduh aplikasi resmi kasir, stok, dan laporan Dimsum Mentai Waled Premium untuk Android (APK) atau pasang di iPhone lewat Safari. Khusus staf internal.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: `${SITE_URL}/download`,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/download`,
    siteName: "DIMSUM MENTAI WALED PREMIUM",
    images: [
      {
        url: `${SITE_URL}/assets/download-og.png`,
        width: 1200,
        height: 630,
        alt: "Aplikasi Dimsum Mentai Waled Premium",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [`${SITE_URL}/assets/download-og.png`],
  },
};

export default function DownloadLayout({ children }) {
  return <>{children}</>;
}
