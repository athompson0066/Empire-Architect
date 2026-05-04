import { ContentType, ContentIdea, DetailedOutline, AudienceKeyword, TrendingKeyword } from "../types";

const OLLAMA_BASE_URL = "http://172.16.0.1:11434/v1";
const MODEL = "minimax-m2.7:cloud";
const TIMEOUT_MS = 60000;

interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OllamaResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  error?: {
    message: string;
  };
}

const callOllama = async (
  messages: OllamaMessage[],
  temperature: number = 0.7,
  maxTokens: number = 4000
): Promise<string> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error ${response.status}: ${errorText}`);
    }

    const data: OllamaResponse = await response.json();

    if (data.error) {
      throw new Error(`Ollama error: ${data.error.message}`);
    }

    if (!data.choices || data.choices.length === 0) {
      throw new Error("No response from Ollama");
    }

    return data.choices[0].message.content;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Ollama request timed out after 60s. Check if Ollama is running.");
    }
    throw error;
  }
};

const robustParseJson = (text: string): any => {
  if (!text) return null;

  // Remove markdown code blocks if present
  const cleanText = text.replace(/```json\n?|```/g, "").trim();

  try {
    return JSON.parse(cleanText);
  } catch (e) {
    const arrayMatch = cleanText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch (e2) {}
    }
    const objectMatch = cleanText.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch (e3) {}
    }
    return null;
  }
};

// === CONTENT IDEAS ===
export const generateContentIdeas = async (
  keyword: string,
  contentType: ContentType
): Promise<ContentIdea[]> => {
  if (contentType === ContentType.TOP_WEBSITES) {
    return curateWebResources(keyword);
  }

  let systemPrompt =
    "You are a world-class digital publishing expert. Output ONLY a raw JSON array.";
  let userPrompt = `
Build a high-revenue content strategy for the keyword: "${keyword}".
Generate 12 high-value, unique ideas for the format: "${contentType}".
Focus on items that can be sold or used to build a massive audience.

Output ONLY a JSON array with 12 objects. Each object must have:
- title: string (catchy title)
- subtitle: string (engaging subtitle)
- description: string (persuasive description ~50 words)
- targetAudience: string (who specifically is this for)
- painPointSolved: string (what burning problem does this solve)
- monetizationAngle: string (how can this generate revenue)
`;

  if (contentType === ContentType.AD_SNIPPETS) {
    systemPrompt =
      "You are a direct-response copywriting legend. Output ONLY raw JSON.";
    userPrompt = `
Create 12 PERSUASIVE AD SNIPPETS for the keyword: "${keyword}".
CONSTRAINTS FOR EACH SNIPPET:
1. TITLE: Exactly 4 words. Punchy, curiosity-driven.
2. SUBTITLE: A compelling hook promising transformation.
3. DESCRIPTION: Exactly 25 words. Highly persuasive, emotional.

Output ONLY a JSON array with 12 objects having: title, subtitle, description, targetAudience, painPointSolved, monetizationAngle.
`;
  }

  try {
    const response = await callOllama(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      0.85,
      4000
    );

    const parsed = robustParseJson(response);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error: any) {
    console.error("Error generating content ideas:", error);
    throw new Error(error.message || "Failed to generate content ideas");
  }
};

// === TRENDING KEYWORDS ===
export const generateTrendingKeywords = async (
  location: string
): Promise<TrendingKeyword[]> => {
  const systemPrompt =
    "You are a market analyst. Output ONLY a valid JSON array.";
  const userPrompt = `Find the top 15 trending search topics, SEO keywords, and rising business interests in ${location} right now.

Output ONLY a JSON array. Each object has:
- keyword: string (the specific search keyword)
- category: string (the niche or industry)
- searchVolumeContext: string (brief context about the trend)
`;

  try {
    const response = await callOllama(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      0.7,
      3000
    );

    const result = robustParseJson(response);
    return Array.isArray(result) ? result : [];
  } catch (error: any) {
    console.error("Error generating trending keywords:", error);
    throw new Error(error.message || "Failed to generate trending keywords");
  }
};

// === AUDIENCE KEYWORDS ===
export const generateKeywordsFromAudience = async (
  audience: string
): Promise<AudienceKeyword[]> => {
  const systemPrompt =
    "You are an audience psychologist. Output ONLY a valid JSON array.";
  const userPrompt = `Perform a deep audience analysis for: "${audience}". Identify 15 high-intent keywords.

Output ONLY a JSON array. Each object has:
- keyword: string (the specific search keyword or topic)
- painPoint: string (the specific pain point or desire this keyword addresses)
`;

  try {
    const response = await callOllama(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      0.7,
      3000
    );

    const result = robustParseJson(response);
    return Array.isArray(result) ? result : [];
  } catch (error: any) {
    console.error("Error generating keywords from audience:", error);
    throw new Error(
      error.message || "Failed to generate keywords from audience"
    );
  }
};

// === DETAILED OUTLINE ===
export const generateDetailedOutline = async (
  idea: ContentIdea,
  type: ContentType
): Promise<DetailedOutline | null> => {
  if (type === ContentType.TOP_WEBSITES) return null;

  let userPrompt = `Create a detailed and actionable outline for a ${type} titled: "${idea.title}".
Target Audience: ${idea.targetAudience}
Pain Point: ${idea.painPointSolved}
Description: ${idea.description}

Output ONLY a JSON object with:
- title: string
- introHook: string (compelling opening hook)
- cta: string (strong call to action)
- modules: array of objects with { title: string, points: string[] }
`;

  if (type === ContentType.CREW_AI) {
    userPrompt = `Create a comprehensive CrewAI Agent Manifest for: "${idea.title}". List 3-4 specialized agents. Context: ${idea.description}

Output ONLY a JSON object with: title, introHook, cta, modules[].`;
  } else if (type === ContentType.WEB_APP || type === ContentType.MOBILE_APP) {
    userPrompt = `Create a technical MVP feature spec and user flow for the app idea: "${idea.title}". ${idea.description}

Output ONLY a JSON object with: title, introHook, cta, modules[].`;
  } else if (type === ContentType.AI_AGENT) {
    userPrompt = `Create a System Instruction and persona for a specialized AI Agent: "${idea.title}". ${idea.description}

Output ONLY a JSON object with: title, introHook, cta, modules[].`;
  }

  try {
    const response = await callOllama(
      [
        {
          role: "system",
          content:
            "You are an expert product architect. Output ONLY valid JSON.",
        },
        { role: "user", content: userPrompt },
      ],
      0.7,
      4000
    );

    return robustParseJson(response);
  } catch (error: any) {
    console.error("Error generating outline:", error);
    throw new Error(error.message || "Failed to generate outline");
  }
};

// === EXPERT PROMPT ===
export const generateExpertPrompt = async (
  idea: ContentIdea,
  type: ContentType
): Promise<string> => {
  const userPrompt = `
TASK: Create the ultimate "Mega-Prompt" for a content creator.
CREW PERSONA: Act as a crew of expert Prompt Engineers and CrewAI Specialists.
OBJECTIVE: Generate a single, detailed, highly structured prompt that a user can paste into an LLM to fully execute the following idea:

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
    const response = await callOllama(
      [
        {
          role: "system",
          content:
            "You are the world's leading Prompt Engineering Crew. You write prompts that get 10/10 results. No conversation, just the generated prompt.",
        },
        { role: "user", content: userPrompt },
      ],
      0.7,
      4000
    );

    return response || "Failed to generate prompt.";
  } catch (error: any) {
    console.error("Error generating expert prompt:", error);
    throw new Error(error.message || "Failed to generate expert prompt");
  }
};

// === WEB RESOURCES (using mock data since no Google Search) ===
const curateWebResources = async (keyword: string): Promise<ContentIdea[]> => {
  const userPrompt = `Search for the best websites, high-authority articles, and tools related to: "${keyword}". Return the top 12 relevant URLs and titles.

Output ONLY a JSON array. Each object has:
- title: string (website/article title)
- description: string (source domain name)
- targetAudience: string ("General Audience")
- painPointSolved: string (brief description of what this resource covers)
- monetizationAngle: string ("Resource Reference")
- url: string (the full URL)
`;

  try {
    const response = await callOllama(
      [
        {
          role: "system",
          content:
            "You are a research assistant. Output ONLY a valid JSON array of web resources.",
        },
        { role: "user", content: userPrompt },
      ],
      0.7,
      4000
    );

    const result = robustParseJson(response);
    return Array.isArray(result) ? result.slice(0, 12) : [];
  } catch (error: any) {
    console.error("Error fetching websites:", error);
    return [];
  }
};

// === Health Check ===
export const checkOllamaHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/models`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return response.ok;
  } catch {
    return false;
  }
};
