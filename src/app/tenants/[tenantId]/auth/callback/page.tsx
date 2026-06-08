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
          router.push(redirectUrl);
        }
      });
    } else {
      console.error("Missing customerSessid or tenantId parameter in callback");
      router.push("/auth/error?error=InvalidSessionParameters");
    }
  }, [customerSessid, tenantId, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-t-emerald-500 border-slate-700"></div>
        <p className="text-lg font-medium text-slate-300">Signing you in securely via OneiD...</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white">
        <p className="text-lg">Loading session...</p>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
