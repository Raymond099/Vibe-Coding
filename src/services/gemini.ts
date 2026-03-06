import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const getGeminiResponse = async (
  prompt: string, 
  code: string, 
  history: { role: string, parts: { text: string }[] }[],
  selectedUrls: string[] = []
) => {
  const contextPrompt = selectedUrls.length > 0 
    ? `\n\nAdditional Documentation Context (Focus on these sources):\n${selectedUrls.join('\n')}`
    : '';

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      ...history.map(h => ({ role: h.role, parts: h.parts })),
      {
        role: "user",
        parts: [{ text: `Current Code Context:\n\`\`\`\n${code}\n\`\`\`\n\nUser Request: ${prompt}${contextPrompt}` }]
      }
    ],
    config: {
      systemInstruction: `You are VibeAI, the core intelligence of VibeCode IDE. 
      Your capabilities include:
      1. Full-Stack Development: Writing code in any language (TypeScript, Python, Go, Rust, etc.).
      2. UI/UX Design: Designing beautiful, modern interfaces using Tailwind CSS and Framer Motion.
      3. Error Correction: Identifying and fixing bugs, performance bottlenecks, and security flaws.
      4. Ideation: Helping users brainstorm app ideas, features, and architectures.
      5. Native Preparation: Structuring code so it can be easily compiled to Native Desktop (Electron) or Mobile (Capacitor/React Native).
      6. Real-Time Research: You have access to Google Search and URL Context. Use them to find the latest documentation, library versions, best practices, and real-world data to inform your coding decisions.

      When asked to build an app or feature:
      - First, perform research if the request involves external APIs, new libraries, or specific technical requirements.
      - If the user has provided specific documentation URLs in the context, prioritize reading and applying information from those URLs using your URL Context tool.
      - Provide a "Vibe Plan" outlining the steps you'll take.
      - Provide the code in clear Markdown blocks. 
      - If you are updating an existing file, provide the full content of the file or a clear diff.
      - Always prioritize 'Vibe Coding'—making complex tasks feel simple through high-level abstractions.
      - Mention the sources you used for your research in your explanation.`,
      tools: [{ googleSearch: {} }, { urlContext: {} }]
    }
  });

  // Extract grounding metadata if available
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(chunk => ({
    title: chunk.web?.title,
    uri: chunk.web?.uri
  })).filter(s => s.title && s.uri) || [];

  return {
    text: response.text,
    sources
  };
};
