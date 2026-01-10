import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Server Error: GEMINI_API_KEY is missing in environment variables.");
    return res.status(500).json({ error: "Server Configuration Error: GEMINI_API_KEY missing" });
  }

  try {
    const { prompt, message, history, model, temperature, maxOutputTokens } = req.body || {};

    const input = prompt || message;
    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return res.status(400).json({ error: "Empty prompt" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const chosenModel = typeof model === "string" && model.trim().length > 0 ? model : "gemini-2.0-flash";
    const llm = genAI.getGenerativeModel({ model: chosenModel });

    const payloadSize = JSON.stringify(req.body || {}).length;
    console.log(`[AI Chat] Request received. Payload size: ${payloadSize} chars. model=${chosenModel}`);

    const safeHistory = Array.isArray(history)
      ? history
          .slice(-20)
          .map((h) => ({
            role: h?.role === "model" ? "model" : "user",
            parts: [{ text: String(h?.parts?.[0]?.text ?? h?.message ?? "") }],
          }))
          .filter((h) => h.parts[0].text.trim().length > 0)
      : [];

    const chat = llm.startChat({
      history: safeHistory,
      generationConfig: {
        temperature: typeof temperature === "number" ? temperature : 0.4,
        maxOutputTokens: typeof maxOutputTokens === "number" ? maxOutputTokens : 900,
      },
    });

    const result = await chat.sendMessage(input);
    const response = await result.response;

    return res.status(200).json({
      text: response.text(),
      model: chosenModel,
    });
  } catch (err) {
    const msg = err?.message ? String(err.message) : String(err);
    console.error("[AI Chat] Error:", msg);

    if (msg.includes("401") || msg.toLowerCase().includes("api key")) {
      return res.status(401).json({ error: "Invalid API Key configuration." });
    }
    if (msg.includes("429")) {
      return res.status(429).json({ error: "AI Traffic is too high. Please try again later." });
    }
    return res.status(500).json({ error: "AI Provider Error: " + msg });
  }
}
