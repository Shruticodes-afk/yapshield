/**
 * SERVER-ONLY MODULE
 *
 * Provides LLM client integration using Google Generative AI (Gemini).
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Creates a Gemini LLM runner that executes inference on sanitized prompts.
 * Throws a clear error if GEMINI_API_KEY is not set.
 */
export function makeGeminiLlm(): (sanitizedPrompt: string) => Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing. Please configure GEMINI_API_KEY in environment.');
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  return async (sanitizedPrompt: string): Promise<string> => {
    const result = await model.generateContent(sanitizedPrompt);
    const response = await result.response;
    return response.text();
  };
}

export default makeGeminiLlm;
