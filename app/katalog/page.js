import { getPublicCatalog } from '@/lib/actions';
import CatalogClient from './CatalogClient';
import Link from 'next/link';
export const dynamic = 'force-dynamic';
export default async function KatalogPage({searchParams}) {
 const {cabang} = await searchParams;
 const data = await getPublicCatalog(cabang);
 return <main className="min-h-screen bg-background"><nav className="catalog-branches" aria-label="Pilih cabang katalog"><span className="section-caption">Pilih cabang:</span>{data.branches.map(b=><Link key={b.code} href={'/katalog?cabang='+b.code} aria-current={data.selected===b.code?'page':undefined}>{b.name}</Link>)}</nav><CatalogClient key={data.selected} initialProducts={data.products} settings={data.settings}/></main>;
}
