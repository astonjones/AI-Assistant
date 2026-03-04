import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const hasGoogle = Boolean(googleClientId && googleClientSecret);

if (process.env.NODE_ENV !== "production") {
  console.log("[auth] API_URL:", process.env.API_URL);
  console.log("[auth] Google OAuth enabled:", hasGoogle);
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    ...(hasGoogle
      ? [
          Google({
            clientId: googleClientId!,
            clientSecret: googleClientSecret!,
          }),
        ]
      : []),

    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          // Hit your existing Express auth endpoint
          const res = await fetch(
            `${process.env.API_URL ?? "http://localhost:3000"}/auth/login`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
              }),
            }
          );

          if (!res.ok) return null;

          const user = await res.json();
          // Expected shape: { id, name, email, token }
          return user ?? null;
        } catch {
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // Persist API token in the JWT on first sign-in
      if (user) {
        token.id = user.id;
        token.apiToken = (user as { token?: string }).token;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose id + apiToken to the client session
      if (session.user) {
        (session.user as { id?: unknown }).id = token.id;
        (session as { apiToken?: unknown }).apiToken = token.apiToken;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: { strategy: "jwt" },
});
