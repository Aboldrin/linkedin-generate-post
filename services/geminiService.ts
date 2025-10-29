import { GoogleGenAI, Chat, GenerateContentResponse, Type, Modality } from "@google/genai";
import { GeneratedPost, LibraryItem, PlannedPost, ProactiveSuggestion } from "../types";

// Always use new GoogleGenAI({apiKey: process.env.API_KEY});
const getAI = () => new GoogleGenAI({apiKey: process.env.API_KEY});

// Helper to parse JSON from Markdown code blocks
const parseJsonFromMarkdown = <T,>(markdownString: string): T | null => {
    const match = markdownString.match(/```json\n([\s\S]*?)\n```/);
    if (match && match[1]) {
        try {
            return JSON.parse(match[1]) as T;
        } catch (error) {
            console.error("Failed to parse JSON from markdown:", error, "Content:", match[1]);
            // Fallback to parsing the whole string if markdown parsing fails
        }
    }
    try {
        return JSON.parse(markdownString) as T;
    } catch (error) {
        // Not a JSON string, which is fine for regular chat messages
        return null;
    }
};


// Function implementations

export const generateLinkedInPost = async (
    topic: string,
    style: string,
    tone: string,
    mediaType: 'none' | 'image' | 'meme',
    customImagePrompt: string,
    aspectRatio: string,
    memeLanguage: string,
    uploadedImage: { dataUrl: string } | null,
    setLoadingMessage: (message: string) => void
): Promise<GeneratedPost> => {
    try {
        const ai = getAI();
        setLoadingMessage('Sto creando il prompt per l\'AI...');

        let basePrompt = `Agisci come un esperto di social media marketing specializzato in LinkedIn per il settore IT in Italia. Il tuo obiettivo è generare un post coinvolgente e di alta qualità.

        **Contesto:**
        - Piattaforma: LinkedIn
        - Target Audience: Professionisti del settore IT in Italia (sviluppatori, manager, recruiter, etc.)
        - Lingua: Italiano

        **Input per la Generazione:**
        - Argomento: "${topic}"
        - Stile: "${style === 'Nessuna Selezione' ? 'Generico, ben strutturato' : style}"
        - Tono: "${tone === 'Nessuna Selezione' ? 'Professionale ma accessibile' : tone}"

        **Istruzioni e Formato di Output:**

        1.  **Formato JSON Obbligatorio:** La tua risposta DEVE essere un singolo blocco di codice JSON, senza testo introduttivo o conclusivo.
        2.  **Struttura JSON:**
            -   \`postContent\`: (string) Il testo del post. Deve essere ben formattato con paragrafi e, se appropriato, emoji pertinenti per migliorare la leggibilità. Non includere gli hashtag qui.
            -   \`hashtags\`: (array di stringhe) Un array di 5-7 hashtag pertinenti e popolari in Italia per l'argomento. Non includere il simbolo '#'.
            -   \`poll\`: (oggetto | null) Se lo stile è "Sondaggio", crea un oggetto con \`question\` (stringa) e \`options\` (array di 2-4 stringhe). Altrimenti, questo campo deve essere \`null\`.
        `;

        if (mediaType !== 'none') {
            basePrompt += `
        3.  **Contenuto Multimediale (Tipo: ${mediaType}):**
            -   \`imagePrompt\`: (string) Se l'utente non fornisce un prompt specifico per l'immagine, crea un prompt dettagliato e creativo per un modello text-to-image (come Imagen) che sia visivamente accattivante e strettamente correlato al contenuto del post. Descrivi lo stile (es: fotorealistico, illustrativo, 3D), i soggetti, l'ambientazione e l'atmosfera. Se l'utente fornisce un prompt, usalo come ispirazione ma sentiti libero di migliorarlo.
            -   \`memeText\`: (string | null) Solo se il tipo di media è "meme", crea un testo breve, incisivo e umoristico (massimo 10 parole) da sovrapporre all'immagine. La lingua deve essere: ${memeLanguage}. Altrimenti, questo campo deve essere \`null\`.
        `;
        }

        basePrompt += `
        **Requisiti Finali:**
        -   Il \`postContent\` deve essere di lunghezza adeguata per un post LinkedIn (circa 150-250 parole).
        -   Se lo stile è "Sondaggio", il \`postContent\` deve essere un'introduzione che porta alla domanda del sondaggio.
        -   Non inventare statistiche a meno che non sia uno stile che lo richiede esplicitamente (es. "Mito da Sfatare").
        `;


        setLoadingMessage('L\'AI sta elaborando il testo del post...');
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Using pro for better JSON generation and reasoning
            contents: basePrompt,
            config: {
                responseMimeType: 'application/json',
                // Simple schema, relying on prompt for structure
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        postContent: { type: Type.STRING },
                        hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                        poll: {
                            type: Type.OBJECT,
                            nullable: true,
                            properties: {
                                question: { type: Type.STRING },
                                options: { type: Type.ARRAY, items: { type: Type.STRING } }
                            }
                        },
                        imagePrompt: { type: Type.STRING, nullable: true },
                        memeText: { type: Type.STRING, nullable: true },
                    }
                }
            }
        });

        const resultData = JSON.parse(response.text);

        let imageUrl: string | undefined = undefined;
        let finalImagePrompt = customImagePrompt || resultData.imagePrompt;

        if (mediaType !== 'none') {
            if (uploadedImage) {
                imageUrl = uploadedImage.dataUrl;
                finalImagePrompt = "Immagine caricata dall'utente.";
            } else if (finalImagePrompt) {
                setLoadingMessage('L\'AI sta generando l\'immagine...');
                const imageResponse = await ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: finalImagePrompt,
                    config: {
                        numberOfImages: 1,
                        aspectRatio: aspectRatio,
                        outputMimeType: 'image/jpeg',
                    }
                });

                if (imageResponse.generatedImages && imageResponse.generatedImages.length > 0) {
                    const base64ImageBytes = imageResponse.generatedImages[0].image.imageBytes;
                    imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
                }
            }
        }

        setLoadingMessage('Finalizzazione del post...');

        return {
            id: `post_${Date.now()}_${Math.random()}`,
            postContent: resultData.postContent,
            hashtags: resultData.hashtags || [],
            poll: resultData.poll,
            sources: [], // No grounding for this one
            imageUrl: imageUrl,
            originalImagePrompt: finalImagePrompt,
            memeText: resultData.memeText,
        };
    } catch (e) {
        console.error("Error in generateLinkedInPost:", e);
        throw new Error("Si è verificato un errore durante la generazione del post. Potrebbe esserci un problema di rete o con l'API. Riprova più tardi.");
    }
};

export const suggestHotTopics = async (): Promise<string[]> => {
    try {
        const ai = getAI();
        const prompt = `Agisci come un esperto di trend nel settore IT e tech in Italia. Analizza le discussioni recenti, le notizie e gli argomenti "caldi" su piattaforme come LinkedIn, blog di settore e siti di news tecnologiche italiane.
        
        Il tuo compito è identificare e restituire i 3 argomenti più rilevanti e coinvolgenti in questo momento per un pubblico di professionisti IT in Italia.
        
        **Istruzioni:**
        1.  Fornisci esattamente 3 argomenti.
        2.  Ogni argomento deve essere una frase breve e concisa (massimo 10 parole).
        3.  Usa lo strumento di ricerca Google per basare i tuoi suggerimenti su informazioni attuali.
        
        **Formato di Output:**
        La tua risposta DEVE essere un singolo blocco di codice JSON, senza testo aggiuntivo. Il JSON deve contenere un array di stringhe chiamato "topics".
        
        Esempio:
        \`\`\`json
        {
          "topics": [
            "L'impatto dell'AI generativa sul mercato del lavoro per sviluppatori.",
            "Le nuove normative europee sulla cybersecurity e le aziende italiane.",
            "Il dibattito sul ritorno in ufficio vs. lavoro da remoto nel tech."
          ]
        }
        \`\`\``;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        topics: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                },
                tools: [{ googleSearch: {} }]
            }
        });

        const result = JSON.parse(response.text);
        return result.topics || [];
    } catch (e) {
        console.error("Error in suggestHotTopics:", e);
        throw new Error("Impossibile suggerire gli argomenti. La ricerca web potrebbe essere momentaneamente non disponibile.");
    }
};

let chat: Chat | null = null;
let currentPostContext: GeneratedPost | null = null;
let initialContextUsed = false;

export const startChatSession = async (post: GeneratedPost, initialContext?: string): Promise<void> => {
    const ai = getAI();
    currentPostContext = post;
    initialContextUsed = false; // Reset flag

    let history: any[] = [];
    let systemInstruction = `Sei un assistente AI specializzato nel perfezionare post per LinkedIn. Il tuo obiettivo è aiutare l'utente a migliorare una bozza esistente.

**Contesto Attuale del Post:**
\`\`\`json
${JSON.stringify({
    postContent: post.postContent,
    hashtags: post.hashtags,
    poll: post.poll,
    memeText: post.memeText,
    originalImagePrompt: post.originalImagePrompt,
}, null, 2)}
\`\`\`

**Le tue capacità e come rispondere:**

1.  **Modifica del Testo del Post:** Se l'utente chiede di modificare il testo (es. "rendilo più breve", "aggiungi un aneddoto", "cambia il tono"), rispondi SEMPRE con un blocco JSON contenente l'azione e il nuovo testo. Non includere messaggi amichevoli fuori dal JSON.
    Formato: \`\`\`json\n{"action": "update_post_text", "new_post_text": "Qui il testo del post completamente riscritto..."}\n\`\`\`

2.  **Modifica dell'Immagine:** Se l'utente chiede di modificare l'immagine (es. "cambia lo sfondo", "rendilo fotorealistico", "aggiungi un gatto"), rispondi con un JSON che descrive l'azione e l'istruzione per il modello di immagine.
    Formato: \`\`\`json\n{"action": "edit_image", "instruction": "prompt per la modifica dell'immagine"}\n\`\`\`

3.  **Modifica del Testo del Meme:** Se c'è un meme e l'utente vuole cambiare il testo, rispondi con un JSON.
    Formato: \`\`\`json\n{"action": "edit_meme_text", "new_text": "nuovo testo per il meme"}\n\`\`\`
    
4.  **Generazione Hashtag:** Se l'utente chiede di generare o cambiare gli hashtag, rispondi con un JSON.
    Formato: \`\`\`json\n{"action": "generate_hashtags"}\n\`\`\`

5.  **Conversazione Generica:** Se l'utente fa una domanda o una richiesta che non rientra nei punti precedenti (es. "cosa ne pensi?", "dammi qualche idea"), rispondi come un normale chatbot, con testo semplice. NON usare JSON.

**Importante:** Attieniti strettamente ai formati JSON quando esegui un'azione. Non aggiungere commenti o testo al di fuori del blocco di codice JSON.`;

    if (initialContext) {
        history.push({
            role: "user",
            parts: [{ text: `Usa questo documento come contesto principale per le mie prossime richieste:\n\n---\n${initialContext}\n---` }]
        });
        history.push({
            role: "model",
            parts: [{ text: "Contesto ricevuto. Sono pronto a trasformarlo in un post." }]
        });
        initialContextUsed = true;
    }

    chat = ai.chats.create({
        model: 'gemini-2.5-pro',
        history: history,
        config: { systemInstruction: systemInstruction }
    });
};

export const sendMessageToChat = async (message: string): Promise<string> => {
    if (!chat) {
        throw new Error("Chat session not started.");
    }
    try {
        const response = await chat.sendMessage({ message });
        return response.text;
    } catch (e) {
        console.error("Error in sendMessageToChat:", e);
        throw new Error("L'AI non è riuscita a rispondere. Riprova.");
    }
};

export const editImageWithPrompt = async (
    base64Image: string,
    prompt: string,
    setProgressMessage: (message: string) => void
): Promise<string> => {
    setProgressMessage("L'AI sta modificando l'immagine...");
    try {
        const ai = getAI();
        
        // Extract mime type and data
        const match = base64Image.match(/^data:(image\/[a-z]+);base64,(.+)$/);
        if (!match) {
            throw new Error("Invalid base64 image format.");
        }
        const mimeType = match[1];
        const data = match[2];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data, mimeType } },
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
            }
        }
        throw new Error("L'AI non ha restituito un'immagine. Il prompt potrebbe violare le policy di sicurezza.");
    } catch (e) {
        console.error("Error in editImageWithPrompt:", e);
        throw new Error("La modifica dell'immagine è fallita. Il prompt potrebbe essere stato bloccato.");
    }
};

export const generateHashtagsForMeme = async (
    post: GeneratedPost,
    setProgressMessage: (message: string) => void
): Promise<string[]> => {
    setProgressMessage("L'AI sta generando gli hashtag...");
    try {
        const ai = getAI();
        const prompt = `Analizza il seguente contenuto di un post LinkedIn (testo e descrizione dell'immagine) e genera un array di 5-7 hashtag pertinenti in italiano.

        **Testo del Post:**
        "${post.postContent || 'Nessun testo di accompagnamento.'}"

        **Descrizione Immagine/Meme:**
        - Prompt originale: "${post.originalImagePrompt || 'N/D'}"
        - Testo del meme: "${post.memeText || 'N/D'}"

        **Output:**
        Rispondi solo con un blocco di codice JSON contenente un array di stringhe chiamato "hashtags". Non includere il simbolo '#'.

        Esempio:
        \`\`\`json
        {
          "hashtags": ["svilupposoftware", "intelligenzaartificiale", "innovazione", "tecnologia", "carrieraIT"]
        }
        \`\`\``;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        hashtags: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        const result = JSON.parse(response.text);
        return result.hashtags || [];
    } catch (e) {
        console.error("Error in generateHashtagsForMeme:", e);
        throw new Error("Impossibile generare gli hashtag.");
    }
};

// Functions for SmartScheduler
export const getLinkedInTimingAnalysis = async (): Promise<string> => {
    const ai = getAI();
    const groundedPrompt = `Agisci come un analista di social media marketing specializzato su LinkedIn per il mercato italiano IT. Il tuo compito è fornire un'analisi strategica dei migliori momenti per pubblicare contenuti.

        **Istruzioni:**
        1.  Utilizza la ricerca Google per trovare dati aggiornati e best practice sui tempi di pubblicazione su LinkedIn, specifici per l'Italia e il settore tecnologico/IT, se possibile.
        2.  Sintetizza i risultati in un'analisi chiara e concisa.
        3.  Identifica 2-3 fasce orarie ottimali (es. "martedì 10:00 - 12:00") per la pubblicazione durante la settimana lavorativa (lunedì-venerdì).
        4.  Aggiungi una breve motivazione per ogni fascia oraria suggerita (es. "Durante la pausa caffè mattutina, quando i professionisti controllano i feed").
        5.  Fornisci un consiglio generale sul tipo di contenuto che funziona meglio in quelle fasce (es. "Contenuti approfonditi al mattino, post più leggeri nel pomeriggio").
        6.  La risposta deve essere in italiano e formattata come un report di analisi, usando markdown per la formattazione (es. titoli, grassetto, elenchi). Non usare JSON.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: groundedPrompt,
            config: { tools: [{ googleSearch: {} }] }
        });
        return response.text;
    } catch (e) {
        console.warn("Grounded analysis failed, falling back to general knowledge.", e);
        // Fallback to a non-grounded prompt
        const fallbackPrompt = `Agisci come un analista di social media marketing specializzato su LinkedIn per il mercato italiano IT. Basandoti sulla tua conoscenza generale, fornisci un'analisi strategica dei migliori momenti per pubblicare contenuti.

        **Istruzioni:**
        1.  Sintetizza le best practice generali sui tempi di pubblicazione su LinkedIn per il settore tecnologico/IT in Italia.
        2.  Identifica 2-3 fasce orarie ottimali (es. "martedì 10:00 - 12:00") per la pubblicazione durante la settimana lavorativa (lunedì-venerdì).
        3.  Aggiungi una breve motivazione per ogni fascia oraria suggerita.
        4.  Fornisci un consiglio generale sul tipo di contenuto che funziona meglio in quelle fasce.
        5.  La risposta deve essere in italiano e formattata come un report di analisi, usando markdown. Non usare JSON.`;
        
        try {
            const fallbackResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: fallbackPrompt,
            });
            return fallbackResponse.text;
        } catch (finalError) {
             console.error("Error in getLinkedInTimingAnalysis (both grounded and fallback failed):", finalError);
             throw new Error("Impossibile ottenere l'analisi strategica. Controlla la connessione di rete.");
        }
    }
};

export const suggestPostTypeForTimeSlot = async (analysis: string, timeSlot: string): Promise<{ suggestion: string; postType: string; }> => {
    try {
        const ai = getAI();
        const prompt = `Basandoti sulla seguente analisi strategica di LinkedIn e sulla prossima fascia oraria ottimale, fornisci un consiglio strategico e suggerisci un tipo di post.

        **Analisi Strategica:**
        ---
        ${analysis}
        ---
        
        **Prossima Fascia Oraria Ottimale:** ${timeSlot}
        
        **Compito:**
        1.  **Crea un consiglio strategico:** Scrivi una breve frase (massimo 25 parole) che spieghi perché un certo tipo di post sarebbe efficace in quella fascia oraria, basandoti sull'analisi.
        2.  **Scegli un tipo di post:** Seleziona il tipo di post più adatto tra le seguenti opzioni: "Domanda", "Punto di Vista", "Ultim'ora Tech", "Consiglio Rapido", "Case Study di Successo", "Mito da Sfatare", "Previsione Futura", "Guida Step-by-Step", "Sondaggio", "Meme".
        
        **Formato di Output Obbligatorio (JSON):**
        Rispondi solo con un blocco di codice JSON.
        \`\`\`json
        {
          "suggestion": "Il tuo consiglio strategico qui.",
          "postType": "Il tipo di post scelto dalla lista"
        }
        \`\`\``;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Pro for better reasoning on analysis
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestion: { type: Type.STRING },
                        postType: { type: Type.STRING }
                    }
                }
            }
        });

        return JSON.parse(response.text);
    } catch (e) {
        console.error("Error in suggestPostTypeForTimeSlot:", e);
        throw new Error("Impossibile generare un suggerimento per il tipo di post.");
    }
};

export const suggestContentFromLibrary = async (postType: string, libraryItems: LibraryItem[]): Promise<{ suggestion: string, itemId: string } | null> => {
    if (libraryItems.length === 0) return null;
    try {
        const ai = getAI();

        const formattedLibrary = libraryItems.map(item => ({
            id: item.id,
            name: item.name,
            type: item.type,
            // Provide a snippet for text items to save tokens
            data_snippet: item.type === 'text' ? item.data.substring(0, 200) + '...' : 'Contenuto immagine'
        }));

        const prompt = `Sei un content strategist. Il tuo compito è analizzare una libreria di contenuti e un tipo di post suggerito, per trovare la migliore corrispondenza.

        **Tipo di Post Suggerito:** "${postType}"
        
        **Libreria di Contenuti Disponibile:**
        \`\`\`json
        ${JSON.stringify(formattedLibrary, null, 2)}
        \`\`\`
        
        **Compito:**
        1.  Analizza ogni elemento nella libreria e valuta quanto sia adatto per creare un post di tipo "${postType}".
        2.  Scegli l'elemento **più adatto**.
        3.  Scrivi una breve motivazione (massimo 20 parole) che spieghi perché hai scelto quell'elemento.
        
        **Formato di Output Obbligatorio (JSON):**
        Rispondi solo con un blocco di codice JSON. Se nessun elemento è adatto, restituisci \`null\` per entrambi i campi.
        \`\`\`json
        {
          "suggestion": "La tua motivazione qui.",
          "itemId": "L'ID dell'elemento scelto dalla libreria"
        }
        \`\`\``;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestion: { type: Type.STRING, nullable: true },
                        itemId: { type: Type.STRING, nullable: true }
                    }
                }
            }
        });

        const result = JSON.parse(response.text);
        if (result && result.itemId) {
            return result;
        }
        return null;
    } catch (e) {
        console.error("Error in suggestContentFromLibrary:", e);
        throw new Error("Impossibile generare suggerimento dalla libreria.");
    }
};

// New functions for Calendar and Quick Query

export const generateMonthlyContentPlan = async (month: number, year: number): Promise<PlannedPost[]> => {
    try {
        const ai = getAI();
        const prompt = `Sei un social media manager strategico per un recruiter IT su LinkedIn. Il tuo compito è creare un piano editoriale completo per un intero mese.

    **Mese di riferimento:** ${month}/${year}

    **Istruzioni:**
    1.  Identifica i giorni lavorativi (lunedì-venerdì) del mese.
    2.  Pianifica 2-3 post a settimana, distribuiti in modo intelligente (es. non due giorni di seguito).
    3.  Per ogni post pianificato, definisci:
        *   \`date\`: La data esatta in formato "YYYY-MM-DD".
        *   \`postType\`: Un tipo di post strategico dalla lista: "Domanda", "Punto di Vista", "Ultim'ora Tech", "Consiglio Rapido", "Mito da Sfatare", "Sondaggio", "Meme" (usa i meme con parsimonia, magari di venerdì).
        *   \`topic\`: Un argomento specifico e pertinente al tipo di post, al settore IT e al target italiano.
    4.  Una volta definito il piano, genera il contenuto completo per OGNI post pianificato. Invoca la tua funzione interna di generazione post per creare un oggetto \`generatedPost\` completo (con \`postContent\`, \`hashtags\`, e \`poll\` se necessario). Non generare immagini.
    5.  Assicurati che l'argomento e il contenuto siano vari e non ripetitivi durante il mese.

    **Formato di Output Obbligatorio (JSON):**
    La tua risposta DEVE essere un singolo blocco di codice JSON contenente un array di oggetti, dove ogni oggetto rappresenta un post pianificato.

    **Esempio di struttura per un singolo elemento dell'array:**
    \`\`\`json
    {
      "date": "2024-09-04",
      "postType": "Sondaggio",
      "topic": "Quale linguaggio di programmazione studiare nel 2025?",
      "generatedPost": {
        "id": "post_1724...",
        "postContent": "Il mondo dello sviluppo è in costante evoluzione! Per chi inizia ora o vuole aggiornarsi, la scelta del linguaggio giusto è cruciale. Secondo voi, quale di questi linguaggi offre le migliori prospettive di carriera in Italia per il prossimo anno?",
        "hashtags": ["sviluppo", "programmazione", "carrieraIT", "formazione", "tecnologia"],
        "poll": {
          "question": "Quale linguaggio ha più futuro in Italia nel 2025?",
          "options": ["Python", "JavaScript/TypeScript", "Java", "Rust"]
        }
      }
    }
    \`\`\`
    `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text.trim();
        const result = parseJsonFromMarkdown<PlannedPost[]>(text);
        if (result) {
            return result;
        }
        // Fallback if parsing fails
        throw new Error("Impossibile analizzare il piano editoriale. L'AI ha restituito un formato non valido.");
    } catch (e) {
        console.error("Error in generateMonthlyContentPlan:", e);
        throw new Error("Impossibile generare il piano mensile.");
    }
};

export const answerCalendarQuery = async (query: string, plan: PlannedPost[]): Promise<string | ProactiveSuggestion> => {
    try {
        const ai = getAI();
        let prompt: string;

        if (plan.length > 0) {
            prompt = `Sei un assistente che risponde a domande su un piano editoriale di LinkedIn. Sii conciso e diretto.

            **Piano Editoriale Attuale:**
            \`\`\`json
            ${JSON.stringify(plan, null, 2)}
            \`\`\`

            **Domanda dell'utente:** "${query}"

            **Compito:**
            Analizza il piano e rispondi alla domanda dell'utente in modo chiaro e sintetico. Se la domanda chiede una preview, formatta la risposta in modo leggibile, magari usando markdown. Non inventare informazioni che non sono nel piano. Rispondi in testo semplice, non JSON.
            `;
        } else {
            prompt = `Sei un social media manager proattivo per un recruiter IT su LinkedIn in Italia. L'utente, che non ha ancora un piano editoriale, ti ha chiesto: "${query}".

            Il tuo unico compito è fornire un suggerimento concreto e azionabile. Non menzionare la mancanza di un piano. La tua risposta DEVE essere un blocco di codice JSON.

            **Compito:**
            1.  Identifica un giorno e un'ora di pubblicazione appropriati (es. domani mattina).
            2.  Scegli un tipo di post strategico (es. "Consiglio Rapido", "Sondaggio").
            3.  Crea un argomento specifico e pertinente.

            **Formato di Output Obbligatorio (JSON):**
            Restituisci solo un blocco di codice JSON con la seguente struttura:
            \`\`\`json
            {
              "date": "YYYY-MM-DD",
              "postType": "Tipo di post scelto",
              "topic": "Argomento specifico del post"
            }
            \`\`\`
            `;
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });
        
        const text = response.text.trim();
        
        if (plan.length === 0) {
            const suggestion = parseJsonFromMarkdown<ProactiveSuggestion>(text);
            if (suggestion && suggestion.date && suggestion.postType && suggestion.topic) {
                return suggestion;
            }
        }

        return text;
    } catch (e) {
        console.error("Error in answerCalendarQuery:", e);
        throw new Error("Impossibile rispondere alla domanda sul calendario.");
    }
};