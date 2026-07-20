import { api } from "@/lib/api";

const ensureCsrfToken = async () => {
  const response = await api.get<{ data: { csrfToken: string } }>("/csrf-token");
  return response.data.data.csrfToken;
};

export interface ChatbotSource {
  question: string;
  answer: string;
  score: number;
}

export interface ChatbotResponse {
  success: boolean;
  answer: string;
  has_context: boolean;
  sources?: ChatbotSource[];
}

export const chatbotApi = {
  ask: async (question: string): Promise<ChatbotResponse> => {
    const token = await ensureCsrfToken();
    const res = await api.post("/chatbot/ask", { question }, {
      headers: { "x-csrf-token": token }
    });
    return res.data;
  }
};
