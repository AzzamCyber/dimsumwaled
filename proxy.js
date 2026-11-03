import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
const adminPaths = ['/branches', '/users', '/products', '/categories', '/suppliers', '/purchases', '/price-notes', '/reports', '/shift-rules'];
export async function proxy(req) {
 const path = req.nextUrl.pathname;
 const publicRoute = path === '/portal-karyawan' || path.startsWith('/katalog') || path.startsWith('/download') || path.startsWith('/api/auth/') || path.startsWith('/assets/') || path.startsWith('/app/') || ['/logo.svg','/logo.png','/icon.png','/manifest.json','/favicon.ico','/sw.js','/offline.html'].includes(path);
 const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
 const authenticated = Boolean(token?.userId);
 if (path === '/portal-karyawan' && authenticated) return NextResponse.redirect(new URL('/', req.url));
 if (publicRoute) return NextResponse.next();
 if (!authenticated) return NextResponse.redirect(new URL('/portal-karyawan', req.url));
 if (token.role !== 'super_admin' && adminPaths.some(p => path === p || path.startsWith(p + '/'))) return NextResponse.redirect(new URL('/?access=denied', req.url));
 return NextResponse.next();
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
