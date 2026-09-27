import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// High payload limit for uploaded PDFs and documents
app.use(express.json({ limit: "60mb" }));
app.use(express.urlencoded({ extended: true, limit: "60mb" }));

// Lazy/safe initialization of Gemini
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Resilient helper to call Gemini with model fallback if primary experiences temporary capacity spikes
async function generateContentWithFallback(params: {
  contents: any;
  config?: any;
}) {
  const ai = getGeminiClient();
  const modelsToTry = ["gemini-2.5-flash", "gemini-3.8-flash", "gemini-3.1-flash-lite"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: {
          ...params.config,
          maxOutputTokens: 16384,
        },
      });
      return response;
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${model} call failed, attempting fallback if available:`, err?.message || err);
      // Wait 300ms before trying the next model
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  throw lastError;
}

// Repair function that closes unfinished strings, arrays, and objects
function repairTruncatedJson(str: string): string {
  let cleaned = str.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }

  let inString = false;
  let isEscaped = false;
  const stack: string[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (ch === "\\") {
        isEscaped = true;
      } else if (ch === '"') {
        inString = false;
      }
    } else {
      if (ch === '"') {
        inString = true;
      } else if (ch === "{" || ch === "[") {
        stack.push(ch === "{" ? "}" : "]");
      } else if (ch === "}" || ch === "]") {
        if (stack.length > 0 && stack[stack.length - 1] === ch) {
          stack.pop();
        }
      }
    }
  }

  if (inString) {
    cleaned += '"';
  }

  // Clean trailing punctuation before closing brackets
  cleaned = cleaned.trim();
  cleaned = cleaned.replace(/:\s*$/, ': ""');
  cleaned = cleaned.replace(/,\s*"[^"]*"\s*$/, "");
  cleaned = cleaned.replace(/,\s*$/, "");

  // Pop all closing tokens in reverse order
  while (stack.length > 0) {
    const closer = stack.pop();
    cleaned = cleaned.replace(/,\s*$/, "");
    cleaned += closer;
  }

  return cleaned;
}

// Robust JSON parser to gracefully handle markdown fences or partial responses
function robustParseJson(raw?: string): any {
  if (!raw) return {};
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // Attempt automated structural repair if truncated
    try {
      const repaired = repairTruncatedJson(cleaned);
      return JSON.parse(repaired);
    } catch (repairErr) {
      console.warn("Structural JSON repair failed, attempting regex slice:", repairErr);
    }

    // Attempt extracting outermost balanced JSON object
    const startIdx = cleaned.indexOf("{");
    const endIdx = cleaned.lastIndexOf("}");
    if (startIdx !== -1 && endIdx > startIdx) {
      try {
        return JSON.parse(cleaned.substring(startIdx, endIdx + 1));
      } catch (innerErr) {
        console.warn("Outermost JSON extract failed:", innerErr);
      }
    }
    throw err;
  }
}

// In-memory cache for fast repeated queries & multi-student concurrency
interface CacheItem {
  data: any;
  cachedAt: number;
}
const notesCache = new Map<string, CacheItem>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours TTL
const MAX_CACHE_ENTRIES = 500;

function getCachedNote(key: string): any | null {
  const item = notesCache.get(key);
  if (!item) return null;
  if (Date.now() - item.cachedAt > CACHE_TTL_MS) {
    notesCache.delete(key);
    return null;
  }
  return item.data;
}

function setCachedNote(key: string, data: any) {
  if (notesCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = notesCache.keys().next().value;
    if (oldestKey) notesCache.delete(oldestKey);
  }
  notesCache.set(key, { data, cachedAt: Date.now() });
}

function formatSeconds(secs: number): string {
  const s = Math.floor(secs);
  const m = Math.floor(s / 60);
  const remSec = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const remMin = m % 60;
    return `${h.toString().padStart(2, "0")}:${remMin.toString().padStart(2, "0")}:${remSec.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${remSec.toString().padStart(2, "0")}`;
}

// Helper: Extract YouTube video ID
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();
  // Support raw 11-char video ID directly
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
    return cleanUrl;
  }
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/;
  const match = cleanUrl.match(regExp);
  return match ? match[1] : null;
}

// Helper: Extract chapters from description text
function extractChaptersFromText(text: string): { time: string; title: string }[] {
  if (!text) return [];
  const chapters: { time: string; title: string }[] = [];
  const lines = text.split("\n");
  const timeRegex = /(?:^|\s)((?:[0-9]{1,2}:)?[0-9]{1,2}:[0-9]{2})(?:\s*[-–—:|]\s*|\s+)(.+)/;
  for (const line of lines) {
    const match = line.trim().match(timeRegex);
    if (match && match[1] && match[2]) {
      const time = match[1].trim();
      const title = match[2].trim().replace(/^[-–—:|]\s*/, "");
      if (title.length > 2 && title.length < 120) {
        chapters.push({ time, title });
      }
    }
  }
  return chapters;
}

// Helper: Extract captionTracks array reliably using balanced bracket parsing
function extractCaptionTracksFromHtml(html: string): any[] {
  const key = '"captionTracks":';
  let idx = html.indexOf(key);
  while (idx !== -1) {
    const startBracket = html.indexOf("[", idx + key.length);
    if (startBracket !== -1 && startBracket - idx < 50) {
      let depth = 0;
      let inString = false;
      let isEscaped = false;
      for (let i = startBracket; i < html.length; i++) {
        const c = html[i];
        if (inString) {
          if (isEscaped) {
            isEscaped = false;
          } else if (c === "\\") {
            isEscaped = true;
          } else if (c === '"') {
            inString = false;
          }
        } else {
          if (c === '"') {
            inString = true;
          } else if (c === "[") {
            depth++;
          } else if (c === "]") {
            depth--;
            if (depth === 0) {
              const jsonStr = html.substring(startBracket, i + 1);
              try {
                const tracks = JSON.parse(jsonStr);
                if (Array.isArray(tracks) && tracks.length > 0) {
                  return tracks;
                }
              } catch {
                // Keep looking
              }
              break;
            }
          }
        }
      }
    }
    idx = html.indexOf(key, idx + key.length);
  }
  return [];
}

// Helper: Attempt to fetch YouTube video metadata, chapters, and captions
async function fetchYouTubeContext(videoId: string, fullUrl: string): Promise<{
  title: string;
  author: string;
  transcriptSnippet?: string;
  hasTranscript: boolean;
  videoDescription?: string;
  chapters?: { time: string; title: string }[];
}> {
  let title = `YouTube Lecture (${videoId})`;
  let author = "Academic Source";
  let transcript = "";
  let videoDescription = "";
  let chapters: { time: string; title: string }[] = [];

  // Try oEmbed for title & author with 5s timeout
  try {
    const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (oembedRes.ok) {
      const data = (await oembedRes.json()) as { title?: string; author_name?: string };
      if (data.title) title = data.title;
      if (data.author_name) author = data.author_name;
    }
  } catch (err) {
    console.warn("oEmbed fetch failed or timed out:", err);
  }

  // Try scraping watch page for caption track, description, and chapters with 7s timeout
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
      },
      signal: AbortSignal.timeout(7000),
    });
    if (pageRes.ok) {
      const html = await pageRes.text();

      // Extract full description from ytInitialPlayerResponse or meta tags
      const shortDescMatch = html.match(/"shortDescription":\s*"((?:[^"\\]|\\.)*)"/);
      if (shortDescMatch && shortDescMatch[1]) {
        try {
          videoDescription = JSON.parse(`"${shortDescMatch[1]}"`);
        } catch {
          videoDescription = shortDescMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
        }
      } else {
        const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i);
        if (descMatch && descMatch[1]) {
          videoDescription = descMatch[1].replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
        }
      }

      // Extract chapters from description
      chapters = extractChaptersFromText(videoDescription);

      // Extract caption tracks using balanced bracket parser
      const tracks = extractCaptionTracksFromHtml(html);
      if (tracks && tracks.length > 0) {
        // Preferred track: English manual > English auto > Hindi manual > Hindi auto > first
        const selectedTrack =
          tracks.find((t: any) => (t.languageCode?.startsWith("en") || t.vssId?.includes("en")) && !t.kind) ||
          tracks.find((t: any) => t.languageCode?.startsWith("en") || t.vssId?.includes("en")) ||
          tracks.find((t: any) => t.languageCode?.startsWith("hi") || t.vssId?.includes("hi")) ||
          tracks[0];

        if (selectedTrack && selectedTrack.baseUrl) {
          try {
            const captionRes = await fetch(selectedTrack.baseUrl, {
              headers: { "User-Agent": "Mozilla/5.0" },
              signal: AbortSignal.timeout(6000),
            });
            if (captionRes.ok) {
              const xml = await captionRes.text();
              const textMatches = xml.matchAll(/<text(?:\s+[^>]*?)start="([^"]*)"[^>]*>(.*?)<\/text>/gi);
              const lines: string[] = [];
              let lastTimestampSec = -999;

              for (const m of textMatches) {
                const startSec = parseFloat(m[1] || "0");
                const cleaned = (m[2] || "")
                  .replace(/&amp;/g, "&")
                  .replace(/&lt;/g, "<")
                  .replace(/&gt;/g, ">")
                  .replace(/&quot;/g, '"')
                  .replace(/&#39;/g, "'")
                  .replace(/<[^>]+>/g, "")
                  .trim();

                if (cleaned) {
                  if (startSec - lastTimestampSec >= 25) {
                    lines.push(`\n[${formatSeconds(startSec)}] ${cleaned}`);
                    lastTimestampSec = startSec;
                  } else {
                    lines.push(cleaned);
                  }
                }
              }

              if (lines.length === 0) {
                const simpleMatches = xml.matchAll(/<text[^>]*>(.*?)<\/text>/g);
                for (const sm of simpleMatches) {
                  const cleaned = sm[1]
                    .replace(/&amp;/g, "&")
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">")
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/<[^>]+>/g, "")
                    .trim();
                  if (cleaned) lines.push(cleaned);
                }
              }

              if (lines.length > 0) {
                transcript = lines.join(" ");
              }
            }
          } catch (e) {
            console.warn("Failed fetching caption track XML:", e);
          }
        }
      }

      // Fallback: If no transcript from page, try timedtext API directly
      if (!transcript) {
        try {
          const directRes = await fetch(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`, {
            headers: { "User-Agent": "Mozilla/5.0" },
            signal: AbortSignal.timeout(4000),
          });
          if (directRes.ok) {
            const directXml = await directRes.text();
            const directMatches = directXml.matchAll(/<text(?:\s+[^>]*?)start="([^"]*)"[^>]*>(.*?)<\/text>/gi);
            const directLines: string[] = [];
            let lastSec = -999;
            for (const dm of directMatches) {
              const sec = parseFloat(dm[1] || "0");
              const txt = (dm[2] || "")
                .replace(/&amp;/g, "&")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/<[^>]+>/g, "")
                .trim();
              if (txt) {
                if (sec - lastSec >= 25) {
                  directLines.push(`\n[${formatSeconds(sec)}] ${txt}`);
                  lastSec = sec;
                } else {
                  directLines.push(txt);
                }
              }
            }
            if (directLines.length > 0) {
              transcript = directLines.join(" ");
            }
          }
        } catch {
          // direct timedtext fallback failed
        }
      }
    }
  } catch (err) {
    console.warn("Failed to fetch watch page for captions:", err);
  }

  return {
    title,
    author,
    transcriptSnippet: transcript ? transcript.slice(0, 160000) : undefined,
    hasTranscript: Boolean(transcript && transcript.length > 50),
    videoDescription,
    chapters,
  };
}

// JSON Schema for structured student notes
const studyNotesSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Descriptive academic title of the lecture or document" },
    executiveSummary: {
      type: Type.STRING,
      description: "Direct chapter-end textbook summary (like the summary at the end of an NCERT or physics textbook chapter). State the actual factual laws, governing equations, core mechanisms, and essential truths learned. ABSOLUTELY NEVER write meta-commentary like 'This guide helps you...', 'In this video you will learn...', 'These notes provide...'. Speak directly about the subject matter itself in clear, concise factual statements stating what is important and what users must know.",
    },
    keyTakeaways: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "4-6 essential high-yield core takeaways, fundamental truths, or governing rules that every student must know",
    },
    essentialKeywords: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          keyword: { type: Type.STRING, description: "Key scientific/academic term, law, or keyword" },
          mustKnowMeaning: { type: Type.STRING, description: "Simple, direct explanation in plain words of what students must know about this keyword" },
          whyImportant: { type: Type.STRING, description: "Why this keyword is tested or crucial in this chapter" },
        },
        required: ["keyword", "mustKnowMeaning"],
      },
      description: "6-10 essential keywords and vocabulary terms from this chapter that every student must know.",
    },
    sections: {
      type: Type.ARRAY,
      description:
        "Array of AT LEAST 8 to 16 comprehensive, granular topic sections covering EVERY distinct subtopic, mechanical constraint, method, theorem, and problem-solving technique from the lecture. Never lump all concepts into 2 or 3 generic sections. You MUST provide a dedicated individual section for every subtopic: e.g. for mechanics: Free Body Diagrams, String constraints & tension, Wedge constraints & inclined planes, Pulley systems, Friction (static/limiting/kinetic/two-block), Pseudo forces, Springs; for chemistry: each reaction type, mechanism, reagent; for any subject: EVERY subtopic covered in the video MUST have its own dedicated topic section.",
      items: {
        type: Type.OBJECT,
        properties: {
          heading: { type: Type.STRING, description: "Section topic heading" },
          timestamp: { type: Type.STRING, description: "Approximate time or part (e.g. '04:15' or 'Part 1')" },
          difficulty: {
            type: Type.STRING,
            description: "'foundational_basic' (101 intro & prerequisite definitions) | 'core_concept' (main engine & standard mechanics) | 'advanced_mastery' (deep theoretical proofs, boundary conditions, edge cases)",
          },
          mainPoint: {
            type: Type.STRING,
            description: "The single most crucial takeaway, core thesis, or foundational rule of this section in 1 punchy, memorable sentence.",
          },
          foundationalIntro: {
            type: Type.STRING,
            description: "Beginner-friendly 101 explanation: what this topic is, simple everyday analogy, and prerequisites so a beginner understands immediately.",
          },
          content: {
            type: Type.STRING,
            description: "Detailed, highly structured notes using professional typographic hierarchy (bold lead-in headers, bullet points, numbered steps for sequential logic, never a wall of paragraph text)",
          },
          simplifiedContent: {
            type: Type.STRING,
            description: "A crisp 1-2 sentence core mental model and plain-English intuition for this section",
          },
          advancedDeepDive: {
            type: Type.STRING,
            description: "Thorough in-depth advanced breakdown: complete technical inner workings, mathematical or theoretical derivations, boundary conditions, edge cases, and complex exam traps for this specific topic.",
          },
          advancedMechanisms: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "2-4 detailed bullet points explaining the deep mechanisms and inner workings of this topic",
          },
          keyPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "3-5 structured bullet points highlighting critical rules, facts, or steps",
          },
          formulasOrTheorems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Name of the formula, theorem, or equation" },
                equation: { type: Type.STRING, description: "Mathematical expression or equation (e.g. 'f\'(x) = lim_{h->0} [f(x+h)-f(x)]/h' or 'E = mc^2')" },
                variables: { type: Type.STRING, description: "Breakdown of each variable or parameter" },
                application: { type: Type.STRING, description: "When and how to use it in practice or exams" },
              },
              required: ["name", "equation"],
            },
            description: "Important formulas, mathematical equations, theorems, or laws covered in this section (if any)",
          },
          diagramOrChart: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Title of the diagram, workflow, or comparison chart" },
              type: {
                type: Type.STRING,
                description: "Type: 'flowchart' | 'process_steps' | 'comparison_table' | 'hierarchy' | 'ascii_diagram'",
              },
              asciiArt: {
                type: Type.STRING,
                description: "Clean, elegant ASCII art or text diagram illustrating the mechanism, cycle, algorithm, or concept visually with boxes, arrows (-->), or step blocks if applicable",
              },
              explanation: { type: Type.STRING, description: "1-2 sentence visual explanation of what this diagram/chart depicts" },
            },
            description: "If the section discusses a process, cycle, algorithm, hierarchy, or mechanism, provide a structured visual text diagram or flowchart",
          },
          concepts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                term: { type: Type.STRING, description: "Key academic term, rule, or concept" },
                definition: { type: Type.STRING, description: "Clear, structured definition" },
                formulaOrDetail: { type: Type.STRING, description: "Formula, notation, or technical constraint" },
                whyItMatters: { type: Type.STRING, description: "Why it matters in this subject" },
                analogy: { type: Type.STRING, description: "Intuitive real-world analogy" },
              },
              required: ["term", "definition", "whyItMatters", "analogy"],
            },
          },
          teachersSpokenTips: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Crucial spoken remarks, unwritten rules of thumb, or verbal cautions the teacher said aloud during this topic that might not be on the board or slides.",
          },
        },
        required: ["heading", "content", "simplifiedContent", "keyPoints", "concepts"],
      },
    },
    examTips: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3-5 high-yield exam pitfalls, tricky edge cases, or grading tips",
    },
    visualTimelines: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          timestamp: {
            type: Type.STRING,
            description: "Exact timestamp in the video where this diagram, table, or visual appears (e.g. '03:45' or '14:20')",
          },
          timestampSeconds: {
            type: Type.INTEGER,
            description: "Total seconds into the video (e.g. 225 for 03:45)",
          },
          title: {
            type: Type.STRING,
            description: "Name or descriptive title of the diagram, chart, table, or slide",
          },
          visualType: {
            type: Type.STRING,
            description: "'topic_start' | 'important_term' | 'graph' | 'table' | 'diagram' | 'flowchart' | 'formula_derivation'",
          },
          importance: {
            type: Type.STRING,
            description: "'high_yield' | 'essential'",
          },
          whyImportant: {
            type: Type.STRING,
            description: "Pedagogical reason why this topic start, important term, graph, or table is critical for exams",
          },
          isSkipWorthy: {
            type: Type.BOOLEAN,
            description: "Always set to false. Only include high-yield checkpoints where important terms, topics start, or graphs/tables appear.",
          },
          recommendation: {
            type: Type.STRING,
            description: "Actionable exam advice (e.g. 'Must Pause & Draw / High Exam Probability' or 'Key definition tested in exams')",
          },
          keyExamTakeaway: {
            type: Type.STRING,
            description: "Specific exam takeaway, formula, or law tested from this checkpoint",
          },
        },
        required: ["timestamp", "title", "visualType", "importance", "whyImportant", "isSkipWorthy", "recommendation"],
      },
      description: "A chronological timeline strictly restricted to where major topics start, important terms are introduced, or graphs, tables, and diagrams appear in the video.",
    },
    formulasOrTheorems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Name of the formula, theorem, or equation" },
          equation: { type: Type.STRING, description: "Mathematical equation or expression (e.g. 'f\'(x) = lim_{h->0} [f(x+h)-f(x)]/h' or 'E = mc^2')" },
          variables: { type: Type.STRING, description: "Breakdown of each variable or parameter" },
          application: { type: Type.STRING, description: "When and how to use it in practice or exams" },
        },
        required: ["name", "equation"],
      },
      description: "Key formulas, mathematical theorems, or laws covered across the video/document (if any)",
    },
    diagramOrChart: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Title of the diagram, flowchart, or chart" },
        type: {
          type: Type.STRING,
          description: "Type: 'flowchart' | 'process_steps' | 'comparison_table' | 'hierarchy' | 'ascii_diagram'",
        },
        asciiArt: {
          type: Type.STRING,
          description: "Clean, elegant ASCII art or text diagram illustrating the main mechanism, cycle, hierarchy, or concept visually with boxes and arrows (-->)",
        },
        explanation: { type: Type.STRING, description: "1-2 sentence visual explanation of what this diagram/chart depicts" },
        steps: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              stepNumber: { type: Type.INTEGER, description: "Sequence number (1, 2, 3...)" },
              title: { type: Type.STRING, description: "Short title of this phase or step" },
              description: { type: Type.STRING, description: "Clear explanation of what happens in this stage" },
            },
            required: ["stepNumber", "title", "description"],
          },
          description: "Sequential breakdown or stages of the process, cycle, or mechanism for visual flowchart rendering",
        },
      },
      description: "Visual text diagram or flowchart if the video contains any important diagram, mechanism, or chart",
    },
    flashcards: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          question: {
            type: Type.STRING,
            description: "Front of card. Clear, single-fact question formatted as 'Que. : [Question]'. Tests one concept only.",
          },
          answer: {
            type: Type.STRING,
            description: "Back of card. Short, clear, exam-oriented answer formatted as 'Ans. : [Answer]'. Concise, never long paragraphs.",
          },
          type: {
            type: Type.STRING,
            enum: ["definition", "formula", "difference", "diagram", "mnemonic", "trap"],
            description: "Card type: definition (direct definition), formula (equation and terms), difference (conceptual difference between A & B), diagram (ASCII/schematic diagram), mnemonic (memory trick/recall aid), or trap (conceptual trap or common mistake)",
          },
          difficulty: {
            type: Type.STRING,
            enum: ["Easy", "Medium", "Hard"],
            description: "Difficulty: Easy = direct definitions; Medium = application-based (short derivations, examples); Hard = conceptual traps or common mistakes",
          },
          importance: {
            type: Type.STRING,
            enum: ["High-Yield", "Medium", "Low"],
            description: "Importance tag: High-Yield (exam-critical points), Medium, or Low",
          },
          hint: {
            type: Type.STRING,
            description: "Short optional memory hint or recall clue",
          },
          topicTag: {
            type: Type.STRING,
            description: "The major topic or subtopic from this video this flashcard belongs to",
          },
        },
        required: ["id", "question", "answer", "type", "difficulty", "importance"],
      },
      description: "Exhaustive active recall flashcards (4-6 flashcards per major topic, at least 14-24 cards total) strictly tailored to this video transcript. Include all types: Definitions, Formulas, Conceptual Differences, Diagrams (ASCII), Mnemonics, and Traps across Easy, Medium, and Hard with High-Yield / Medium / Low importance tags.",
    },
    foundationalBasics: {
      type: Type.OBJECT,
      properties: {
        prerequisites: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Essential foundational prerequisite knowledge students need to understand this topic",
        },
        coreGlossary: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              term: { type: Type.STRING },
              simpleExplanation: { type: Type.STRING, description: "Plain-English, beginner-friendly 101 explanation" },
            },
            required: ["term", "simpleExplanation"],
          },
          description: "3-5 foundational 101 definitions from the start of the video",
        },
        foundationalPrinciples: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "3-4 baseline principles or rules underlying the entire topic",
        },
      },
      required: ["prerequisites", "coreGlossary", "foundationalPrinciples"],
      description: "Foundational basics and prerequisite knowledge from the video to guarantee beginners are never lost",
    },
    advancedMastery: {
      type: Type.OBJECT,
      properties: {
        deepMechanisms: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "In-depth advanced mechanisms, proofs, or complex processes explained in the material",
        },
        edgeCasesAndNuances: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Subtle edge cases, theoretical exceptions, and advanced exam traps",
        },
        topicBreakdowns: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING, description: "Name of the covered topic/subtopic" },
              deepMechanism: { type: Type.STRING, description: "Exhaustive in-depth explanation of how this specific topic works under the hood, including underlying mechanics and equations" },
              practicalOrExamApplication: { type: Type.STRING, description: "How this topic is tested on hard exams or applied in real-world scenarios" },
            },
            required: ["topic", "deepMechanism", "practicalOrExamApplication"],
          },
          description: "Comprehensive breakdown of EVERY topic covered in the video with rigorous in-depth technical explanation",
        },
      },
      required: ["deepMechanisms", "edgeCasesAndNuances"],
      description: "Advanced mastery, theoretical nuances, and edge cases from the material",
    },
    teachersSpokenGoldenLines: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          spokenLine: {
            type: Type.STRING,
            description: "The teacher's exact spoken remark, verbal rule of thumb, shortcut, or exam warning spoken aloud during the lecture that might not be written on the board or slides.",
          },
          context: {
            type: Type.STRING,
            description: "The topic, problem, or scenario where the teacher stated this.",
          },
          examSignificance: {
            type: Type.STRING,
            description: "Why this unwritten spoken line is critical for exams or avoids common traps.",
          },
        },
        required: ["spokenLine", "context", "examSignificance"],
      },
      description: "4-8 essential spoken insights, teacher quotes, verbal warnings, or shortcut rules stated aloud by the instructor in the video that are not written on slides or board, ensuring zero important points are left behind.",
    },
  },
  required: ["title", "executiveSummary", "keyTakeaways", "sections", "examTips", "flashcards"],
};

// Helper: Convert any conversational Hinglish phrases into articulate, academic English
function cleanHinglishToEnglish(text: string): string {
  if (!text) return "";
  let s = text;
  s = s.replace(/yahan students aksar confuse hote hain,?\s*dhyaan rahe ki/gi, "Common exam trap: Note that");
  s = s.replace(/yahan students confuse hote hain,?\s*dhyaan rahe ki/gi, "Common student misconception: Note that");
  s = s.replace(/yahan students aksar confuse hote hain/gi, "Students frequently confuse this point:");
  s = s.replace(/yahan students confuse hote hain/gi, "Students commonly confuse this concept:");
  s = s.replace(/dhyaan rahe ki|dhyan rahe ki/gi, "Keep in mind that");
  s = s.replace(/dhyan rakhein ki|dhyaan rakhein ki/gi, "Remember that");
  s = s.replace(/bhai is concept me[n]?/gi, "In this concept,");
  s = s.replace(/simple words me[n]?:/gi, "In simple terms:");
  s = s.replace(/trick yaad rakhna:/gi, "Key exam trick:");
  s = s.replace(/notice karo ki/gi, "Notice that");
  s = s.replace(/aksar exam me[n]? pucha jata hai/gi, "Frequently tested in exams:");
  s = s.replace(/isko yaad rakhna/gi, "remember that");
  s = s.replace(/ye passive resistance nahi hai/gi, "this is not passive resistance");
  return s.trim();
}

// Helper: Ensure comprehensive flashcards and safe defaults
function ensureFlashcardsAndEssentials(parsed: any, topicTitle: string, languageTone: string = "standard") {
  parsed.quiz = []; // Quiz feature removed per user request
  const isDostTone = languageTone === "peer_friendly";

  const secList = Array.isArray(parsed.sections) ? parsed.sections : [];
  const formulas = Array.isArray(parsed.formulasOrTheorems) ? parsed.formulasOrTheorems : [];
  const existing = Array.isArray(parsed.flashcards) ? parsed.flashcards : [];

  // Synthesize rich flashcards if fewer than 12
  if (existing.length < 12) {
    secList.forEach((s: any, idx: number) => {
      const heading = s.heading || `${topicTitle} Topic ${idx + 1}`;
      const rawMainPt = s.mainPoint || s.simplifiedContent || s.content?.slice(0, 200) || "Essential governing principle.";
      const mainPt = isDostTone ? rawMainPt : cleanHinglishToEnglish(rawMainPt);
      const rawDeep = s.advancedDeepDive || (s.content && s.content.length > 80 ? s.content.slice(0, 240) : "");
      const deepDive = isDostTone ? rawDeep : cleanHinglishToEnglish(rawDeep);

      // 1. Definition card
      existing.push({
        id: `fc_def_${existing.length + 1}`,
        question: isDostTone
          ? `Que. : "${heading}" ka core definition aur governing rule kya hai?`
          : `Que. : What is the formal definition and fundamental principle of "${heading}"?`,
        answer: isDostTone
          ? `Ans. : ${mainPt}${deepDive ? ` Iska deep mechanism: ${deepDive}.` : ""} Dost, is concept ko exam me direct test kiya jata hai, dhyan se revise karna.`
          : `Ans. : ${mainPt}${deepDive ? ` Specifically, ${deepDive}` : " This constitutes the foundational rule tested under examination conditions."}`,
        type: "definition",
        difficulty: "Easy",
        importance: "High-Yield",
        topicTag: heading,
        hint: s.teachersSpokenTips?.[0]
          ? (isDostTone ? s.teachersSpokenTips[0] : cleanHinglishToEnglish(s.teachersSpokenTips[0]))
          : (isDostTone ? "Lecture ke initial core setup ko recall karo." : "Remember the primary boundary condition stated in the lecture."),
      });

      // 2. Formula card if formula exists
      const formula = s.formulasOrTheorems?.[0] || formulas[idx % (formulas.length || 1)];
      if (formula && existing.length < 24) {
        existing.push({
          id: `fc_formula_${existing.length + 1}`,
          question: isDostTone
            ? `Que. : "${formula.name || heading}" ka formula aur application kya hai?`
            : `Que. : What is the governing mathematical formula for "${formula.name || heading}"?`,
          answer: isDostTone
            ? `Ans. : Formula: ${formula.equation || formula.formula || "Key Equation"}. Variables: ${formula.variables || "standard parameters"}. Application: ${formula.application || "governing dynamics"}. Numerical solve karte waqt SI units ka dhyan zaroor rakhna!`
            : `Ans. : Equation: ${formula.equation || formula.formula || "Standard Equation"}. Variables: ${formula.variables || "governing parameters"}. Application: ${formula.application || "calculates equilibrium state under given boundary limits"}.`,
          type: "formula",
          difficulty: "Medium",
          importance: "High-Yield",
          topicTag: heading,
          hint: formula.application
            ? (isDostTone ? formula.application : cleanHinglishToEnglish(formula.application))
            : (isDostTone ? "SI units aur boundary values check karo." : "Recall the standard SI units and boundary constraints."),
        });
      }

      // 3. Trap card
      if (s.teachersSpokenTips?.[0] && existing.length < 24) {
        const rawTip = s.teachersSpokenTips[0];
        const tipText = isDostTone ? rawTip : cleanHinglishToEnglish(rawTip);
        existing.push({
          id: `fc_trap_${existing.length + 1}`,
          question: isDostTone
            ? `Que. : "${heading}" me students aksar kahan galti karte hain (Exam Trap)?`
            : `Que. : What is the most critical exam trap or common misconception regarding "${heading}"?`,
          answer: isDostTone
            ? `Ans. : Exam Trap Alert: ${tipText}. Exam me calculate karte waqt sign convention aur boundary conditions ko pehle verify kar lena!`
            : `Ans. : Exam Trap & Clarification: ${tipText}. In exam problems, verify boundary signs and coordinate axes before applying formulas.`,
          type: "trap",
          difficulty: "Hard",
          importance: "High-Yield",
          topicTag: heading,
          hint: isDostTone ? "Reference frame aur signs par dhyan do." : "Pay attention to coordinate axes and limiting conditions.",
        });
      }
    });
  }

  // Normalize all cards to ensure Que. : and Ans. : prefix and thorough answers in the chosen tone
  parsed.flashcards = existing.map((fc: any, i: number) => {
    let q = fc.question || (isDostTone ? `Que. : "${topicTitle}" ka key concept kya hai?` : `Que. : What is the key concept of "${topicTitle}"?`);
    if (!isDostTone) q = cleanHinglishToEnglish(q);
    if (!q.startsWith("Que.") && !q.startsWith("Que :") && !q.startsWith("Q:")) {
      q = `Que. : ${q.replace(/^Q:\s*/i, "").replace(/^Question:\s*/i, "")}`;
    }

    let a = fc.answer || (isDostTone ? `Ans. : Core principle lecture me detail se explain kiya gaya hai.` : `Ans. : Core principle demonstrated in the lecture.`);
    if (!isDostTone) a = cleanHinglishToEnglish(a);
    if (!a.startsWith("Ans.") && !a.startsWith("Ans :") && !a.startsWith("A:")) {
      a = `Ans. : ${a.replace(/^A:\s*/i, "").replace(/^Answer:\s*/i, "")}`;
    }

    // Ensure answer is not overly brief or truncated
    let aBody = a.replace(/^Ans\.\s*:\s*/i, "").trim();
    if (aBody.length < 60) {
      a = isDostTone
        ? `Ans. : ${aBody} Dost, ye exam point of view se kaafi important concept hai jisme marks score karna aasan ho jata hai.`
        : `Ans. : ${aBody} This represents an essential exam principle that examiners test to evaluate conceptual clarity and accurate problem solving.`;
    }

    return {
      id: fc.id || `fc_${i + 1}`,
      question: q,
      answer: a,
      type: fc.type || (i % 5 === 0 ? "definition" : i % 5 === 1 ? "formula" : i % 5 === 2 ? "diagram" : i % 5 === 3 ? "mnemonic" : "trap"),
      difficulty: fc.difficulty || (i % 3 === 0 ? "Easy" : i % 3 === 1 ? "Medium" : "Hard"),
      importance: fc.importance || (i % 3 === 0 ? "High-Yield" : i % 3 === 1 ? "Medium" : "Low"),
      topicTag: fc.topicTag || topicTitle,
      hint: fc.hint ? (isDostTone ? fc.hint : cleanHinglishToEnglish(fc.hint)) : undefined,
    };
  });
}

function buildSystemInstruction(
  style: string,
  academicLevel: string,
  focus: string,
  languageTone: string = "standard"
): string {
  // Style directives
  let styleDirective = "";
  switch (style) {
    case "cornell":
      styleDirective = `FORMAT: CORNELL NOTES SYSTEM
- Section keyPoints: Format strictly as provocative 'Cues & Self-Test Questions' that trigger active recall during revision.
- Section content: Format as clear, indented lecture notes highlighting key principles, formulas, and connections.
- Section simplifiedContent: 2-sentence crisp synthesis/summary at the bottom of the cue column.`;
      break;
    case "cheat_sheet":
      styleDirective = `FORMAT: EXAM CRAM & FORMULA CHEAT SHEET
- Maximum information density. High-yield memory triggers, mnemonics, quick-fire formulas, and high-frequency exam questions.
- Cut all introductory fluff. Pure signal, rapid exam recall.`;
      break;
    case "deep_study_guide":
      styleDirective = `FORMAT: COMPREHENSIVE ACADEMIC STUDY GUIDE
- Deep theoretical breakdown, step-by-step proofs/derivations, historical/intellectual context, and nuanced edge cases.
- Exhaustive concept mapping with formal definitions.`;
      break;
    case "executive_summary":
      styleDirective = `FORMAT: EXECUTIVE HIGH-LEVEL SYNTHESIS
- Focus on big-picture architecture, core mental models, overarching principles, and practical real-world ramifications.`;
      break;
    case "mindmap_outline":
      styleDirective = `FORMAT: HIERARCHICAL MINDMAP OUTLINE
- Strict nested logical tree (Core Theme > Sub-concepts > Proofs & Mechanisms > Practical Takeaways).
- Shows how each idea logically branches from the main thesis.`;
      break;
    case "bullet_points":
    default:
      styleDirective = `FORMAT: STRUCTURED HIGH-YIELD BULLET POINTS
- Fast to read, highly scannable bullet points with bold key terms, logical flow arrows (-->), and numbered sequential steps.`;
      break;
  }

  // Academic level directives (Teen & Gen-Z tuned, NO ELI5)
  let levelDirective = "";
  switch (academicLevel) {
    case "high_school":
      levelDirective = `TARGET AUDIENCE: High School, AP, and IB Students (Teen & Gen-Z Learners).
- TONE: High-energy, captivating, addictive, and crystal clear. Absolutely ZERO dry academic drone or textbook filler.
- ENGAGEMENT: Make concepts click immediately using vivid mental models, punchy analogies, and modern relatable framing.
- RIGOR: Do NOT dumb down the facts or math—explain the actual mechanics with thrilling clarity so students feel like they just unlocked a cheat code.`;
      break;
    case "competitive_exam":
      levelDirective = `TARGET AUDIENCE: Competitive Exam Sprints (SAT, ACT, AP, College Midterms/Finals).
- TONE: Fast-paced, laser-focused, tactical.
- EMPHASIS: Emphasize high-probability test questions, common trap choices examiners set to trick students, speed shortcuts, and formula applications.`;
      break;
    case "graduate":
      levelDirective = `TARGET AUDIENCE: Advanced / Graduate / Honors Level.
- TONE: Intellectually rigorous and theoretically precise.
- EMPHASIS: Formal mathematical notation, foundational proofs, boundary conditions, and contemporary research relevance.`;
      break;
    case "undergraduate":
    default:
      levelDirective = `TARGET AUDIENCE: College / Undergraduate Students.
- TONE: Engaging, sharp, modern, and intellectually stimulating.
- EMPHASIS: Balances academic depth with intuitive understanding. Connects theoretical models directly to concrete problems and exam mastery.`;
      break;
  }

  // Peer-Style / Study Buddy language directive
  const isDostTone = languageTone === "peer_friendly";
  let languageToneDirective = "";
  if (isDostTone) {
    languageToneDirective = `STUDY WRITING TECHNIQUE & TONE: DOST TONE (HINGLISH + FRIENDLY LANGUAGE)
- You MUST write the ENTIRE study notes, all section headings, explanations, bullet points, executive summaries, teacher golden lines, AND ALL FLASHCARDS in natural, friendly HINGLISH (conversational bilingual Hindi + English phrasing written in Roman script).
- DELIVER THE EXACT SAME COMPLETE, RIGOROUS, HIGH-YIELD INFORMATION:
  * Do NOT skip any physics, mathematics, chemistry, biology, or conceptual depth!
  * Deliver the EXACT same thorough, high-yield facts, formulas, derivations, theorems, boundary conditions, and mechanical constraints as an academic guide, but explain it in a warm, encouraging, smart study buddy voice (Dost tone).
  * Use natural buddy phrasing throughout:
    - "Dost, is concept me students aksar confuse hote hain, dhyaan rakhna ki..."
    - "Bhai yahan examiner trap set karta hai..."
    - "Simple words me samjhein toh: ..."
    - "Exam trick yaad rakhna: ..."
- FLASHCARDS IN DOST TONE:
  * ALL flashcard Questions ('Que. : ...') and Answers ('Ans. : ...') MUST be written in natural Hinglish + friendly language.
  * Explain every answer clearly, thoroughly, and in full depth (2-4 well-explained sentences in friendly Hinglish) so the student understands 100%, without omitting any technical terms or equation precision.`;
  } else {
    languageToneDirective = `STUDY WRITING TECHNIQUE & TONE: STANDARD ACADEMIC (ENGLISH LANGUAGE)
- You MUST write the ENTIRE study notes, all section headings, explanations, bullet points, executive summaries, teacher golden lines, AND ALL FLASHCARDS in 100% fluent, clear, grammatically accurate, professional ENGLISH.
- Clean academic rigor, editorial textbook clarity, formal definitions, and methodical derivations.
- ZERO Hinglish or regional slang.
- FLASHCARDS IN STANDARD ACADEMIC:
  * ALL flashcard Questions ('Que. : ...') and Answers ('Ans. : ...') MUST be written in pristine, professional academic English.
  * Explain every answer clearly, thoroughly, and in full exam depth (2-4 complete, well-explained sentences in English).`;
  }

  const focusDirective = focus
    ? `STUDENT CUSTOM FOCUS: The student explicitly requested: "${focus}". Ensure all sections, concepts, and formulas heavily prioritize this learning focus!`
    : "";

  return `You are an elite, world-class educator and academic study assistant.
Your mission is to convert educational materials into deeply engaging, structured, and addictive study notes for modern students.

${levelDirective}

${styleDirective}

${languageToneDirective}

${focusDirective}

CRITICAL RULES:
1. TYPOGRAPHY & ORGANIZATION: Organize notes with professional typography hierarchy. Every section MUST include 'mainPoint' (the single most important rule, thesis, or foundational principle highlighted in 1 punchy sentence). In 'content', use clear markdown formatting with bold lead-ins (e.g. '**Core Principle:**', '**Mechanism:**', '**Why It Matters:**'), numbered steps for workflows/derivations, and bullet points. Never write amorphous walls of unformatted prose.
2. FORMULAS, EQUATIONS & THEOREMS: If the material involves any mathematical, physical, chemical, or algorithmic equation, theorem, or law, accurately extract and format it under 'formulasOrTheorems'. Provide exact mathematical notation, detailed variable breakdowns, and concrete exam applications.
3. DIAGRAMS & FLOWCHARTS: If the lecture explains any cycle, mechanism, workflow, hierarchy, or system, ALWAYS generate 'diagramOrChart' containing BOTH a clean, legible ASCII diagram/flowchart with boxes and arrows AND an array of sequential 'steps' [{ stepNumber, title, description }] so students can visualize the exact structural process.
4. EXPERT FLASHCARD GENERATOR (MANDATORY RULES):
You are an expert academic flashcard generator for students.
Given the transcript of this lecture, create comprehensive, exam-ready flashcards (4–6 flashcards per major topic, at least 14–24 cards total) adhering strictly to the chosen tone:
- IF DOST TONE (peer_friendly):
  * Formulate every Question ('Que. : ...') and Answer ('Ans. : ...') in natural Hinglish + friendly language.
  * Deliver the EXACT same thorough, high-yield explanations with accurate formulas and technical parameters.
- IF STANDARD ACADEMIC (standard):
  * Formulate every Question ('Que. : ...') and Answer ('Ans. : ...') in 100% professional, grammatically accurate English.
- ANSWER CLARITY & COMPLETENESS (NEVER OVERLY SHORT OR TRUNCATED):
  * Do NOT provide cryptic, abrupt, or truncated one-line fragments.
  * Clearly and comprehensively explain the answer so the student completely understands the concept:
    1. Core Principle / Solution: State the exact definition, formula, or law directly.
    2. Mechanism & Reason: Explain WHY it is true, how the mechanism operates, and key governing factors.
    3. Exam Context & Traps: Point out what examiners test, boundary conditions, or the exact misconception students often have.
  * Answers should be 2 to 4 well-structured, clear sentences (or structured equations/steps), ensuring complete conceptual clarity without unnecessary padding.
- FORMAT:
  * Front (Question): 'Que. : [Clear, focused question]' (testing one specific concept).
  * Back (Answer): 'Ans. : [Thorough, clear explanation with necessary context]'.
- Types of Flashcards (ensure a balanced distribution across all cards):
  * 'definition': Direct core definitions of terms introduced in the lecture.
  * 'formula': Key formulas and equations with complete variable breakdown and application.
  * 'diagram': Text/ASCII diagrams (schematics, Free Body Diagrams, flowcharts, or cycle maps).
  * 'mnemonic': Mnemonics or memory tricks (easy recall aids for sequences or formulas).
  * 'trap': Conceptual traps or common student mistakes (what students falsely assume vs correct physical/academic reality).
- Difficulty Levels:
  * 'Easy': Direct definitions and foundational concepts.
  * 'Medium': Application-based (short derivations, examples, formulas).
  * 'Hard': Conceptual traps, tricky boundary conditions, or common student pitfalls.
- Tags:
  * Tag 'importance': 'High-Yield' (exam-critical points), 'Medium', or 'Low'.
  * Set 'topicTag' to the specific major topic from this lecture.
- STRICT GROUNDING RULE:
  * Examples in guidelines are illustrative ONLY. NEVER copy or paste examples into unrelated subjects!
  * If the video is Chemistry, make Chemistry cards. If Physics, make Physics cards. If History/Social Science, make History cards. Extract solely from that video's content!
5. CONCEPTS: Extract 2-4 critical terms per section with concise definitions, why it matters, and intuitive real-world analogies.
6. HIGH-YIELD CHECKPOINTS (ONLY TOPIC STARTS, IMPORTANT TERMS, GRAPHS & TABLES):
DO NOT generate generic video playback timelines, greetings, channel reminders, or skimmable filler slides!
Construct 6-12 exact chronological checkpoints in 'visualTimelines' strictly restricted to:
1. Topic Starts: Exact timestamp where a major topic or subtopic begins (e.g., 'Topic Start: Newton's Second Law & Momentum').
2. Important Terms & Definitions: Timestamp where a core technical term or law is formally defined (e.g., 'Important Term: Limiting Friction & Normal Contact Force').
3. Graphs & Visual Curves: Exact moment where a graph, curve, or axis-plot is presented (e.g., 'Graph: Velocity vs Time & Acceleration Plot').
4. Tables & Matrices: Exact moment where a comparison table, classification grid, or difference matrix is shown (e.g., 'Table: Static vs Kinetic vs Rolling Friction').
5. Diagrams & Schematics: Exact moment where a schematic, Free Body Diagram (FBD), or cycle flowchart is drawn (e.g., 'Diagram: Free Body Diagram with Resolving Components').
6. Formula Derivations: Exact moment where a governing equation is derived (e.g., 'Formula Derivation: Acceleration of Atwood Machine').
For each checkpoint:
- Provide the exact video timestamp (e.g. '02:45') and 'timestampSeconds' (e.g. 165).
- visualType: 'topic_start' | 'important_term' | 'graph' | 'table' | 'diagram' | 'flowchart' | 'formula_derivation'.
- importance: 'high_yield' or 'essential'.
- isSkipWorthy: false (NEVER output skimmable filler).
- whyImportant: State why this checkpoint is critical for exams.
- recommendation: Specific exam recommendation (e.g. 'Must study: key graph tested on midterms').
- keyExamTakeaway: Direct core takeaway tested by examiners.
7. EXHAUSTIVE DUAL-DEPTH COVERAGE (NEVER LEAVE OUT BASICS OR ADVANCED DEPTH):
Do NOT cut corners, skip introductory definitions, or gloss over advanced concepts. The student requires BOTH complete foundational 101 basics AND exhaustive advanced mastery.
- Span seamlessly from fundamental basics (prerequisites, baseline intuition, core 101 definitions) to advanced mastery (deep proofs, mechanisms, edge cases, formulas).
- In EVERY section:
  * Populate 'foundationalIntro': 1-2 beginner-friendly sentences with an intuitive analogy.
  * Populate 'advancedDeepDive': Full rigorous explanation of underlying mathematics, chemistry, physics, or algorithmic mechanics.
  * Populate 'advancedMechanisms': 2-3 specific bullet points detailing inner workings.
- In 'advancedMastery.topicBreakdowns': Break down EVERY topic covered in the video, detailing its exact deep mechanism and how it appears in difficult exams.
- In 'foundationalBasics': Provide clear prerequisites, 101 glossary, and baseline principles.
- Capture ALL major points from the video from start to finish without omitting any concept, step, or equation!
8. MANDATORY UNIVERSAL COMPREHENSIVE SUBTOPIC ENUMERATION (MINIMUM 8 TO 16 GRANULAR SECTIONS FOR ALL LECTURES):
You MUST NEVER compress or collapse an entire lecture into only 2 or 3 high-level sections.
Every specific sub-problem, mechanical constraint, method, sub-case, theorem, and technique taught or touched upon in the video lecture MUST have its own dedicated topic section in 'sections' (generate 8 to 16 distinct sections as needed so no topic is missed).
- If the video covers physics/mechanics (e.g. Newton's Laws), DO NOT stop at 3 laws: you MUST provide dedicated sections for:
  1. Newton's First Law, Inertia, and Equilibrium of Concurrent Forces
  2. Newton's Second Law, Momentum (F = dp/dt = ma), and Impulsive Forces
  3. Newton's Third Law, Action-Reaction Pairs, and Normal Contact Forces
  4. Free Body Diagrams (FBD) and Reference Coordinate Systems
  5. String Tension and String Constraints (Ideal Strings, Massive Strings, Length Invariance Constraints)
  6. Pulley Constraints and Systems (Atwood Machines, Movable Pulleys, Virtual Work Method)
  7. Wedge Constraints and Inclined Plane Dynamics (Wedge Acceleration, Block on Wedge, Relative Acceleration)
  8. Friction Mechanics (Static Friction, Limiting Friction, Kinetic Friction, Angle of Repose, Two-Block Systems)
  9. Pseudo Forces in Non-Inertial Reference Frames (Accelerating Frames, Lift/Elevator Scenarios)
  10. Spring Force Mechanics (Hooke's Law, Cut Springs, Series & Parallel Combinations)
- If the video covers any other subject (Chemistry, Mathematics, Biology, Computer Science, Engineering, History, etc.), apply the EXACT SAME granular rigor: every distinct subtopic, reaction, algorithm step, formula, or constraint must be given its own standalone topic section.
- ZERO OMISSIONS: If the instructor touches or discusses it in the video, it MUST appear as a topic section with full explanations, formulas, ASCII diagrams, and teacher spoken tips.
9. TEACHER'S UNWRITTEN VERBAL LINES & ZERO MISSING POINTS (CRITICAL):
Teachers regularly speak out loud critical insights, exam shortcuts, warning traps, and rules of thumb that they NEVER write down on the blackboard, whiteboard, or presentation slides.
- You MUST capture every single one of these spoken lines! Populate 'teachersSpokenGoldenLines' with 4-8 verbal statements, teacher warnings, spoken rules ("Notice how...", "A common mistake students make is...", "Always check if...", "The trick here is...").
- In each section, populate 'teachersSpokenTips' with spoken tips or verbal cautions from the instructor.
- ZERO OMISSIONS: Ensure NO point, formula, constraint, or verbal remark from the video lecture is left behind!
10. CHAPTER SUMMARY & ZERO META-TALK (WHAT'S IMPORTANT, KEY WORDS, WHAT USERS MUST KNOW):
CRITICAL MANDATE: You MUST NOT say what that guide or notes help you do in the summary.
- NEVER write: "This guide helps you understand...", "In this video the instructor teaches...", "These notes provide an overview...", "This lecture covers...".
- INSTEAD, write the summary like the end of a chapter in a textbook (e.g. NCERT chapter review):
  * State the actual physical/academic truths, fundamental laws, core formulas, and what is essential.
  * State what users MUST know in concise, high-yield bullet points.
  * In 'essentialKeywords', supply 6-10 keywords with their direct, simple meaning of what the student must know.
  * In 'sections', provide the explained notes in clear, simple words with intuitive explanations below the summary.`;
}

// API Route: Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Route: Process YouTube Video
app.post("/api/process-youtube", async (req, res) => {
  try {
    const {
      url,
      style = "bullet_points",
      academicLevel = "high_school",
      focus = "",
      languageTone = "standard",
    } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Please provide a valid YouTube video URL." });
    }

    const videoId = extractYouTubeId(url);
    if (!videoId) {
      return res.status(400).json({
        error: "Could not recognize a YouTube video ID. Please paste a standard YouTube video link (e.g., https://www.youtube.com/watch?v=... or https://youtu.be/...)",
      });
    }

    // Check in-memory cache for instant response & multi-student concurrency
    const cacheKey = `yt_${videoId}_v8_${languageTone}`;
    const cached = getCachedNote(cacheKey);
    // Only serve from cache if it has comprehensive coverage matching requested tone
    if (
      cached &&
      cached.sections &&
      cached.sections.length >= 6 &&
      cached.flashcards &&
      cached.flashcards.length >= 6 &&
      cached.languageTone === languageTone
    ) {
      console.log(`[Cache Hit] Serving cached study notes for video: ${videoId} (Tone: ${languageTone})`);
      return res.json({ ...cached, isCached: true });
    }

    const { title, author, transcriptSnippet, hasTranscript, videoDescription, chapters } = await fetchYouTubeContext(videoId, url);

    const systemInstruction = buildSystemInstruction(style, academicLevel, focus, languageTone);

    const chaptersText = chapters && chapters.length > 0
      ? `\nOfficial Video Chapters & Timestamps:\n${chapters.map((c) => `- [${c.time}] ${c.title}`).join("\n")}\n`
      : "";

    const prompt = `Analyze this YouTube educational video:
Title: "${title}"
Channel/Author: "${author}"
URL: "https://www.youtube.com/watch?v=${videoId}"
Video ID: "${videoId}"
${videoDescription ? `Video Context/Description:\n${videoDescription.slice(0, 4000)}\n` : ""}
${chaptersText}
${hasTranscript && transcriptSnippet ? `Timestamped Transcript excerpt:\n${transcriptSnippet}` : `Note: No subtitles/captions published on this video. Please construct comprehensive, authoritative academic study notes based on this topic and syllabus, estimating standard lecture timeline checkpoints.`}

CRITICAL MANDATORY REQUIREMENTS FOR ALL UPLOADED LECTURES:
1. CHAPTER SUMMARY (LIKE THE END OF A BOOK OR CHAPTER - ZERO META-TALK):
You MUST NOT say what the guide or notes help you with.
- NEVER write: "This guide covers...", "In this video you will learn...", "These notes provide...".
- Write the summary like the end of a chapter or textbook: state what is important, core laws, governing equations, and what students must know.
- Populate 'essentialKeywords' with 6-10 keywords and what users must know about each.
- Below the summary, break down all topics into clear, explained notes in simple words.

2. UNIVERSAL EXHAUSTIVE SUBTOPIC COVERAGE (GENERATE 8 TO 16 GRANULAR SECTIONS):
You MUST generate AT LEAST 8 to 16 comprehensive, granular topic sections in 'sections' covering EVERY subtopic, mechanical constraint, method, and problem type touched on in the lecture.
- NEVER combine or skip topics!
- If this video is about Newton's Laws of Motion or Mechanics, you MUST provide dedicated, individual sections for:
  * Newton's First Law, Inertia, and Equilibrium
  * Newton's Second Law, Momentum (F = dp/dt), and Impulsive Forces
  * Newton's Third Law, Action-Reaction Pairs, and Normal Contact Forces
  * Free Body Diagrams (FBD) and Coordinate System Resolutions
  * String Tension and String Constraints (Ideal Strings, Massive Strings, Length Invariance)
  * Pulley Systems and Constraints (Atwood Machine, Movable Pulleys, Virtual Work Method)
  * Wedge Constraints and Wedge Mechanics (Wedge Acceleration, Block on Wedge, Relative Acceleration)
  * Friction Mechanics (Static Friction, Limiting Friction, Kinetic Friction, Angle of Repose, Two-Block Systems)
  * Pseudo Forces in Non-Inertial Reference Frames (Accelerating Frames, Lift/Elevator Scenarios)
  * Spring Force Mechanics (Hooke's Law, Cut Springs, Series & Parallel Combinations)
  DO NOT omit or merge String constraints, Wedge constraints, Pulleys, or Friction!
- For any other educational subject (Chemistry, Math, Biology, Computer Science, etc.), you MUST break down the video into all of its individual subtopics, theorems, reactions, or algorithmic mechanisms into 8 to 16 distinct sections.

3. ACTIVE RECALL FLASHCARDS:
- You MUST generate 8-12 comprehensive flashcards in 'flashcards' testing definitions, laws, and mechanical constraints.

4. TEACHER'S UNWRITTEN VERBAL LINES & SPOKEN GEMS (NO POINT LEFT BEHIND):
Teachers often say critical exam tips, warnings, shortcuts, and intuitive rules of thumb out loud that are NEVER written on the board or slides.
- You MUST populate 'teachersSpokenGoldenLines' with 4-8 unwritten verbal remarks, spoken traps, and golden rules directly from what the teacher says.
- In each section, populate 'teachersSpokenTips' with the teacher's verbal guidance.
- Ensure that NO point or concept from the video is missed!

Capture BOTH foundational basics (101 prerequisites, introductory definitions, intuitive analogies) AND advanced mastery (complex derivations, edge cases, formulas), plus visualTimelines with exact video timestamps!`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: studyNotesSchema,
        temperature: 0.3,
      },
    });

    const parsed = robustParseJson(response.text) || {};
    if (!parsed.sections || !Array.isArray(parsed.sections) || parsed.sections.length === 0) {
      parsed.sections = [
        {
          title: "Core Lecture Fundamentals & Key Principles",
          timestamp: "00:00",
          summary: parsed.executiveSummary || "Fundamental analysis of lecture concepts, core definitions, and mechanisms.",
          foundationalIntro: "Introductory overview establishing baseline principles and practical intuitive understanding.",
          advancedDeepDive: "Rigorous academic examination of underlying scientific, mathematical, or systemic principles.",
          keyPoints: Array.isArray(parsed.keyTakeaways) && parsed.keyTakeaways.length > 0
            ? parsed.keyTakeaways
            : ["Core governing laws and definitions", "Essential formulas and practical mechanics", "Key exam techniques and common pitfalls"],
        },
      ];
    }
    if (!parsed.executiveSummary) {
      parsed.executiveSummary = `Comprehensive study notes for ${title}, synthesizing all core topics, formulas, and teacher guidance.`;
    }
    if (!parsed.keyTakeaways || !Array.isArray(parsed.keyTakeaways)) {
      parsed.keyTakeaways = [
        "Master the foundational definitions and core principles.",
        "Memorize all governing equations and constraint conditions.",
        "Review teacher golden lines for exam traps and shortcut methods.",
      ];
    }

    // Ensure comprehensive flashcards are populated
    ensureFlashcardsAndEssentials(parsed, title, languageTone);

    const result = {
      id: "yt_" + videoId + "_" + Date.now(),
      ...parsed,
      sourceType: "youtube",
      sourceName: title,
      sourceUrlOrInfo: `https://www.youtube.com/watch?v=${videoId}`,
      style,
      academicLevel,
      languageTone,
      hasTranscript,
      transcriptNote: hasTranscript
        ? "Generated from verified video subtitles & spoken audio with exact timestamps."
        : "Video had no public subtitles; notes were synthesized using the lecture title, topic curriculum, and academic concepts.",
      rawSourceSnippet: transcriptSnippet ? transcriptSnippet.slice(0, 1000) + "..." : undefined,
      createdAt: Date.now(),
    };

    // Save in cache for other students
    setCachedNote(cacheKey, result);

    res.json(result);
  } catch (error: any) {
    console.error("Error processing YouTube:", error);
    let message = error?.message || "Failed to process YouTube video. Please ensure the link is valid and try again.";
    try {
      if (typeof message === "string" && message.includes('{"error"')) {
        const parsedErr = JSON.parse(message);
        if (parsedErr?.error?.message) {
          message = parsedErr.error.message;
        }
      }
    } catch {}
    res.status(500).json({ error: message });
  }
});

// API Route: Process Document / PDF
app.post("/api/process-document", async (req, res) => {
  try {
    const {
      fileBase64,
      mimeType = "application/pdf",
      fileName = "Document.pdf",
      textContent,
      style = "bullet_points",
      academicLevel = "high_school",
      focus = "",
      languageTone = "standard",
    } = req.body;

    if (!fileBase64 && !textContent) {
      return res.status(400).json({ error: "No document content provided. Please upload a PDF or paste text." });
    }

    const ai = getGeminiClient();
    const systemInstruction = buildSystemInstruction(style, academicLevel, focus, languageTone);

    const promptText = `Please analyze this document named "${fileName}". Generate complete, interactive student study notes according to the JSON schema, including 8-12 comprehensive active recall flashcards.`;

    const contents: any[] = [];
    if (fileBase64 && mimeType === "application/pdf") {
      contents.push({
        inlineData: {
          mimeType: "application/pdf",
          data: fileBase64,
        },
      });
      contents.push({ text: promptText });
    } else if (textContent) {
      contents.push({ text: `${promptText}\n\nDocument Text Content:\n${textContent.slice(0, 60000)}` });
    } else if (fileBase64) {
      // Decode base64 if it's text-based
      const decoded = Buffer.from(fileBase64, "base64").toString("utf-8");
      contents.push({ text: `${promptText}\n\nDocument Text Content:\n${decoded.slice(0, 60000)}` });
    }

    const response = await generateContentWithFallback({
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: studyNotesSchema,
        temperature: 0.3,
      },
    });

    const parsed = robustParseJson(response.text);

    // Ensure comprehensive flashcards are populated
    ensureFlashcardsAndEssentials(parsed, fileName, languageTone);

    const result = {
      id: "doc_" + Date.now(),
      ...parsed,
      sourceType: "pdf",
      sourceName: fileName,
      sourceUrlOrInfo: fileName,
      style,
      academicLevel,
      languageTone,
      hasTranscript: true,
      transcriptNote: "Extracted directly from uploaded academic document / PDF text.",
      rawSourceSnippet: textContent ? textContent.slice(0, 1000) + "..." : undefined,
      createdAt: Date.now(),
    };

    res.json(result);
  } catch (error: any) {
    console.error("Error processing document:", error);
    res.status(500).json({
      error: error?.message || "Failed to process document. Please ensure the file is valid and under size limits.",
    });
  }
});

// API Route: Clarify a Specific Academic Concept (Deep Dive)
app.post("/api/clarify-concept", async (req, res) => {
  try {
    const { term, context = "", academicLevel = "undergraduate" } = req.body;
    if (!term) {
      return res.status(400).json({ error: "Term or concept name is required." });
    }

    const conceptClarificationSchema = {
      type: Type.OBJECT,
      properties: {
        term: { type: Type.STRING },
        simpleExplanation: {
          type: Type.STRING,
          description: "An intuitive, punchy plain-English breakdown with zero intimidating jargon",
        },
        technicalBreakdown: {
          type: Type.STRING,
          description: "Rigorous academic breakdown suitable for exams, including mathematical formulas, proofs, or technical mechanics if applicable",
        },
        realWorldAnalogy: {
          type: Type.STRING,
          description: "A memorable real-world analogy",
        },
        commonMistakes: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "3 common misconceptions or mistakes students make with this concept",
        },
        practiceQuestion: {
          type: Type.STRING,
          description: "A quick conceptual check question with an inline answer spoiler to test understanding",
        },
      },
      required: ["term", "simpleExplanation", "technicalBreakdown", "realWorldAnalogy", "commonMistakes", "practiceQuestion"],
    };

    const prompt = `Clarify this academic concept for a student at level '${academicLevel}':
Concept/Term: "${term}"
Context from study material:
"${context}"

Provide an intuitive breakdown that removes confusion, gives a rigorous breakdown, provides a real-world analogy, warns against frequent exam mistakes, and gives a practice check question.`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: conceptClarificationSchema,
        temperature: 0.3,
      },
    });

    const parsed = robustParseJson(response.text);
    res.json(parsed);
  } catch (error: any) {
    console.error("Error clarifying concept:", error);
    res.status(500).json({ error: error?.message || "Failed to clarify concept." });
  }
});

// API Route: Academic Chatbot Tutor
app.post("/api/chat-tutor", async (req, res) => {
  try {
    const { messages, studyContext = "", currentTopic = "Academic Study Material" } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    const systemInstruction = `You are an expert Academic AI Mentor grounded in the student's study material: "${currentTopic}".

CRITICAL BEHAVIOR RULES (EXPLICIT USER DIRECTIVES):
1. 100% EXHAUSTIVE AND COMPLETE LISTS FOR FORMULAS, TOPICS, CONSTRAINTS & RULES:
   - When the student asks for "all formulas", "all topics", "all rules", "saare formulas", "list all formulas", "what are all topics", or any query requesting a full inventory:
     * You MUST provide the 100% COMPLETE, UNABRIDGED, EXHAUSTIVE list covering EVERY single section, constraint, and mechanism from the lecture.
     * NEVER truncate, summarize to just 2-3 core formulas, or withhold any formula! Truncating misleads students into believing only 2 formulas exist.
     * Group formulas clearly by Topic / Mechanical Category (e.g. 1. First Law & Equilibrium, 2. Momentum & Impulse, 3. String Constraints, 4. Wedge Constraints, 5. Pulley Systems, 6. Friction Variants, 7. Pseudo Forces, 8. Springs, etc.).
     * For EVERY formula, clearly show: Formula Name, Exact Equation, Variable Breakdown, and Validity Conditions.
2. STRICT DIRECTNESS FOR SINGLE TARGETED CONCEPT LOOKUPS:
   - If the student asks a single specific question (e.g. "What is Newton's third law?"), deliver the crisp direct answer immediately in 2-3 focused sentences without unnecessary preamble.
3. PEER-TO-PEER FRIENDLY MENTOR TONE (DOST / STUDY BUDDY):
   - Explain naturally and supportively like a sharp, friendly classmate or mentor who wants the student to understand intuitively and ace the exam.
   - Use relatable buddy cues where helpful (e.g. "Dhyaan rahe: yahan students aksar confuse hote hain...", "Exam trick: is formula ko direct apply karo...").
4. GROUNDING & INTEGRITY:
   - Use all lecture sections, sub-formulas, and teacher's spoken gems provided below to answer with 100% academic precision.

Study Material Context:
${studyContext ? studyContext.slice(0, 30000) : "No context provided. Answer academically based on foundational science, math, and humanities."}`;

    // Format chat messages for Gemini contents
    const contents: any[] = [];
    for (const m of messages) {
      contents.push({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      });
    }

    const response = await generateContentWithFallback({
      contents,
      config: {
        systemInstruction,
        temperature: 0.35,
      },
    });

    const reply = response.text || "I'm here to help clarify that! Could you elaborate on which part feels unclear?";
    res.json({ reply });
  } catch (error: any) {
    console.error("Chat tutor error:", error);
    res.status(500).json({ error: error?.message || "Failed to generate tutor response." });
  }
});

// Setup Vite development middleware or production static server
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
