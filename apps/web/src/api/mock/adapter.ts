// ─── Mock Adapter ───
// Routes requests from client.ts to the mock handlers.

import { handlers } from "./handlers";
import { endpoints } from "../endpoints";

// Recreate the BASE logic here to match URL strings exactly
const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: any;
  headers?: Record<string, string>;
  params?: Record<string, string | undefined>;
}

export async function mockRequest<T>(url: string, opts: RequestOptions = {}): Promise<T> {
  const method = opts.method || "GET";
  
  try {
    // ─── Auth ───
    if (method === "GET" && url === endpoints.me) return await handlers.me() as T;
    if (method === "POST" && url === endpoints.login) return await handlers.login(opts.body) as T;
    if (method === "POST" && url === endpoints.logout) return await handlers.logout() as T;
    
    // ─── Discovery ───
    if (method === "GET" && url === endpoints.events) return await handlers.getEvents(opts.params) as T;
    if (method === "GET" && url === endpoints.clubs) return await handlers.getClubs() as T;
    
    if (method === "GET" && url.startsWith(`${BASE}/events/`) && !url.includes("/register") && !url.includes("/waitlist")) {
       const id = url.split("/").pop();
       if (id) return await handlers.getEvent(id) as T;
    }
    if (method === "GET" && url.startsWith(`${BASE}/clubs/`)) {
       const id = url.split("/").pop();
       if (id) return await handlers.getClub(id) as T;
    }

    // ─── Registration ───
    if (method === "GET" && url === endpoints.myRegistrations) return await handlers.getMyRegistrations() as T;
    if (method === "POST" && url.includes("/register")) {
       const match = url.match(/\/events\/([^/]+)\/register/);
       if (match) return await handlers.register(match[1]) as T;
    }
    if (method === "POST" && url.includes("/waitlist")) {
       const match = url.match(/\/events\/([^/]+)\/waitlist/);
       if (match) return await handlers.joinWaitlist(match[1]) as T;
    }
    if (method === "GET" && url.includes("/waitlist")) {
       const match = url.match(/\/events\/([^/]+)\/waitlist/);
       if (match) return await handlers.getWaitlist(match[1]) as T;
    }
    if (method === "DELETE" && url.includes("/registration")) {
       const match = url.match(/\/events\/([^/]+)\/registration/);
       if (match) return await handlers.cancelRegistration(match[1]) as T;
    }

    // ─── Promotion ───
    if (method === "POST" && url.includes("/confirm")) {
       const match = url.match(/\/registrations\/([^/]+)\/confirm/);
       if (match) return await handlers.confirmPromotion(match[1]) as T;
    }
    if (method === "POST" && url.includes("/pass")) {
       const match = url.match(/\/registrations\/([^/]+)\/pass/);
       if (match) return await handlers.passPromotion(match[1]) as T;
    }

    // ─── Notifications ───
    if (method === "GET" && url === endpoints.notifications) return await handlers.getNotifications() as T;
    if (method === "POST" && url === endpoints.readAllNotifications) return await handlers.readAllNotifications() as T;
    if (method === "POST" && url.includes("/read")) {
       const match = url.match(/\/notifications\/([^/]+)\/read/);
       if (match) return await handlers.readNotification(match[1]) as T;
    }

    // Default error for unhandled mock routes
    throw {
      response: {
        status: 404,
        json: () => Promise.resolve({ error: { message: `Mock route not found: ${method} ${url}`, code: "NOT_FOUND" } })
      }
    };
  } catch (error: any) {
    if (error.response) {
       const errorData = await error.response.json();
       throw errorData; // Client expects this shape to parse ApiClientError
    }
    throw error;
  }
}
