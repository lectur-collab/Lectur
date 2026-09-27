import React, { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import {
  Send,
  Sparkles,
  Bot,
  User,
  RotateCw,
  Trash2,
  Volume2,
  VolumeX,
  Lightbulb,
  BookOpen,
  HelpCircle,
  Binary,
} from "lucide-react";
import { ChatMessage, StudyNoteData } from "../types";

interface AcademicChatbotProps {
  note: StudyNoteData | null;
  externalPrompt?: string | null;
  onClearExternalPrompt?: () => void;
}

export const AcademicChatbot: React.FC<AcademicChatbotProps> = ({
  note,
  externalPrompt,
  onClearExternalPrompt,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: "msg-init",
        role: "assistant",
        content: note
          ? `Hello! I am your Socratic AI Academic Tutor for **${note.title}**.\n\nI can break down complex equations, unpack theoretical proofs, provide memorable analogies, or quiz your comprehension. What concept would you like to clarify?`
          : "Hello! I am your Socratic AI Tutor. Please upload a YouTube video or academic PDF so I can ground our discussion in your study material.",
        timestamp: Date.now(),
      },
    ];
  });

  const [inputVal, setInputVal] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle incoming external prompt from click-to-clarify
  useEffect(() => {
    if (externalPrompt && externalPrompt.trim()) {
      handleSendMessage(externalPrompt);
      if (onClearExternalPrompt) {
        onClearExternalPrompt();
      }
    }
  }, [externalPrompt]);

  // Read message aloud
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
      // Build context string from the current study note
      let studyContext = "";
      if (note) {
        studyContext = `Topic: ${note.title}\nExecutive Summary: ${note.executiveSummary}\nKey Takeaways: ${note.keyTakeaways.join("; ")}\n\n`;

        // Collect all formulas
        const allFormulas: string[] = [];
        if (note.formulasOrTheorems) {
          note.formulasOrTheorems.forEach((f) => {
            allFormulas.push(`[Core] ${f.name}: ${f.formula || f.equation} (${f.variables || ""})`);
          });
        }
        note.sections.forEach((s) => {
          if (s.formulasOrTheorems) {
            s.formulasOrTheorems.forEach((f) => {
              allFormulas.push(`[${s.heading}] ${f.name}: ${f.formula || f.equation} (${f.variables || ""})`);
            });
          }
        });

        if (allFormulas.length > 0) {
          studyContext += `COMPLETE INVENTORY OF ALL FORMULAS (${allFormulas.length} formulas):\n${allFormulas.join("\n")}\n\n`;
        }

        studyContext += `Sections:\n`;
        note.sections.forEach((s) => {
          studyContext += `### [${s.heading}]\n${s.content.slice(0, 800)}\nKey Concepts: ${s.concepts.map((c) => c.term).join(", ")}\n`;
        });
      }

      const response = await fetch("/api/chat-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          studyContext,
          currentTopic: note ? note.title : "Academic Concepts",
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
        content: `Chat history reset. How can I help you master **${note ? note.title : "your study material"}** today?`,
        timestamp: Date.now(),
      },
    ]);
  };

  // Quick prompt recommendations
  const quickPrompts = [
    { label: "Hardest Concept", text: "What is the most difficult concept in this material, and how can I understand it intuitively?" },
    { label: "Step-by-Step Formula", text: "Break down the core mathematical formula or theorem in this lecture step-by-step." },
    { label: "Real-World Analogy", text: "Give me an unforgettable real-world analogy to remember the central principle here." },
    { label: "Test Me (Socratic)", text: "Ask me a challenging conceptual question to test if I really understand this topic." },
    { label: "⚡ Snackable TL;DR", text: "Explain the core mental model and big picture of this topic in crisp, punchy bullet points with zero filler." },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 h-[calc(100vh-8rem)] flex flex-col">
      {/* Header Bar */}
      <div className="bg-white rounded-t-2xl border border-slate-200 border-b-0 p-4 sm:p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-xs">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Academic AI Tutor & Concept Clarifier
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Grounded
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate max-w-sm sm:max-w-md">
              {note ? `Current source: ${note.title}` : "General academic tutor mode"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClearChat}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="Reset conversation"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 bg-slate-50 border-x border-slate-200 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? "bg-amber-400 text-slate-950"
                    : "bg-slate-900 text-white"
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-xs ${
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

                {/* Speech read aloud button for assistant responses */}
                {!isUser && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-end">
                    <button
                      onClick={() => toggleSpeak(m.id, m.content)}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
                      title={speakingMsgId === m.id ? "Mute audio" : "Read response aloud"}
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
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 text-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-4 shadow-xs flex items-center gap-2 text-xs text-slate-500">
              <RotateCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
              <span>Synthesizing pedagogical explanation...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="bg-white border-x border-slate-200 px-4 py-2 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
        <span className="text-[11px] font-bold text-slate-400 shrink-0 uppercase tracking-wider">
          Suggested:
        </span>
        {quickPrompts.map((qp, i) => (
          <button
            key={i}
            type="button"
            disabled={isGenerating}
            onClick={() => handleSendMessage(qp.text)}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-900 border border-slate-200 text-xs text-slate-700 whitespace-nowrap transition-colors shrink-0"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Input Box Footer */}
      <div className="bg-white rounded-b-2xl border border-slate-200 border-t-0 p-3 sm:p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={isGenerating}
            placeholder={
              note
                ? `Ask about '${note.title.slice(0, 35)}...' or any difficult concept`
                : "Ask any academic question..."
            }
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
          />
          <button
            type="submit"
            disabled={!inputVal.trim() || isGenerating}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5 text-amber-400" />
          </button>
        </form>
      </div>
    </div>
  );
};
