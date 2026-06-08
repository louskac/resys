import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

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
          return {
            id: "9999",
            name: "Josef Novák (Dev Mock)",
            email: "josef.novak@deepvision.cz",
            phone: "+420123456789",
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

          return {
            id: customer.id.toString(),
            name: `${customer.firstname || ""} ${customer.lastname || ""}`.trim() || customer.email,
            email: customer.email,
            phone: customer.phone || null,
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
      name: "Admin Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          credentials?.username === "admin-profile" &&
          credentials?.password === "admin"
        ) {
          return {
            id: "admin",
            name: "Administrator",
            email: "admin@deepvision.cz",
          };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.customerSessid = (user as any).customerSessid;
        token.phone = (user as any).phone;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).customerSessid = token.customerSessid;
        (session.user as any).phone = token.phone;
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
