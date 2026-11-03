"use client";
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
export default function PageHeader({ title }) {
 const router = useRouter();
 return <header className="page-heading"><button onClick={() => router.push('/')} aria-label="Kembali ke dashboard"><ArrowLeft size={17}/></button><div><small>DIMSUM MENTAI WALED PREMIUM</small><h1>{title}</h1></div></header>;
}
