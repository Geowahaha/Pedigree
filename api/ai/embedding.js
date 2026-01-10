
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("Server Error: GEMINI_API_KEY is missing.");
        return res.status(500).json({ error: 'Server Configuration Error' });
    }

    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'No text provided' });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "embedding-001" });

        const result = await model.embedContent(text);
        const embedding = result.embedding;

        return res.status(200).json({ embedding: embedding.values });

    } catch (error) {
        console.error("[AI Embedding] Error:", error.message);
        return res.status(500).json({ error: 'Embedding Failed' });
    }
}
