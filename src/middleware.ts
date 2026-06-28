import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  // Only intercept admin and kitchen dashboards and sub-pages
  matcher: ['/admin/:path*', '/kitchen/:path*'],
};
