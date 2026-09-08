import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * Phase 1 auth: email + password, JWT sessions. Two roles matching the
 * access levels docs/blueprint.md already defines — DEALER (scoped to
 * exactly one Dealer.id, embedded in the token/session below) and
 * MANUFACTURER (whole-tenant, aggregate-only). No SSO, no password reset,
 * no MFA — real gaps for a production pilot beyond this Phase 1 scope, not
 * oversights; see docs/blueprint.md, "Known limitations."
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          dealerId: user.dealerId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.dealerId = user.dealerId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role;
      session.user.dealerId = token.dealerId;
      return session;
    },
  },
});
