import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/auth/login',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAdmin = nextUrl.pathname.startsWith('/admin');
      const isOnKitchen = nextUrl.pathname.startsWith('/kitchen');
      
      if (isOnAdmin) {
        if (isLoggedIn) {
          return (auth.user as any).role === 'ADMIN';
        }
        return false; // Redirect to login
      }
      
      if (isOnKitchen) {
        if (isLoggedIn) {
          const role = (auth.user as any).role;
          return role === 'KITCHEN' || role === 'ADMIN';
        }
        return false; // Redirect to login
      }
      
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id as string;
      }
      return session;
    },
  },
  providers: [], // Configured in auth.ts
} satisfies NextAuthConfig;
