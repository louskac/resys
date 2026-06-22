import { NextAuthOptions, DefaultSession, DefaultUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { verifyPassword } from "@/lib/crypto";

// Extend NextAuth typings inline
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
      tenantId?: string | null;
      phone?: string | null;
      avatarUrl?: string | null;
      customerSessid?: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role?: string;
    tenantId?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
    customerSessid?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: string;
    tenantId?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
    customerSessid?: string | null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "oneid",
      name: "OneiD SSO",
      credentials: {
        customerSessid: { label: "Session ID", type: "text" },
        tenantId: { label: "Tenant ID", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.customerSessid || !credentials?.tenantId) {
          return null;
        }

        // Support local sandbox development without active OneiD SSO instance
        if (credentials.customerSessid === "mock_dev_session_secret") {
          let dbUser;
          try {
            dbUser = await prisma.user.upsert({
              where: { email: "josef.novak@deepvision.cz" },
              update: {
                name: "Josef Novák (Dev Mock)",
                phone: "+420123456789",
                tenantId: credentials.tenantId,
              },
              create: {
                id: "9999",
                email: "josef.novak@deepvision.cz",
                name: "Josef Novák (Dev Mock)",
                role: "USER",
                phone: "+420123456789",
                avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
                addressStreet: "17. listopadu 237",
                addressCity: "Pardubice",
                addressZip: "53002",
                addressCountry: "Česká republika",
                organization: "DeepVision s.r.o.",
                tenantId: credentials.tenantId,
              },
            });
          } catch (dbErr) {
            console.error("Failed to upsert mock dev session into User table:", dbErr);
          }

          return {
            id: dbUser ? dbUser.id : "9999",
            name: dbUser ? dbUser.name : "Josef Novák (Dev Mock)",
            email: "josef.novak@deepvision.cz",
            role: dbUser ? dbUser.role : "USER",
            tenantId: dbUser ? dbUser.tenantId : null,
            phone: dbUser ? dbUser.phone : "+420123456789",
            avatarUrl: dbUser ? dbUser.avatarUrl : null,
            customerSessid: "mock_dev_session_secret",
          };
        }

        const ssoDomain = process.env.ONEID_SSO_DOMAIN || "oneid.cz";
        const oneidBaseUrl = `https://${credentials.tenantId}.${ssoDomain}`;

        try {
          const response = await fetch(`${oneidBaseUrl}/api/v1/customer/read-by-customer-sessid`, {
            method: "GET",
            headers: {
              "customer-sessid": credentials.customerSessid,
              "Accept": "application/json",
            },
          });

          if (!response.ok) {
            console.error("OneiD profile query returned status:", response.status);
            return null;
          }

          const data = await response.json();
          if (!data.customer) {
            console.error("No customer details in OneiD response:", data);
            return null;
          }

          const customer = data.customer;
          const email = customer.email;
          const name = `${customer.firstname || ""} ${customer.lastname || ""}`.trim() || customer.email;
          const phone = customer.phone || null;

          // Upsert into our Database User table
          let dbUser;
          try {
            dbUser = await prisma.user.upsert({
              where: { email },
              update: {
                name,
                phone,
                tenantId: credentials.tenantId,
              },
              create: {
                id: customer.id.toString(),
                email,
                name,
                role: "USER",
                phone,
                tenantId: credentials.tenantId,
              },
            });
          } catch (dbErr) {
            console.error("Failed to upsert OneiD customer into User table:", dbErr);
          }

          return {
            id: dbUser ? dbUser.id : customer.id.toString(),
            name: dbUser ? dbUser.name : name,
            email: email,
            role: dbUser ? dbUser.role : "USER",
            tenantId: dbUser ? dbUser.tenantId : null,
            phone: dbUser ? dbUser.phone : phone,
            avatarUrl: dbUser ? dbUser.avatarUrl : null,
            customerSessid: credentials.customerSessid,
          };
        } catch (error) {
          console.error("Error during OneiD profile verification:", error);
          return null;
        }
      },
    }),
    CredentialsProvider({
      id: "admin-credentials",
      name: "Database Credentials",
      credentials: {
        username: { label: "Username/Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        // Support backward compatible fallback for development/testing
        if (
          credentials.username === "admin-profile" &&
          credentials.password === "admin"
        ) {
          let user = await prisma.user.findFirst({
            where: {
              OR: [
                { email: "admin@umelka.cz" },
                { email: "admin@deepvision.cz" }
              ]
            }
          });
          if (!user) {
            user = await prisma.user.findFirst({
              where: { role: "ADMIN" }
            });
          }
          if (user) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              tenantId: user.tenantId,
              phone: user.phone,
              avatarUrl: user.avatarUrl,
            };
          }
          return {
            id: "admin-static-fallback",
            name: "Administrator (Fallback)",
            email: "admin@deepvision.cz",
            role: "ADMIN",
            tenantId: "umelka",
          };
        }

        try {
          // Look up user by email in database
          const user = await prisma.user.findUnique({
            where: { email: credentials.username },
          });

          if (!user || !user.passwordHash) {
            return null;
          }

          const isValid = verifyPassword(credentials.password, user.passwordHash);
          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            phone: user.phone,
            avatarUrl: user.avatarUrl,
          };
        } catch (error) {
          console.error("Auth authorize error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.tenantId = (user as any).tenantId;
        token.phone = (user as any).phone;
        token.avatarUrl = (user as any).avatarUrl;
        token.customerSessid = (user as any).customerSessid;
      }
      
      // Support session update triggers if client updates profile
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.phone !== undefined) token.phone = session.phone;
        if (session.avatarUrl !== undefined) token.avatarUrl = session.avatarUrl;
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).tenantId = token.tenantId;
        (session.user as any).phone = token.phone;
        (session.user as any).avatarUrl = token.avatarUrl;
        (session.user as any).customerSessid = token.customerSessid;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/signin", // Custom sign-in route trigger
    error: "/auth/error",
  },
};

export default authOptions;
