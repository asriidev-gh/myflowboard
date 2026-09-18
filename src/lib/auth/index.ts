import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { Provider } from "next-auth/providers";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Auth providers. Credentials are enabled now.
 * Add OAuth providers here later, e.g.:
 *
 * import Google from "next-auth/providers/google"
 * Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET })
 */
const providers: Provider[] = [
  Credentials({
    id: "credentials",
    name: "Email and Password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(rawCredentials) {
      const parsed = credentialsSchema.safeParse(rawCredentials);
      if (!parsed.success) {
        return null;
      }

      const email = parsed.data.email.toLowerCase().trim();
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user?.passwordHash) {
        return null;
      }

      const valid = await verifyPassword(
        parsed.data.password,
        user.passwordHash,
      );
      if (!valid) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
  }),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
  session: {
    // Credentials provider requires JWT sessions
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days (remember session)
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  trustHost: true,
});
