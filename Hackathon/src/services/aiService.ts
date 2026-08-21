import { GoogleGenAI } from '@google/genai';
import type { ActiveStudySession } from '../mock/userProfile';
import type { ProcessedAttachment } from './fileProcessingService';
import type { TaskItem } from '../mock/data';
import { plannerEngine } from './plannerEngine';
import { imageSearchService, buildGoogleImagesUrl, type ImageSearchResult } from './imageSearchService';

export type StudentMood = 'great' | 'good' | 'okay' | 'low' | 'sad' | 'stressed';
export type StudySessionState = ActiveStudySession;

export interface ChatHistoryMessage {
  id: string;
  sender: 'ai' | 'user';
  senderName: string;
  content: string;
  attachment?: ProcessedAttachment | null;
  attachments?: ProcessedAttachment[] | null;
  imageResults?: ImageSearchResult[];
}

export const DEFAULT_PRACTICE_QUESTION_COUNT = 10;

/**
 * GEMINI MODEL CONFIGURATION:
 * Primary: gemini-flash-latest
 * Fallback Chain: gemini-3.5-flash -> gemini-3.5-flash-lite -> gemini-3.1-flash-lite
 */
export const GEMINI_PRIMARY_MODEL = 'gemini-flash-latest';
export const GEMINI_FALLBACK_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
];
export const ALL_CANDIDATE_MODELS = [GEMINI_PRIMARY_MODEL, ...GEMINI_FALLBACK_MODELS];

/**
 * Safely parses the requested practice question count from the user prompt text.
 * E.g., "Generate 15 practice questions" -> 15. Default: 10.
 */
export function parseQuestionCountFromPrompt(userPrompt: string): number | null {
  const match = userPrompt.match(/(\d+)\s*(?:practice\s*)?questions/i);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num > 0) return num;
  }
  if (/practice\s*questions/i.test(userPrompt)) {
    return DEFAULT_PRACTICE_QUESTION_COUNT;
  }
  return null;
}

/**
 * Counts numbered questions in a response text.
 */
export function countQuestionsInResponse(text: string): number {
  const matches = text.match(/(?:^|\n)\s*(?:Q|Question)?\s*\d{1,2}\s*[\.\:\)]/gi);
  return matches ? matches.length : 0;
}

/**
 * Detects if user prompt is an ambiguous image request e.g. "give me the image".
 */
export function isAmbiguousImageRequest(prompt: string): boolean {
  const clean = prompt.toLowerCase().trim().replace(/[^\w\s]/g, '');
  const ambiguousExactMatches = [
    'give me the image',
    'give me an image',
    'show me an image',
    'show me a picture',
    'show me photos',
    'find an image',
    'show an image',
    'get an image',
  ];
  return ambiguousExactMatches.includes(clean);
}

/**
 * Detects if user prompt is requesting an image/diagram/photo of a specific subject.
 */
export function detectImageSearchIntent(prompt: string): { isImageQuery: boolean; searchQuery: string } {
  if (isAmbiguousImageRequest(prompt)) {
    return { isImageQuery: true, searchQuery: '' };
  }

  const imageRegex = /(?:show\s+me\s+(?:photos?|pictures?|images?|diagrams?)|give\s+me\s+(?:an?\s+)?(?:image|picture|photo|diagram)|find\s+(?:an?\s+)?(?:image|photo|picture|diagram)|picture\s+of|photos?\s+of|images?\s+of|diagram\s+of|with\s+(?:an?\s+)?(?:image|diagram|picture))\s+(?:of\s+)?([^.\n\?]+)/i;

  const match = prompt.match(imageRegex);
  if (match && match[1]) {
    return { isImageQuery: true, searchQuery: match[1].trim() };
  }

  return { isImageQuery: false, searchQuery: '' };
}

/**
 * Generates dynamic, real-time date and time context in Asia/Kolkata (IST).
 * Ensures the AI never uses stale, hardcoded dates or guesses today's date.
 */
export function getRuntimeDateTimeContext(): string {
  const now = new Date();

  const currentDateStr = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(now);

  const currentTimeStr = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(now);

  const isoDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  return `CURRENT RUNTIME DATE & TIME CONTEXT (Asia/Kolkata - India Standard Time):
- Today's Date: ${currentDateStr} (ISO: ${isoDateStr})
- Current Time: ${currentTimeStr}
- Timezone: Asia/Kolkata (IST)

DATE & TIME RESPONSE RULES:
1. When asked for today's date, current date, current day, current time, current month, or current year, ALWAYS respond using the exact system date/time provided above (${currentDateStr}).
2. Calculate relative dates dynamically based on today's date (${currentDateStr}):
   - Yesterday = 1 day before today's date (${currentDateStr}).
   - Tomorrow = 1 day after today's date (${currentDateStr}).
3. NEVER guess or return arbitrary/hardcoded dates (such as March 30, 2026). Always rely on this dynamic runtime context.`;
}

/**
 * Removes hallucinated fake image Markdown syntax (e.g. ![alt](http://example.com/...)) from AI responses.
 */
export function sanitizeHallucinatedImageMarkdown(text: string): string {
  return text.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s\)]+)\)/gi, '');
}

/**
 * Executes a Gemini request with automatic model fallback chain upon 429 quota exhaustion.
 */
async function generateContentWithModelFallback(params: {
  apiKey: string;
  contents: Array<{ role: 'user' | 'model'; parts: Array<any> }>;
  systemInstruction: string;
}): Promise<string> {
  // 1. First try server-side secure AI proxy
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: params.contents,
        systemInstruction: params.systemInstruction,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.text) {
        console.log(`[StudyFlow AI Proxy] Server generated response via model: ${data.model}`);
        return data.text;
      }
    }
  } catch (proxyErr) {
    console.warn('[StudyFlow AI Proxy] Server proxy call failed, using client-side fallback:', proxyErr);
  }

  // 2. Client-side fallback if server proxy unavailable
  if (!params.apiKey) {
    throw new Error('Gemini API key is not configured.');
  }

  const aiClient = new GoogleGenAI({ apiKey: params.apiKey });
  let lastError: any = null;

  for (const modelName of ALL_CANDIDATE_MODELS) {
    try {
      console.log(`[StudyFlow AI Client] Trying model: ${modelName}`);

      const response = await aiClient.models.generateContent({
        model: modelName,
        contents: params.contents,
        config: {
          systemInstruction: params.systemInstruction,
        },
      });

      if (response && response.text) {
        console.log(`[StudyFlow AI Client] Model succeeded: ${modelName}`);
        return response.text;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[StudyFlow AI Client] Model failed: ${modelName}`, err);
    }
  }

  throw lastError || new Error('All configured Gemini models failed.');
}

export const aiService = {
  adaptDailyPlanWithMood(
    mood: StudentMood,
    selectedSubjectCode: string = 'ES-CS201',
    tasks: TaskItem[] = []
  ) {
    return plannerEngine.generateDailyPlan(mood, selectedSubjectCode, tasks);
  },

  generatePracticeSet(topicTitle: string, subjectCode?: string) {
    console.log(`[StudyFlow AI] Generating practice set for ${topicTitle} (${subjectCode || 'ES-CS201'})`);
  },

  adaptPlanByMood(mood: StudentMood): {
    recommendedHours: string;
    adjustedDifficulty: string;
    advice: string;
  } {
    switch (mood) {
      case 'great':
        return {
          recommendedHours: '3.5 - 4.0 hrs',
          adjustedDifficulty: 'Challenging & Deep Focus',
          advice: 'You are feeling great! Excellent time to master hard concepts and solve advanced practice sets.',
        };
      case 'good':
        return {
          recommendedHours: '2.5 - 3.0 hrs',
          adjustedDifficulty: 'Balanced & Steady Progress',
          advice: 'Good energy level! Stick to your standard daily topic plan.',
        };
      case 'okay':
        return {
          recommendedHours: '2.0 hrs',
          adjustedDifficulty: 'Standard pace',
          advice: 'Take regular 5-minute breaks between modules to maintain focus.',
        };
      case 'low':
        return {
          recommendedHours: '1.5 hrs',
          adjustedDifficulty: 'Light & Encouraging',
          advice: 'Focus on high-priority key formulas and short summary modules today.',
        };
      case 'sad':
        return {
          recommendedHours: '1.0 hr',
          adjustedDifficulty: 'Gentle & Manageable',
          advice: 'Take it easy today. Review basic concepts and short examples.',
        };
      case 'stressed':
        return {
          recommendedHours: '1.0 - 1.5 hrs',
          adjustedDifficulty: 'De-stressed & Step-by-step',
          advice: 'Breathing room first! We lowered topic intensity and highlighted essential formulas only.',
        };
      default:
        return {
          recommendedHours: '2.5 hrs',
          adjustedDifficulty: 'Standard',
          advice: 'Consistent daily practice leads to success!',
        };
    }
  },

  getInitialTopicMessage(session: ActiveStudySession, userName?: string): string {
    const nameStr = userName && typeof userName === 'string' && userName.trim() ? userName.trim() : '';
    const greeting = nameStr ? `Hello ${nameStr}!` : 'Hello!';

    return `${greeting} I am your AI Study Companion for **${session.subjectName}** (${session.subjectCode}).

We are currently working on:
**${session.topicTitle}** (${session.module})

Your mood is set to **${session.mood.toUpperCase()}**. I've adjusted my explanations to match your pace. 

How would you like to start? Select an option below or type any question!`;
  },

  /**
   * Main AI Chat Function: Sends multi-turn chat messages to Gemini API with model fallback chain & real image search.
   */
  async sendRealAIChatMessage(params: {
    session?: ActiveStudySession | null;
    history: ChatHistoryMessage[];
    userPrompt: string;
    attachment?: ProcessedAttachment | null;
    attachments?: ProcessedAttachment[] | null;
  }): Promise<{ message: string; imageResults?: ImageSearchResult[]; googleSearchUrl?: string }> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

    // 1. Ambiguous image request check
    if (isAmbiguousImageRequest(params.userPrompt)) {
      return {
        message: `What image would you like me to show? Please specify the topic, diagram, or person (e.g., *"founders of Google"*, *"picture of a CPU"*, *"diagram of a harmonic oscillator"*).`,
      };
    }

    // 2. Specific image query intent detection
    const imageIntent = detectImageSearchIntent(params.userPrompt);
    let fetchedImageResults: ImageSearchResult[] | undefined;
    let imageQueryGoogleUrl: string | undefined;

    if (imageIntent.isImageQuery && imageIntent.searchQuery) {
      const isMultiImage = /founders|photos|pictures|images|both/i.test(params.userPrompt);
      const searchCount = isMultiImage ? 2 : 1;
      imageQueryGoogleUrl = buildGoogleImagesUrl(imageIntent.searchQuery);

      console.log(`[StudyFlow AI] Performing real image search for: "${imageIntent.searchQuery}" (count: ${searchCount})`);
      const results = await imageSearchService.searchRealImages(imageIntent.searchQuery, searchCount);

      if (results.length > 0) {
        fetchedImageResults = results;
      }
    }

    // 3. Build system instruction prompt with academic, date/time, & mood context
    const dateTimeContext = getRuntimeDateTimeContext();
    let systemInstruction = `You are StudyFlow AI, an expert, standalone academic AI tutor and study companion for engineering and computer science students.

${dateTimeContext}

RESPONSE PRIORITY HIERARCHY:
1. ALWAYS prioritize answering the student's specific input question or prompt directly and fully.
2. NEVER reject, decline, or refuse a valid academic, programming, science, or general educational question simply because it differs from an active study topic or Daily Plan item.
3. Use the MAKAUT B.Tech CSE 1st Year curriculum data as your primary reference for terminology, syllabus structure, and academic level.
4. If a question is outside the standard MAKAUT syllabus (e.g., "How does ChatGPT work?", "What is Git?", "Explain JavaScript promises"), answer the question clearly and accurately, while noting gracefully if it is outside the 1st-year MAKAUT curriculum.
5. If an optional active topic context is provided, use it as helpful background context or for disambiguating short follow-up queries, but NEVER force the student to stay locked to that topic.
6. When asked for practice questions, generate AT LEAST 10 practice questions by default (or the exact count requested by the student). Number them clearly (1 to N) with a balanced difficulty progression (Easy -> Medium -> Hard).
7. IMAGE REQUESTS: Do NOT generate or invent unverified image URLs (e.g. example.com/image.jpg). Focus on clear explanatory text.

FORMATTING REQUIREMENTS:
- Use clean Markdown headers, bullet points, and bold text for readability.
- Mathematical equations must use LaTeX notation ($...$ for inline, $$...$$ for block).
- Code examples (C, C++, Java, Python, JS, HTML, CSS) must be wrapped in language-specific code blocks.`;

    if (params.session) {
      const s = params.session;
      const moodRules: Record<StudentMood, string> = {
        great: 'Provide deeper theoretical insights, advanced problem-solving, and challenging questions.',
        good: 'Provide normal step-by-step explanations, moderate examples, and practice.',
        okay: 'Provide balanced explanations, simple-to-medium examples, and moderate practice.',
        low: 'Provide shorter explanations, smaller learning chunks, simple examples, and an encouraging tone.',
        sad: 'Provide very manageable explanations, short sections, simple examples, and a gentle, supportive tone.',
        stressed: 'Provide essential concepts first, short explanations, important formulas, and exam-critical material in small, calm steps.',
      };

      systemInstruction += `

OPTIONAL ENTRY CONTEXT (Do NOT restrict user queries):
- University: MAKAUT (Maulana Abul Kalam Azad University of Technology, West Bengal)
- Program: B.Tech 1st Year CSE
- Active Subject Context: ${s.subjectName} (${s.subjectCode})
- Active Topic Context: ${s.topicTitle} (${s.module})
- Student Current Mood: ${s.mood}

MOOD-AWARE TEACHING STYLE:
${moodRules[s.mood] || moodRules.good}
`;
    }

    try {
      // Format multi-turn conversation history for Gemini API
      const contents: Array<{ role: 'user' | 'model'; parts: Array<any> }> = params.history
        .filter((msg) => typeof msg.content === 'string')
        .map((msg) => ({
          role: (msg.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
          parts: [{ text: typeof msg.content === 'string' ? msg.content : '' }],
        }));

      // Construct current user parts array
      const userParts: Array<any> = [];

      // Combine single and multiple attachments
      const allAttachments: ProcessedAttachment[] = [];
      if (params.attachments && params.attachments.length > 0) {
        allAttachments.push(...params.attachments);
      } else if (params.attachment) {
        allAttachments.push(params.attachment);
      }

      let extraContextText = '';

      for (const att of allAttachments) {
        if (att.fileType === 'image' && att.base64Data) {
          userParts.push({
            inlineData: {
              mimeType: att.mimeType,
              data: att.base64Data,
            },
          });
        }
        if ((att.fileType === 'pdf' || att.fileType === 'text' || att.fileType === 'doc') && att.content) {
          extraContextText += `\n\n[ATTACHED FILE CONTEXT: ${att.fileName} (${att.fileSize})]\n${att.content}\n[END ATTACHED FILE CONTEXT]\n`;
        }
        if (att.fileType === 'link' && att.content) {
          extraContextText += `\n\n[STUDY REFERENCE LINK: ${att.fileName} (${att.content})]\nUse this study link URL as reference context for your explanation.\n`;
        }
      }

      let finalPrompt = params.userPrompt;
      if (extraContextText) {
        finalPrompt += extraContextText;
      }

      userParts.push({ text: finalPrompt });

      contents.push({
        role: 'user',
        parts: userParts,
      });

      // Execute Gemini request
      let rawText = await generateContentWithModelFallback({
        apiKey,
        contents,
        systemInstruction,
      });

      // Sanitize any hallucinated unverified fake image URLs returned by Gemini
      let cleanedText = sanitizeHallucinatedImageMarkdown(rawText);

      // Target question count verification & auto-completion
      const targetCount = parseQuestionCountFromPrompt(params.userPrompt);
      if (targetCount && targetCount >= 5) {
        const detectedCount = countQuestionsInResponse(cleanedText);

        if (detectedCount > 0 && detectedCount < targetCount) {
          console.log(
            `[StudyFlow AI] Initial response generated ${detectedCount}/${targetCount} questions. Requesting completion...`
          );

          const followUpPrompt = `Your previous response generated ${detectedCount} out of the requested ${targetCount} questions. Please continue directly from question ${
            detectedCount + 1
          } up to question ${targetCount}. Do not repeat previous questions.`;

          contents.push({ role: 'model', parts: [{ text: cleanedText }] });
          contents.push({ role: 'user', parts: [{ text: followUpPrompt }] });

          const completionText = await generateContentWithModelFallback({
            apiKey,
            contents,
            systemInstruction,
          });

          cleanedText = `${cleanedText}\n\n${sanitizeHallucinatedImageMarkdown(completionText)}`;
        }
      }

      // If an image search query was performed but returned 0 results:
      if (imageIntent.isImageQuery && imageIntent.searchQuery && (!fetchedImageResults || fetchedImageResults.length === 0)) {
        cleanedText += `\n\n*Unable to retrieve images right now for "${imageIntent.searchQuery}". You can search directly on Google Images using the button below.*`;
      }

      return {
        message: cleanedText,
        imageResults: fetchedImageResults,
        googleSearchUrl: imageQueryGoogleUrl,
      };
    } catch (err: any) {
      console.error('[StudyFlow AI] sendRealAIChatMessage error:', err);
      throw err;
    }
  },
};
