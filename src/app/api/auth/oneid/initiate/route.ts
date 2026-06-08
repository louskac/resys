import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tenantId = searchParams.get("tenantId");
  
  if (!tenantId) {
    return NextResponse.json(
      { error: "tenantId parameter is required" },
      { status: 400 }
    );
  }

  const ssoDomain = process.env.ONEID_SSO_DOMAIN || "oneid.cz";
  const oneidBaseUrl = `https://${tenantId}.${ssoDomain}`;
  
  const host = request.headers.get("host") || "";
  
  // Use http or https depending on environment
  const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http:" : "https:";
  
  // The callback URL where OneiD redirects after sign in
  const redirectUri = `${protocol}//${host}/auth/callback`;

  try {
    const response = await fetch(`${oneidBaseUrl}/api/v1/customer/sign/oauth2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        redirectUri,
        customSessionGroup: null,
        expiration: "30 DAYS",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OneiD auth initiation failed: ${response.status} - ${errorText}`);
      
      // If we are in local development and OneiD service isn't active on that port,
      // redirect immediately to mock callback to simulate successful sign-in
      if (host.includes("localhost") || host.includes("127.0.0.1")) {
        console.warn("OneiD service offline in dev environment. Redirecting directly to local mock callback...");
        const mockCallbackUrl = new URL(`/auth/callback`, `${protocol}//${host}`);
        mockCallbackUrl.searchParams.set("customerSessid", "mock_dev_session_secret");
        mockCallbackUrl.searchParams.set("oAuth2Token", "mock_dev_oauth2_token");
        return NextResponse.redirect(mockCallbackUrl.toString());
      }
      
      throw new Error(`Failed to initialize OneiD session (status: ${response.status})`);
    }

    const data = await response.json();
    if (!data.signInUrl) {
      throw new Error("OneiD response did not return a valid signInUrl");
    }

    // Redirect user browser to OneiD login page
    return NextResponse.redirect(data.signInUrl);
  } catch (error: any) {
    console.error("SSO Initiation Error:", error);
    
    // Resilient fallback for dev sandbox (mock sign-in)
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      const mockCallbackUrl = new URL(`/auth/callback`, `${protocol}//${host}`);
      mockCallbackUrl.searchParams.set("customerSessid", "mock_dev_session_secret");
      mockCallbackUrl.searchParams.set("oAuth2Token", "mock_dev_oauth2_token");
      return NextResponse.redirect(mockCallbackUrl.toString());
    }
    
    return NextResponse.redirect(
      new URL(`/auth/error?error=OAuthInitiationFailed&details=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
