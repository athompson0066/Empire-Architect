import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ContentType, ContentIdea, DetailedOutline, AudienceKeyword, TrendingKeyword } from "../types";

// Helper to get the AI instance with the current key
const getAI = () => {
  // Check multiple sources for the API key
  const key = 
    (import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) ||
    (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) ||
    (typeof process !== 'undefined' && process.env && process.env.API_KEY) ||
    null;
  
  if (!key || key === 'undefined' || key === '') {
    throw new Error("Gemini API key is missing or invalid. Please ensure it is set in the environment or selected via the 'Fix API Key' button.");
  }
  return new GoogleGenAI({ apiKey: key });
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async <T>(fn: () => Promise<T>, retries = 2, backoff = 1000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    if ((error?.message?.includes('RESOURCE_EXHAUSTED') || error?.status === 429) && retries > 0) {
      await delay(backoff);
      return withRetry(fn, retries - 1, backoff * 2);
    }
    throw error;
  }
};

const contentIdeaSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "A catchy title (strictly 4 words for Ad Snippets)." },
    subtitle: { type: Type.STRING, description: "An engaging subtitle that expands on the hook." },
    description: { type: Type.STRING, description: "A persuasive description (strictly around 25 words for Ad Snippets)." },
    targetAudience: { type: Type.STRING, description: "Who specifically is this for?" },
    painPointSolved: { type: Type.STRING, description: "What burning real-life problem does this solve?" },
    monetizationAngle: { type: Type.STRING, description: "How can this generate revenue?" },
  },
  required: ["title", "description", "targetAudience", "painPointSolved", "monetizationAngle"],
};

const contentListSchema: Schema = {
  type: Type.ARRAY,
  items: contentIdeaSchema,
};

const outlineSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    introHook: { type: Type.STRING, description: "A compelling opening hook to grab attention." },
    cta: { type: Type.STRING, description: "A strong call to action at the end." },
    modules: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          points: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["title", "points"]
      }
    }
  },
  required: ["title", "introHook", "cta", "modules"]
};

const audienceKeywordsSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      keyword: { type: Type.STRING, description: "The specific search keyword or topic." },
      painPoint: { type: Type.STRING, description: "The specific pain point or desire this keyword addresses." }
    },
    required: ["keyword", "painPoint"]
  }
};

const trendingKeywordsSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      keyword: { type: Type.STRING, description: "The trending keyword or topic." },
      category: { type: Type.STRING, description: "The niche or industry category." },
      searchVolumeContext: { type: Type.STRING, description: "Brief context about the search trend." }
    },
    required: ["keyword", "category", "searchVolumeContext"]
  }
};

const robustParseJson = (text: string): any => {
  if (!text) return null;
  
  // Remove markdown code blocks if present
  const cleanText = text.replace(/```json\n?|```/g, '').trim();
  
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    const arrayMatch = cleanText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      try { return JSON.parse(arrayMatch[0]); } catch (e2) {}
    }
    const objectMatch = cleanText.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try { return JSON.parse(objectMatch[0]); } catch (e3) {}
    }
    return null;
  }
};

const curateWebResources = async (keyword: string): Promise<ContentIdea[]> => {
  const prompt = `Search for the best websites, high-authority articles, and tools related to: "${keyword}". Return the top 12 relevant URLs found.`;

  try {
    const ai = getAI();
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    }));

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const results: ContentIdea[] = [];
    const seenUrls = new Set<string>();

    for (const chunk of chunks) {
      if (!chunk.web?.uri || !chunk.web?.title) continue;
      const uri = chunk.web.uri;
      if (seenUrls.has(uri)) continue;
      
      let hostname = 'Web Resource';
      try { hostname = new URL(uri).hostname.replace(/^www\./, ''); } catch (e) {}

      seenUrls.add(uri);
      results.push({
        title: chunk.web.title,
        description: `Source: ${hostname}`,
        targetAudience: "General Audience", 
        painPointSolved: hostname,
        monetizationAngle: "Resource Reference", 
        url: uri
      });
    }

    return results.slice(0, 12);
  } catch (error: any) {
    if (error?.message?.includes('RESOURCE_EXHAUSTED') || error?.status === 429) {
      throw new Error("QUOTA_EXCEEDED");
    }
    console.error("Error fetching websites:", error);
    return [];
  }
};

export const generateTrendingKeywords = async (location: string): Promise<TrendingKeyword[]> => {
  const prompt = `Find the top 15 trending search topics, SEO keywords, and rising business interests in ${location} right now.`;

  try {
    const ai = getAI();
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: trendingKeywordsSchema,
        systemInstruction: "You are a market analyst. Output ONLY a valid JSON array."
      },
    }));

    const result = robustParseJson(response.text);
    return Array.isArray(result) ? result : [];
  } catch (error: any) {
    if (error?.message?.includes('RESOURCE_EXHAUSTED') || error?.status === 429) {
      throw new Error("QUOTA_EXCEEDED");
    }
    console.error("Error generating trending keywords:", error);
    return [];
  }
};

export const generateKeywordsFromAudience = async (audience: string): Promise<AudienceKeyword[]> => {
  const prompt = `Perform a deep audience analysis for: "${audience}". Identify 15 high-intent keywords.`;

  try {
    const ai = getAI();
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: audienceKeywordsSchema,
        systemInstruction: "You are an audience psychologist. Output ONLY a valid JSON array."
      },
    }));

    const result = robustParseJson(response.text);
    return Array.isArray(result) ? result : [];
  } catch (error: any) {
    if (error?.message?.includes('RESOURCE_EXHAUSTED') || error?.status === 429) {
      throw new Error("QUOTA_EXCEEDED");
    }
    console.error("Error generating keywords from audience:", error);
    return [];
  }
};

export const generateContentIdeas = async (
  keyword: string,
  contentType: ContentType
): Promise<ContentIdea[]> => {
  if (contentType === ContentType.TOP_WEBSITES) {
    return curateWebResources(keyword);
  }

  let systemInstruction = "You are a world-class digital publishing expert. Output ONLY a raw JSON array matching the provided schema.";
  let prompt = `
    Build a high-revenue content strategy for the keyword: "${keyword}".
    Generate 12 high-value, unique ideas for the format: "${contentType}".
    Focus on items that can be sold or used to build a massive audience.
  `;

  if (contentType === ContentType.AD_SNIPPETS) {
    systemInstruction = "You are a direct-response copywriting legend like Eugene Schwartz. Every output must be punchy, psychological, and perfectly formatted.";
    prompt = `
      Create 12 PERSUASIVE AD SNIPPETS for the keyword: "${keyword}".
      CONSTRAINTS FOR EACH SNIPPET:
      1. TITLE: Exactly 4 words. Punchy, curiosity-driven, and bold.
      2. SUBTITLE: A compelling hook that promises a specific transformation.
      3. DESCRIPTION: Exactly 25 words. Highly persuasive, emotional, and calls to action.
      Output ONLY a JSON array with 12 objects.
    `;
  }

  try {
    const ai = getAI();
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: contentListSchema,
        temperature: 0.85
      },
    }));

    const parsed = robustParseJson(response.text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error: any) {
    if (error?.message?.includes('RESOURCE_EXHAUSTED') || error?.status === 429) {
      throw new Error("QUOTA_EXCEEDED");
    }
    console.error("Error generating content ideas:", error);
    return [];
  }
};

export const generateDetailedOutline = async (
  idea: ContentIdea,
  type: ContentType
): Promise<DetailedOutline | null> => {
  if (type === ContentType.TOP_WEBSITES) return null;

  let prompt = `Create a detailed and actionable outline for a ${type} titled: "${idea.title}".
    Target Audience: ${idea.targetAudience}
    Pain Point: ${idea.painPointSolved}
    Description: ${idea.description}`;

  if (type === ContentType.CREW_AI) {
    prompt = `Create a comprehensive CrewAI Agent Manifest for: "${idea.title}". List 3-4 specialized agents. Context: ${idea.description}`;
  } else if (type === ContentType.WEB_APP || type === ContentType.MOBILE_APP) {
    prompt = `Create a technical MVP feature spec and user flow for the app idea: "${idea.title}". ${idea.description}`;
  } else if (type === ContentType.AI_AGENT) {
    prompt = `Create a System Instruction and persona for a specialized AI Agent: "${idea.title}". ${idea.description}`;
  }

  try {
    const ai = getAI();
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert product architect. Provide a detailed plan in JSON format.",
        responseMimeType: "application/json",
        responseSchema: outlineSchema
      },
    }));

    return robustParseJson(response.text);
  } catch (error: any) {
    if (error?.message?.includes('RESOURCE_EXHAUSTED') || error?.status === 429) {
      throw new Error("QUOTA_EXCEEDED");
    }
    console.error("Error generating outline:", error);
    return null;
  }
};

export const generateExpertPrompt = async (
  idea: ContentIdea,
  type: ContentType
): Promise<string> => {
  const prompt = `
    TASK: Create the ultimate "Mega-Prompt" for a content creator.
    CREW PERSONA: Act as a crew of expert Prompt Engineers and CrewAI Specialists.
    OBJECTIVE: Generate a single, detailed, highly structured prompt that a user can paste into an LLM (like GPT-4 or Gemini) to fully execute the following idea:
    
    CONTENT TYPE: ${type}
    TITLE: ${idea.title}
    TARGET AUDIENCE: ${idea.targetAudience}
    KEY PROBLEM SOLVED: ${idea.painPointSolved}
    CORE CONCEPT: ${idea.description}

    THE GENERATED PROMPT MUST INCLUDE:
    - Act as [Specific Expert Persona]
    - Contextual background
    - Step-by-step instructions
    - Style guidelines (tone, vocabulary, formatting)
    - Specific constraints and output structure
    - A "Call to Excellence" finishing instruction.

    OUTPUT: Just the prompt text. Use professional Markdown.
  `;

  try {
    const ai = getAI();
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are the world's leading Prompt Engineering Crew. You write prompts that get 10/10 results. No conversation, just the generated prompt."
      },
    }));

    return response.text || "Failed to generate prompt.";
  } catch (error: any) {
    if (error?.message?.includes('RESOURCE_EXHAUSTED') || error?.status === 429) {
      throw new Error("QUOTA_EXCEEDED");
    }
    console.error("Error generating expert prompt:", error);
    return "Error generating expert prompt. Please try again.";
  }
};
