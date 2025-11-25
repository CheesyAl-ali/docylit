import { GoogleGenAI } from "@google/genai";

const getAI = () => {
    if (!process.env.API_KEY) {
        console.error("API_KEY is missing from environment variables");
        throw new Error("API Key not found");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateWritingAssistance = async (
    prompt: string,
    context: string,
    mode: 'continue' | 'summarize' | 'fix' | 'tone' | 'custom'
): Promise<string> => {
    try {
        const ai = getAI();
        let systemInstruction = "You are a helpful writing assistant integrated into a document editor. ";
        
        if (mode === 'continue') {
            systemInstruction += "Continue the text naturally based on the provided context. Keep formatting simple (HTML/Markdown).";
        } else if (mode === 'summarize') {
            systemInstruction += "Provide a concise summary of the provided text.";
        } else if (mode === 'fix') {
            systemInstruction += "Fix grammar and spelling errors in the provided text without changing the meaning.";
        } else if (mode === 'tone') {
            systemInstruction += "Rewrite the text to be more professional and concise.";
        } else if (mode === 'custom') {
            systemInstruction += "Follow the user's specific instructions for the provided text.";
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Context/Current Text: "${context}"\n\nTask: ${prompt}`,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7,
            }
        });

        return response.text || "";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Sorry, I encountered an error while processing your request.";
    }
};

export const streamWritingAssistance = async (
    prompt: string, 
    context: string,
    onChunk: (text: string) => void
) => {
    try {
        const ai = getAI();
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: `Context: "${context}"\n\nInstruction: ${prompt}`,
            config: {
                systemInstruction: "You are an intelligent writing assistant. Return raw text or simple HTML suitable for a contentEditable div.",
            }
        });

        for await (const chunk of responseStream) {
            if (chunk.text) {
                onChunk(chunk.text);
            }
        }
    } catch (error) {
        console.error("Gemini Stream Error:", error);
        onChunk("[Error: Failed to generate content]");
    }
};