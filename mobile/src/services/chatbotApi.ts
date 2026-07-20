import { api, ensureCsrfToken } from './api';

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
    const res = await api.post<ChatbotResponse>(
      '/chatbot/ask',
      { question },
      { headers: { 'x-csrf-token': token } }
    );
    return res.data;
  },
};
