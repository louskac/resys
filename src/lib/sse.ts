type ClientController = ReadableStreamDefaultController;

// Global registry of clients grouped by tenantId
// We store this on globalThis to prevent Next.js hot-reloading from resetting the map in development
const globalForSSE = globalThis as unknown as {
  sseClients: Map<string, Set<ClientController>>;
};

if (!globalForSSE.sseClients) {
  globalForSSE.sseClients = new Map();
}

const sseClients = globalForSSE.sseClients;

/**
 * Registers an active client's stream controller under a tenantId.
 */
export function registerClient(tenantId: string, controller: ClientController) {
  if (!sseClients.has(tenantId)) {
    sseClients.set(tenantId, new Set());
  }
  sseClients.get(tenantId)!.add(controller);
}

/**
 * Unregisters a client's stream controller.
 */
export function unregisterClient(tenantId: string, controller: ClientController) {
  const tenantClients = sseClients.get(tenantId);
  if (tenantClients) {
    tenantClients.delete(controller);
    if (tenantClients.size === 0) {
      sseClients.delete(tenantId);
    }
  }
}

/**
 * Broadcasts an update message to all connected client streams for the specified tenant.
 */
export function sendSSEUpdate(tenantId: string) {
  const tenantClients = sseClients.get(tenantId);
  if (!tenantClients) return;

  const encoder = new TextEncoder();
  // Standard SSE message format: event name followed by data payload and double newline
  const data = encoder.encode("event: bookings-updated\ndata: {}\n\n");

  console.log(`Broadcasting SSE bookings-updated to ${tenantClients.size} clients for tenant: ${tenantId}`);

  for (const client of tenantClients) {
    try {
      client.enqueue(data);
    } catch {
      // Connection has closed or failed; remove the client
      tenantClients.delete(client);
    }
  }

  if (tenantClients.size === 0) {
    sseClients.delete(tenantId);
  }
}
