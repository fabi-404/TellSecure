// This file is part of the server-side configuration
// It defines how Auth.js should behave
export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }: any) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      return true;
    },
    jwt({ token, user }: any) {
       if (user) {
         token.tenantId = user.tenantId;
       }
       return token;
    },
    session({ session, token }: any) {
       if (session.user) {
         session.user.tenantId = token.tenantId;
       }
       return session;
    }
  },
  providers: [], // Configured in auth.ts
} satisfies any; // Types removed for frontend compatibility in this view