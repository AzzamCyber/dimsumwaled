import 'server-only';
import CredentialsProvider from 'next-auth/providers/credentials';
import { supabase } from './supabase';
import security from './security.cjs';
export const authOptions = {
  providers: [CredentialsProvider({
    name: 'Akun Waled',
    credentials: { username: { label: 'Username', type: 'text' }, password: { label: 'Password', type: 'password' } },
    async authorize(credentials) {
      const username = String(credentials?.username || '').trim().toUpperCase();
      const password = String(credentials?.password || '');
      if (!username || username.length > 50 || !password || password.length > 256) return null;
      const { data: user, error } = await supabase.from('app_users').select('*').eq('username', username).maybeSingle();
      if (error || !user?.is_active || !security.verifyPassword(password, user.password)) return null;
      if (user.role !== 'super_admin') {
        const { data: branch } = await supabase.from('branches').select('id').eq('id', user.branch_id).eq('is_active', true).maybeSingle();
        if (!branch) return null;
      }
      if (!user.password.startsWith('scrypt$')) await supabase.from('app_users').update({ password: security.hashPassword(password) }).eq('id', user.id).eq('password', user.password);
      return { id: user.id, name: user.name, username: user.username, role: user.role, branch_id: user.branch_id };
    },
  })],
  callbacks: {
    async jwt({ token, user }) {
      if (user) Object.assign(token, { userId: user.id, role: user.role, username: user.username, branch_id: user.branch_id });
      return token;
    },
    async session({ session, token }) {
      if (session.user) Object.assign(session.user, { id: token.userId, role: token.role, username: token.username, branch_id: token.branch_id });
      return session;
    },
  },
  pages: { signIn: '/portal-karyawan' },
  session: { strategy: 'jwt', maxAge: 60 * 60 * 12 },
  secret: process.env.NEXTAUTH_SECRET,
};
