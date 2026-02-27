import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach auth token if present (client-side only)
if (typeof window !== "undefined") {
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
}

// ─── Agent ──────────────────────────────────────────────────────────────────

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface AgentResponse {
  response: string;
  conversationHistory?: Message[];
}

export async function sendAgentMessage(
  messages: Message[],
  signal?: AbortSignal
): Promise<AgentResponse> {
  const { data } = await api.post<AgentResponse>(
    "/agent/chat",
    { messages },
    { signal }
  );
  return data;
}

// ─── Health ─────────────────────────────────────────────────────────────────

export async function checkHealth() {
  const { data } = await api.get("/health");
  return data;
}
