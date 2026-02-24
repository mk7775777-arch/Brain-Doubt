import { GoogleGenAI, GenerateContentResponse, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: number;
  rating?: 'bad' | 'neutral' | 'good' | 'great';
  attachments?: {
    type: "image" | "audio";
    url: string;
    mimeType: string;
    data?: string; // base64
  }[];
}

export const SYSTEM_INSTRUCTION = `You are Braindoubt, an advanced AI Homework Assistant. 
Your goal is "Doubt Clearance" and deep understanding. 
When a student asks a question:
1. Identify the core concept.
2. Provide a step-by-step breakdown of the solution.
3. Explain the "why" and "how" behind each step.
4. Use clear, encouraging language.
5. If the user provides an image, analyze it carefully (OCR, math symbols, diagrams).
6. For math, use plain text formatting or bolding. DO NOT use dollar signs ($) as delimiters for math formulas.
7. For coding, explain the logic and provide clean code snippets.
8. For science, explain laws and processes.
9. For humanities, provide summaries or structural guidance.
10. Always end by asking if the student understands or if they have a follow-up question.
11. NEVER just give the answer without explanation. Focus on teaching.`;

export async function chatWithGemini(
  messages: Message[],
  onChunk?: (chunk: string) => void
) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("API_KEY_MISSING");
  }

  const model = "gemini-3-flash-preview";
  
  const chatHistory = messages.map((m) => ({
    role: m.role,
    parts: [
      ...(m.attachments?.map(a => ({
        inlineData: {
          mimeType: a.mimeType,
          data: a.data || ""
        }
      })) || []),
      { text: m.content }
    ]
  }));

  const lastMessage = chatHistory.pop();
  
  try {
    const response = await ai.models.generateContentStream({
      model,
      contents: [
        ...chatHistory,
        lastMessage!
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    let fullText = "";
    for await (const chunk of response) {
      const text = (chunk as GenerateContentResponse).text || "";
      fullText += text;
      if (onChunk) onChunk(text);
    }
    return fullText;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
