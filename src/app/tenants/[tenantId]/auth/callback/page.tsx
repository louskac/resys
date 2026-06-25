"use client";

import { signIn } from "next-auth/react";
import { useEffect, Suspense } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";

function CallbackHandler() {
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();

  const customerSessid = searchParams.get("customerSessid");
  const tenantId = params.tenantId as string;

  useEffect(() => {
    if (customerSessid && tenantId) {
      // Trigger NextAuth credentials flow with custom token
      signIn("oneid", {
        customerSessid,
        tenantId,
        redirect: false,
      }).then((result) => {
        if (result?.error) {
          console.error("Sign-in failed:", result.error);
          router.push(`/auth/error?error=${encodeURIComponent(result.error)}`);
        } else {
          // Redirect to stored post-login redirect path or fallback to home
          const redirectUrl = localStorage.getItem("post_login_redirect") || "/";
          localStorage.removeItem("post_login_redirect");
          window.location.href = redirectUrl;
        }
      });
    } else {
      console.error("Missing customerSessid or tenantId parameter in callback");
      router.push("/auth/error?error=InvalidSessionParameters");
    }
  }, [customerSessid, tenantId, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground font-sans transition-colors duration-150">
      <div className="flex flex-col items-center gap-4 bg-white/40 dark:bg-[#0D0D15]/40 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] p-8 rounded-none shadow-xl max-w-sm w-full text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 dark:border-[#1F1F35] border-t-tenant-primary"></div>
        <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-2 select-none tracking-tight">
          Ověřování přihlášení
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Čekejte prosím, probíhá bezpečné přihlašování přes OneiD...
        </p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground font-sans transition-colors duration-150">
        <div className="flex flex-col items-center gap-4 bg-white/40 dark:bg-[#0D0D15]/40 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] p-8 rounded-none shadow-xl max-w-sm w-full text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 dark:border-[#1F1F35] border-t-tenant-primary"></div>
          <p className="text-xs text-muted-foreground">Načítání přihlašovací relace...</p>
        </div>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
