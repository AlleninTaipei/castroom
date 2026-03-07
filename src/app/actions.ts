'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

export async function getDirectorPrompt(userInput: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) {
  if (!apiKey || apiKey === "your_api_key_here" || !apiKey) {
    return "Error: API Key missing. Please check .env.local";
  }

  try {
    // consistently use gemini-3-flash-preview as per user's global preference
    const model = genAI.getGenerativeModel({ 
        model: "gemini-3-flash-preview",
        systemInstruction: "You are a creative video director. KEEP RESPONSES VERY CONCISE (max 20 words). ALWAYS RESPOND IN TRADITIONAL CHINESE (Taiwan style). Be encouraging and prompt the user to keep talking."
    });

    const chatSession = model.startChat({
      history: history,
      generationConfig: {
        maxOutputTokens: 250,
        temperature: 0.7,
      },
    });

    const result = await chatSession.sendMessage(userInput);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return `Director: ${error.message || "Keep going!"}`;
  }
}
