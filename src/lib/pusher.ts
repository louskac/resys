import PusherServer from "pusher";

const appId = process.env.PUSHER_APP_ID;
const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
const secret = process.env.PUSHER_SECRET;
const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu";

let pusherServer: PusherServer | null = null;

// Initialize Pusher Server if credentials are present
if (appId && key && secret) {
  pusherServer = new PusherServer({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });
} else {
  // Gracefully log warning in development. In production, we'll suggest configuring this.
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "Pusher environment variables are not fully configured. Server-side real-time events are disabled. Falling back to smart polling."
    );
  }
}

export { pusherServer };

/**
 * Triggers a real-time event to notify clients that bookings have changed for a specific tenant.
 * @param tenantId The ID of the tenant where the booking was updated
 */
export async function triggerBookingUpdate(tenantId: string): Promise<boolean> {
  if (!pusherServer) {
    return false;
  }

  try {
    await pusherServer.trigger(`tenant-${tenantId}`, "bookings-updated", {
      timestamp: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error("Failed to trigger Pusher real-time event:", error);
    return false;
  }
}
