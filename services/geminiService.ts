import { GoogleGenAI, Chat, GenerateContentResponse, Content } from "@google/genai";
import { GeneratedPost, GroundingChunk } from '../types';

let ai: GoogleGenAI;
let chat: Chat | null = null;

const getAI = () => {
  if (!ai) {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};


const parseJsonFromMarkdown = <T,>(markdownString: string): T | null => {
  const match = markdownString.match(/```json\n([\s\S]*?)\n```/);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1]) as T;
    } catch (error) {
      console.error("Failed to parse JSON from markdown:", error);
      return null;
    }
  }
  try {
      return JSON.parse(markdownString) as T;
  } catch (error) {
     console.error("Failed to parse plain JSON string:", error);
     return null;
  }
};

export const generateLinkedInPost = async (topic: string, style: string, generateImage: boolean): Promise<GeneratedPost> => {
  const genAI = getAI();
  const prompt = `Agisci come un esperto recruiter IT e content creator per LinkedIn. Il tuo tono deve essere professionale e autorevole, ma allo stesso tempo leggero e accessibile, evitando toni ironici o eccessivamente scherzosi.
Genera un post sull'argomento '${topic}' con uno stile '${style}'.

Il post DEVE seguire questa struttura precisa:
1. Un titolo in grassetto che crei "hype" e catturi l'attenzione.
2. Una riga vuota di separazione dopo il titolo.
3. 2-3 paragrafi di contenuto.
4. Ogni paragrafo DEVE iniziare con un'emoji pertinente al suo contenuto.

Includi 3-5 hashtag professionali e rilevanti. Il post deve essere in italiano.

L'intera risposta DEVE essere un singolo oggetto JSON analizzabile con JSON.parse(). L'oggetto JSON deve avere due chiavi: "postContent" (una stringa con il testo completo del post, includendo titolo, paragrafi con emoji e formattazione markdown come \\n per le nuove righe) e "hashtags" (un array di stringhe, senza il simbolo '#'). Non includere testo, backtick o markdown prima o dopo l'oggetto JSON.`;

  const response: GenerateContentResponse = await genAI.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const parsedContent = parseJsonFromMarkdown<{postContent: string; hashtags: string[] }>(response.text);

  if (!parsedContent) {
      throw new Error("Failed to generate post content. The model response was not in the expected format.");
  }

  const sources: GroundingChunk[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

  let imageUrl: string | undefined = undefined;

  if (generateImage) {
      // Switched to a more robust image generation model (Imagen) for better reliability and quality.
      const imagePrompt = `Un'immagine astratta e professionale in stile tech per un post su LinkedIn sul tema "${topic}". Metaforica e visivamente accattivante, adatta a un pubblico di professionisti.`;
      
      const imageResponse = await genAI.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: imagePrompt,
          config: {
            numberOfImages: 1,
            aspectRatio: '16:9',
            outputMimeType: 'image/jpeg',
          },
      });

      if (imageResponse.generatedImages && imageResponse.generatedImages.length > 0) {
        const base64ImageBytes: string = imageResponse.generatedImages[0].image.imageBytes;
        imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
      }
  }

  return { id: Date.now().toString(), ...parsedContent, sources, imageUrl };
};

export const startChatSession = async (initialPostContent: string): Promise<void> => {
  const genAI = getAI();
  const history: Content[] = [
      {
          role: "user",
          parts: [{
              text: `Sei un esperto di comunicazione e social media per il settore tech. Il tuo stile è professionale, costruttivo e incoraggiante. Il tuo compito è aiutarmi a perfezionare questo post per LinkedIn, migliorandone la chiarezza, l'impatto e l'efficacia. Ecco la bozza:\n\n---\n\n${initialPostContent}`
          }]
      },
      {
          role: "model",
          parts: [{
              text: "Bozza ricevuta. La base è solida e interessante. Come possiamo migliorarla insieme? Possiamo lavorare sulla chiarezza del messaggio, rafforzare la call to action, o magari ottimizzare la struttura per una lettura più fluida. Dimmi tu!"
          }]
      }
  ];
  
  chat = genAI.chats.create({
    model: 'gemini-2.5-flash',
    history: history
  });
};

export const sendMessageToChat = async (message: string): Promise<string> => {
    if (!chat) {
        throw new Error("Chat not initialized. Please generate a post first.");
    }
    const response = await chat.sendMessage({ message });
    return response.text;
};

export const analyzeWithThinking = async (query: string): Promise<string> => {
    const genAI = getAI();
    const response = await genAI.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: query }] }],
        config: {
            thinkingConfig: { thinkingBudget: 32768 }
        }
    });
    return response.text;
};