import React, { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import {
  Send,
  Sparkles,
  Bot,
  User,
  X,
  Minimize2,
  Maximize2,
  Trash2,
  Volume2,
  VolumeX,
  HelpCircle,
  Network,
  Sigma,
  Zap,
  MessageSquare,
  ArrowUpRight,
  ChevronDown,
} from "lucide-react";
import { ChatMessage, StudyNoteData } from "../types";
import mentorAvatarImg from "../assets/images/mentor_avatar_1790084207727.jpg";

interface FloatingAITutorProps {
  note: StudyNoteData | null;
  isOpen: boolean;
  onToggle: () => void;
  externalPrompt?: string | null;
  onClearExternalPrompt?: () => void;
}

export const FloatingAITutor: React.FC<FloatingAITutorProps> = ({
  note,
  isOpen,
  onToggle,
  externalPrompt,
  onClearExternalPrompt,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: "msg-init",
        role: "assistant",
        content: note
          ? `👋 Hi! I am your **AI Mentor**, grounded in **"${note.title}"**.\n\nAsk me any question and I will give you a **short, direct answer** without long walls of text. If you'd like a deeper explanation or derivation, just ask!`
          : "👋 Hi! I am your **AI Mentor**. Load a YouTube lecture, and ask me direct questions!",
        timestamp: Date.now(),
      },
    ];
  });

  const [inputVal, setInputVal] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, messages]);

  // When note changes, refresh initial message
  useEffect(() => {
    if (note) {
      setMessages([
        {
          id: "msg-welcome-" + note.id,
          role: "assistant",
          content: `👋 Connected to **"${note.title}"**!\n\nAsk me anything! I will keep answers **crisp and straight to the point** without unsolicited long essays.`,
          timestamp: Date.now(),
        },
      ]);
    }
  }, [note?.id]);

  // Handle external prompt injection (e.g. from clicking "Ask AI Tutor about this diagram/formula")
  useEffect(() => {
    if (externalPrompt && externalPrompt.trim()) {
      if (!isOpen) {
        onToggle();
      }
      handleSendMessage(externalPrompt);
      if (onClearExternalPrompt) {
        onClearExternalPrompt();
      }
    }
  }, [externalPrompt]);

  // Speech synthesis toggle
  const toggleSpeak = (id: string, text: string) => {
    if (!window.speechSynthesis) return;

    if (speakingMsgId === id) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
    } else {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[#*`_\[\]()]/g, "");
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 0.95;
      utterance.onend = () => setSpeakingMsgId(null);
      utterance.onerror = () => setSpeakingMsgId(null);
      window.speechSynthesis.speak(utterance);
      setSpeakingMsgId(id);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || inputVal).trim();
    if (!content || isGenerating) return;

    const userMsg: ChatMessage = {
      id: "msg_" + Date.now(),
      role: "user",
      content,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputVal("");
    setIsGenerating(true);

    try {
      // Build comprehensive study context with diagrams, formulas, and main points
      let studyContext = "";
      if (note) {
        studyContext += `TOPIC TITLE: ${note.title}\n`;
        studyContext += `EXECUTIVE SUMMARY: ${note.executiveSummary}\n`;
        studyContext += `KEY TAKEAWAYS:\n${note.keyTakeaways.map((k, i) => `${i + 1}. ${k}`).join("\n")}\n\n`;

        if (note.diagramOrChart) {
          studyContext += `DIAGRAM / FLOWCHART INFORMATION:\nTitle: ${note.diagramOrChart.title}\nExplanation: ${note.diagramOrChart.explanation || ""}\n`;
          if (note.diagramOrChart.steps && note.diagramOrChart.steps.length > 0) {
            studyContext += `Sequential Stages / Steps:\n${note.diagramOrChart.steps
              .map((s) => `[Step ${s.stepNumber}] ${s.title}: ${s.description}`)
              .join("\n")}\n`;
          }
          if (note.diagramOrChart.asciiArt) {
            studyContext += `ASCII Flowchart / Diagram:\n${note.diagramOrChart.asciiArt}\n`;
          }
          studyContext += "\n";
        }

        // Collect complete master inventory of all formulas across all sections
        const allLectureFormulas: { name: string; equation: string; topic: string; variables?: string; application?: string }[] = [];
        if (note.formulasOrTheorems && note.formulasOrTheorems.length > 0) {
          note.formulasOrTheorems.forEach((f) => {
            allLectureFormulas.push({
              name: f.name,
              equation: f.formula || f.equation || "",
              topic: "Core Principles",
              variables: f.variables,
              application: f.application || f.explanation,
            });
          });
        }
        note.sections.forEach((sec) => {
          if (sec.formulasOrTheorems && sec.formulasOrTheorems.length > 0) {
            sec.formulasOrTheorems.forEach((f) => {
              allLectureFormulas.push({
                name: f.name,
                equation: f.formula || f.equation || "",
                topic: sec.heading,
                variables: f.variables,
                application: f.application || f.explanation,
              });
            });
          }
        });

        if (allLectureFormulas.length > 0) {
          studyContext += `COMPLETE MASTER INVENTORY OF ALL FORMULAS ACROSS THE ENTIRE LECTURE (${allLectureFormulas.length} formulas):\n`;
          allLectureFormulas.forEach((f, fIdx) => {
            studyContext += `${fIdx + 1}. [${f.topic}] ${f.name}: ${f.equation} (Variables: ${f.variables || "N/A"}; Conditions: ${f.application || "N/A"})\n`;
          });
          studyContext += "\n";
        }

        if (note.examTips && note.examTips.length > 0) {
          studyContext += `IMPORTANT EXAM PITFALLS & TIPS:\n${note.examTips.map((t) => `- ${t}`).join("\n")}\n\n`;
        }

        if (note.teachersSpokenGoldenLines && note.teachersSpokenGoldenLines.length > 0) {
          studyContext += `TEACHER'S UNWRITTEN VERBAL LINES & SPOKEN GEMS:\n${note.teachersSpokenGoldenLines
            .map((g) => `- "${g.spokenLine}" [Context: ${g.context}] (Exam note: ${g.examSignificance})`)
            .join("\n")}\n\n`;
        }

        studyContext += `DETAILED SECTIONS & TOPIC BREAKDOWNS:\n`;
        note.sections.forEach((sec, idx) => {
          studyContext += `### Section ${idx + 1}: ${sec.heading}\n`;
          if (sec.mainPoint) {
            studyContext += `Main Point / Core Thesis: ${sec.mainPoint}\n`;
          }
          if (sec.teachersSpokenTips && sec.teachersSpokenTips.length > 0) {
            studyContext += `Teacher's Spoken Tips: ${sec.teachersSpokenTips.join("; ")}\n`;
          }
          if (sec.formulasOrTheorems && sec.formulasOrTheorems.length > 0) {
            studyContext += `Formulas in this topic:\n${sec.formulasOrTheorems
              .map((f) => `  * ${f.name}: ${f.formula || f.equation} (${f.variables || ""})`)
              .join("\n")}\n`;
          }
          studyContext += `Key Points:\n${sec.keyPoints.map((kp) => `- ${kp}`).join("\n")}\n`;
          studyContext += `Core Concepts:\n${sec.concepts
            .map((c) => `- ${c.term}: ${c.definition} (Analogy: ${c.analogy})`)
            .join("\n")}\n`;
          studyContext += `Notes Content:\n${sec.content.slice(0, 1000)}\n\n`;
        });
      }

      const response = await fetch("/api/chat-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          studyContext,
          currentTopic: note ? note.title : "Academic Study Material",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get answer from tutor.");
      }

      const data = await response.json();
      const assistantMsg: ChatMessage = {
        id: "msg_" + Date.now(),
        role: "assistant",
        content: data.reply || "I apologize, could you clarify your question?",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error("Chat error:", err);
      const errorMsg: ChatMessage = {
        id: "msg_err_" + Date.now(),
        role: "assistant",
        content: "Sorry, I had trouble reaching the study model. Please try asking again in a moment.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearChat = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeakingMsgId(null);
    setMessages([
      {
        id: "msg_reset_" + Date.now(),
        role: "assistant",
        content: `Chat history cleared. What would you like to explore regarding **${
          note ? note.title : "this topic"
        }**?`,
        timestamp: Date.now(),
      },
    ]);
  };

  // High-yield quick prompts tailored to current note
  const quickChips = [
    {
      id: "diagram",
      icon: Network,
      label: "Explain Diagram",
      prompt: "Can you explain the main diagram or flowchart of this lecture step-by-step? What is the core mechanism it depicts?",
    },
    {
      id: "important",
      icon: Zap,
      label: "Most Important Points",
      prompt: "What are the single most important exam concepts and highest-yield points in this video that examiners love to test?",
    },
    {
      id: "formula",
      icon: Sigma,
      label: "Formulas & Equations",
      prompt: "Break down the core formulas or equations from this lecture. Explain what each variable represents and how to apply them.",
    },
    {
      id: "quiz",
      icon: HelpCircle,
      label: "Quiz Me",
      prompt: "Ask me a challenging conceptual test question on this lecture and wait for my answer to evaluate my comprehension.",
    },
    {
      id: "analogy",
      icon: Sparkles,
      label: "Mental Model Analogy",
      prompt: "Give me an intuitive, real-world analogy to remember the central principle of this lesson permanently.",
    },
  ];

  return (
    <>
      {/* FLOATING COLLAPSED TRIGGER BUBBLE (COMPACT BUBBLE WITHOUT TEXT) */}
      {!isOpen && (
        <aside
          aria-label="AI Mentor"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 group cursor-pointer"
        >
          <button
            type="button"
            onClick={onToggle}
            className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-xl hover:shadow-2xl border-2 border-amber-400/80 hover:border-amber-300 transition-all transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-amber-400/30 cursor-pointer"
            title="Ask AI Mentor"
            aria-label="Open AI Mentor"
          >
            <img
              src={mentorAvatarImg}
              alt="AI Mentor Avatar"
              referrerPolicy="no-referrer"
              className="w-full h-full rounded-full object-cover p-0.5"
            />
            {/* Online Green Indicator Dot */}
            <span className="absolute top-0 right-0 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-500 rounded-full border-2 border-slate-950 animate-pulse shadow-xs" />
          </button>
        </aside>
      )}

      {/* FLOATING EXPANDED AI TUTOR WINDOW */}
      {isOpen && (
        <aside
          aria-label="AI Tutor Active Session"
          className={`fixed z-50 transition-all duration-200 flex flex-col bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden ${
            isExpanded
              ? "bottom-2 right-2 left-2 sm:left-auto sm:bottom-6 sm:right-6 sm:w-[600px] h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)] max-h-[850px]"
              : "bottom-2 right-2 left-2 sm:left-auto sm:bottom-6 sm:right-6 sm:w-[440px] h-[calc(100vh-1.5rem)] sm:h-[580px] max-h-[640px]"
          }`}
        >
          {/* Header */}
          <div className="bg-slate-900 text-white px-4 py-3 sm:py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <img
                  src={mentorAvatarImg}
                  alt="AI Socratic Tutor - Mentor"
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-xl object-cover border border-amber-400/50 shadow-xs"
                />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    AI Socratic Tutor - Mentor
                  </h3>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/60">
                    Grounded
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-[240px]">
                  {note ? note.title : "Ready for study material"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                onClick={handleClearChat}
                className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Clear chat history"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors hidden sm:block"
                title={isExpanded ? "Collapse to standard size" : "Expand size"}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={onToggle}
                className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Minimize AI Tutor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompt Recommendation Chips */}
          <div className="bg-slate-100/90 border-b border-slate-200 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {quickChips.map((chip) => {
              const Icon = chip.icon;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => handleSendMessage(chip.prompt)}
                  disabled={isGenerating}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-50 hover:border-amber-300 border border-slate-200 text-slate-700 hover:text-amber-900 text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all shadow-2xs shrink-0 disabled:opacity-50"
                >
                  <Icon className="w-3.5 h-3.5 text-amber-600" />
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>

          {/* Messages Area */}
          <div className="flex-1 bg-slate-50/60 overflow-y-auto p-4 space-y-3.5 text-xs sm:text-sm">
            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold overflow-hidden ${
                      isUser ? "bg-amber-400 text-slate-950" : "bg-slate-900 border border-slate-700"
                    }`}
                  >
                    {isUser ? (
                      <User className="w-3.5 h-3.5" />
                    ) : (
                      <img
                        src={mentorAvatarImg}
                        alt="Mentor"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed shadow-2xs ${
                      isUser
                        ? "bg-slate-900 text-white rounded-tr-xs"
                        : "bg-white text-slate-800 border border-slate-200 rounded-tl-xs"
                    }`}
                  >
                    {!isUser ? (
                      <div className="space-y-2 prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed">
                        <Markdown>{m.content}</Markdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}

                    {!isUser && (
                      <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="text-[10px]">AI Socratic Tutor - Mentor</span>
                        <button
                          type="button"
                          onClick={() => toggleSpeak(m.id, m.content)}
                          className="hover:text-slate-600 p-0.5 rounded transition-colors"
                          title={speakingMsgId === m.id ? "Mute" : "Read aloud"}
                        >
                          {speakingMsgId === m.id ? (
                            <VolumeX className="w-3.5 h-3.5 text-amber-600" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isGenerating && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                  <img
                    src={mentorAvatarImg}
                    alt="Mentor"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-3 shadow-2xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce [animation-delay:0.4s]" />
                  <span className="text-xs text-slate-600 font-medium ml-1">
                    Mentor is analyzing video knowledge...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-200 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Ask about diagram, formula, or key concept..."
                disabled={isGenerating}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              />
              <button
                type="submit"
                disabled={!inputVal.trim() || isGenerating}
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white disabled:text-slate-400 transition-colors shadow-xs"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </aside>
      )}
    </>
  );
};
