
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `You are an elite API Architect and Security Analyst.
Your goal is to provide deep insights into API responses and requests.
Be concise, technical, and professional. Always use Markdown.`;

export const analyzeApiInsights = async (url: string, method: string, responseData: any) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Analyze this API exchange:
    Endpoint: [${method}] ${url}
    Payload: ${JSON.stringify(responseData, null, 2)}
    
    Provide:
    1. DOCUMENTATION: Description of all fields.
    2. JSON SCHEMA: Valid draft-07 schema.
    3. SECURITY: Potential leaks or header missing.`,
    config: { systemInstruction: SYSTEM_INSTRUCTION }
  });
  return response.text;
};

export const generateDocumentation = async (method: string, url: string, headers: any[], body: string, response?: any) => {
  const responseText = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Write a technical API documentation page for:
    Request: ${method} ${url}
    Headers: ${JSON.stringify(headers.filter(h => h.enabled))}
    Body: ${body}
    Response: ${response ? JSON.stringify(response) : 'Not available'}`,
    config: { systemInstruction: SYSTEM_INSTRUCTION }
  });
  return responseText.text;
};

export const optimizePayload = async (body: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Suggest optimizations for this JSON payload to reduce size or improve structure:
    ${body}`,
    config: { systemInstruction: "You are a payload optimization expert. Provide specific JSON restructuring tips." }
  });
  return response.text;
};

export const generateSnippets = async (method: string, url: string, headers: any[], body: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Generate high-quality client snippets for:
    ${method} ${url}
    Headers: ${JSON.stringify(headers.filter(h => h.enabled))}
    Body: ${body}
    
    Include: cURL, Fetch (JS), and C# (HttpClient with System.Text.Json).`,
    config: { systemInstruction: SYSTEM_INSTRUCTION }
  });
  return response.text;
};
