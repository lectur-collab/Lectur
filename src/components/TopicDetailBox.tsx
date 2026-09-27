import React, { useState } from "react";
import Markdown from "react-markdown";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Bot,
  Copy,
  Check,
  CheckCircle2,
  Circle,
  Sigma,
  Network,
  Compass,
  GraduationCap,
  HelpCircle,
  Send,
  BookOpen,
  AlertTriangle,
} from "lucide-react";
import { StudySection, ConceptItem } from "../types";

interface TopicDetailBoxProps {
  section: StudySection;
  sectionIndex: number;
  totalSections: number;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  isMastered: boolean;
  onToggleMastered: () => void;
  onConceptClick: (concept: ConceptItem, contextText: string) => void;
  onAskTutor?: (prompt: string) => void;
}

export const TopicDetailBox: React.FC<TopicDetailBoxProps> = ({
  section,
  sectionIndex,
  totalSections,
  onClose,
  onNext,
  onPrev,
  isMastered,
  onToggleMastered,
  onConceptClick,
  onAskTutor,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"all" | "basics" | "notes" | "advanced">("all");
  const [customQuestion, setCustomQuestion] = useState("");

  const handleCopySection = () => {
    const text = `### ${section.heading} ${section.timestamp ? `(${section.timestamp})` : ""}\n\n${section.content}\n\nMain Point: ${section.mainPoint || section.simplifiedContent}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendCustomQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim() || !onAskTutor) return;
    onAskTutor(`Regarding "${section.heading}" (${section.timestamp || `Part ${sectionIndex + 1}`}): ${customQuestion}`);
    setCustomQuestion("");
  };

  const quickPrompts = [
    `Explain "${section.heading}" in simple everyday words with an easy analogy.`,
    `Explain the deep mechanisms, math, and inner workings of "${section.heading}" step-by-step.`,
    `Give me 2 tricky exam-style questions to test my understanding of "${section.heading}".`,
  ];

  return (
    <div className="bg-white rounded-2xl border-2 border-indigo-200/90 shadow-lg overflow-hidden animate-in fade-in duration-200">
      {/* Top Sticky Header */}
      <div className="bg-slate-900 text-white p-3.5 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Topics</span>
          </button>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Topic {sectionIndex + 1} of {totalSections}
          </span>
        </div>

        {/* Mastered & Navigation */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleMastered}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isMastered
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            }`}
          >
            {isMastered ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>Understood ✓</span>
              </>
            ) : (
              <>
                <Circle className="w-4 h-4 text-slate-400" />
                <span>Mark Got It</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopySection}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Copy this section notes"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
            <button
              type="button"
              disabled={!onPrev}
              onClick={onPrev}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Previous Topic"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={!onNext}
              onClick={onNext}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Next Topic"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Topic Title Bar */}
      <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-900 text-xs font-bold font-mono">
            Topic {String(sectionIndex + 1).padStart(2, "0")}
          </span>
          {section.timestamp && (
            <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 text-xs font-mono font-medium">
              ⏱️ {section.timestamp}
            </span>
          )}
          {section.difficulty === "foundational_basic" || sectionIndex === 0 ? (
            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-sky-100 text-sky-900 border border-sky-200">
              🌱 101 Basics
            </span>
          ) : section.difficulty === "advanced_mastery" || (section.formulasOrTheorems && section.formulasOrTheorems.length > 0) ? (
            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">
              ⚡ Advanced Mastery
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-900 border border-emerald-200">
              📘 Core Concept
            </span>
          )}
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-editorial leading-snug">
          {section.heading}
        </h2>

        {/* Highlighted Main Point / Thesis */}
        <div className="mt-3.5 p-3.5 sm:p-4 rounded-xl bg-amber-500/10 border-l-4 border-amber-500 border-y border-r border-amber-200/60 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-950">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
            <span>Core Takeaway & Main Thesis</span>
          </div>
          <p className="text-xs sm:text-sm font-bold text-slate-950 leading-relaxed">
            {section.mainPoint || section.simplifiedContent || section.keyPoints?.[0]}
          </p>
        </div>

        {/* View Focus Filters Inside Box */}
        <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-slate-200/70">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
            Focus:
          </span>
          <button
            type="button"
            onClick={() => setActiveSubTab("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === "all" ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-200"
            }`}
          >
            Full In-Depth View
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("basics")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              activeSubTab === "basics" ? "bg-sky-600 text-white font-bold" : "bg-white text-sky-900 hover:bg-sky-50 border border-sky-200"
            }`}
          >
            🌱 101 Basics
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("notes")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === "notes" ? "bg-slate-800 text-white" : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-200"
            }`}
          >
            📘 Detailed Notes
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("advanced")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              activeSubTab === "advanced" ? "bg-purple-700 text-white font-bold" : "bg-white text-purple-900 hover:bg-purple-50 border border-purple-200"
            }`}
          >
            ⚡ Advanced Mastery
          </button>
        </div>
      </div>

      {/* Main Depth Content Area */}
      <div className="p-4 sm:p-7 space-y-6">
        {/* 1. FOUNDATIONAL 101 BASICS SECTION */}
        {(activeSubTab === "all" || activeSubTab === "basics") && (
          <div className="p-4 sm:p-5 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-600 text-white">
                <Compass className="w-4 h-4" />
              </span>
              <h3 className="text-sm sm:text-base font-bold text-sky-950">
                Foundational 101 Basics & Everyday Intuition
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
              {section.foundationalIntro || section.simplifiedContent || (
                <>
                  <strong className="text-sky-950">Mental Model: </strong>
                  {section.simplifiedContent}
                </>
              )}
            </p>

            {/* Concept Analogies */}
            {section.concepts && section.concepts.length > 0 && (
              <div className="pt-2 border-t border-sky-200/60 space-y-2">
                <span className="text-[11px] font-bold text-sky-900 uppercase tracking-wider block">
                  Intuitive Analogies & Vocabulary:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(section.concepts || []).map((c, cIdx) => (
                    <button
                      key={cIdx}
                      type="button"
                      onClick={() => onConceptClick(c, section.content)}
                      className="p-3 bg-white hover:bg-amber-50/60 rounded-xl border border-sky-200 hover:border-amber-300 text-left transition-all shadow-2xs group"
                    >
                      <div className="flex items-center justify-between font-bold text-xs text-sky-950 group-hover:text-amber-900">
                        <span>{c.term}</span>
                        <Sparkles className="w-3 h-3 text-amber-500" />
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {c.analogy || c.definition}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. COMPREHENSIVE LECTURE NOTES BODY */}
        {(activeSubTab === "all" || activeSubTab === "notes") && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>Comprehensive Lecture Notes & Sequential Logic</span>
            </div>

            <div className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-800 leading-relaxed space-y-3">
              <Markdown
                components={{
                  strong: ({ children }) => (
                    <strong className="font-bold text-slate-950 bg-amber-100/90 text-amber-950 px-1 py-0.5 rounded-xs border-b border-amber-300">
                      {children}
                    </strong>
                  ),
                  ul: ({ children }) => (
                    <ul className="space-y-1.5 my-2 pl-4 list-disc text-slate-700">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="space-y-1.5 my-2 pl-4 list-decimal text-slate-700">
                      {children}
                    </ol>
                  ),
                  h1: ({ children }) => <h4 className="text-base font-bold text-slate-900 mt-3 mb-1">{children}</h4>,
                  h2: ({ children }) => <h5 className="text-sm font-bold text-slate-900 mt-2 mb-1">{children}</h5>,
                  h3: ({ children }) => <h6 className="text-xs font-bold text-slate-900 mt-1.5 mb-0.5">{children}</h6>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-indigo-500 bg-indigo-50/50 pl-3 py-1.5 my-2 text-slate-800 italic rounded-r-lg">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {section.content}
              </Markdown>
            </div>

            {/* Structured Bullet Keypoints */}
            {section.keyPoints && section.keyPoints.length > 0 && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Key Rules & Steps to Remember
                </span>
                <ul className="space-y-1.5">
                  {section.keyPoints.map((kp, kIdx) => (
                    <li key={kIdx} className="text-xs sm:text-sm text-slate-800 flex items-start gap-2">
                      <span className="text-indigo-600 font-bold">•</span>
                      <span>{kp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Teacher's Spoken Cues & Verbal Warnings */}
            {section.teachersSpokenTips && section.teachersSpokenTips.length > 0 && (
              <div className="p-3.5 sm:p-4 bg-amber-50 rounded-xl border border-amber-300 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>🎙️ Teacher's Spoken Cues & Verbal Traps (Unwritten on Board)</span>
                </div>
                <ul className="space-y-1.5">
                  {section.teachersSpokenTips.map((tip, tIdx) => (
                    <li key={tIdx} className="text-xs sm:text-sm text-slate-800 flex items-start gap-2">
                      <span className="text-amber-600 font-bold shrink-0">“</span>
                      <span className="italic font-medium">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 3. ADVANCED THEORETICAL MASTERY & MECHANISMS */}
        {(activeSubTab === "all" || activeSubTab === "advanced") && (
          <div className="p-4 sm:p-6 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-700 text-white">
                <GraduationCap className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-purple-950">
                  ⚡ Advanced Theoretical Mastery (In-Depth Mechanisms)
                </h3>
                <p className="text-xs text-purple-800">
                  Rigorous mechanics, edge cases, formulas, and professor test pitfalls
                </p>
              </div>
            </div>

            {/* Deep Mechanism Explanation */}
            <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-purple-200 text-xs sm:text-sm text-slate-800 leading-relaxed space-y-2">
              <strong className="text-purple-950 font-bold block">
                How It Works Under the Hood:
              </strong>
              <p>
                {section.advancedDeepDive ||
                  section.advancedMechanisms?.join(". ") ||
                  `Deep systematic analysis of ${section.heading}: includes underlying thermodynamic/logical transitions, governing laws, and systemic equilibrium.`}
              </p>
            </div>

            {/* Specific Advanced Mechanisms Bullets */}
            {section.advancedMechanisms && section.advancedMechanisms.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider block">
                  Detailed Mechanical Progression:
                </span>
                <ul className="space-y-1">
                  {section.advancedMechanisms.map((mech, mIdx) => (
                    <li key={mIdx} className="text-xs text-slate-800 flex items-start gap-2 bg-white/70 p-2 rounded-lg border border-purple-100">
                      <span className="text-purple-600 font-bold">⚡</span>
                      <span>{mech}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Formulas & Equations in this section */}
            {section.formulasOrTheorems && section.formulasOrTheorems.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-purple-200/60">
                <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider block flex items-center gap-1.5">
                  <Sigma className="w-3.5 h-3.5 text-purple-700" />
                  <span>Governing Formulas & Equations</span>
                </span>
                <div className="space-y-2.5">
                  {section.formulasOrTheorems.map((form, fIdx) => (
                    <div key={fIdx} className="p-3.5 bg-white rounded-xl border border-purple-200 space-y-2">
                      <div className="font-bold text-xs sm:text-sm text-purple-950">
                        {form.name}
                      </div>
                      <div className="p-2.5 bg-slate-900 text-emerald-300 font-mono text-xs rounded-lg overflow-x-auto">
                        <code>{form.equation || form.formula}</code>
                      </div>
                      {form.variables && (
                        <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 font-mono">
                          <span className="font-bold text-slate-800">Variables: </span>
                          {form.variables}
                        </p>
                      )}
                      {(form.application || form.explanation) && (
                        <p className="text-xs text-slate-700">
                          <span className="font-bold text-slate-900">Application: </span>
                          {form.application || form.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. VISUAL FLOWCHART / DIAGRAM (If present) */}
        {section.diagramOrChart && (section.diagramOrChart.asciiArt || (section.diagramOrChart.steps && section.diagramOrChart.steps.length > 0)) && (
          <div className="p-4 sm:p-6 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-600 text-white">
                <Network className="w-4 h-4" />
              </span>
              <h3 className="text-sm sm:text-base font-bold text-emerald-950">
                {section.diagramOrChart.title || "Topic Flowchart & Process Steps"}
              </h3>
            </div>

            {section.diagramOrChart.steps && section.diagramOrChart.steps.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {section.diagramOrChart.steps.map((st, sIdx) => (
                  <div key={sIdx} className="p-3 bg-white rounded-xl border border-emerald-200/80 text-xs space-y-1">
                    <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                        {st.stepNumber || sIdx + 1}
                      </span>
                      {st.title}
                    </span>
                    <p className="text-slate-600 pl-6 leading-relaxed">{st.description}</p>
                  </div>
                ))}
              </div>
            )}

            {section.diagramOrChart.asciiArt && (
              <div className="p-3 bg-slate-900 rounded-xl overflow-x-auto border border-slate-800">
                <pre className="font-mono text-xs text-emerald-400 leading-tight">
                  {section.diagramOrChart.asciiArt}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* 5. DEDICATED IN-BOX AI MENTOR ASSISTANT */}
        <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-slate-900/5 border-2 border-amber-300/80 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-400 text-slate-950 shadow-xs">
                <Bot className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-950 flex items-center gap-2">
                  <span>AI Mentor for "{section.heading}"</span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                    Active
                  </span>
                </h3>
                <p className="text-xs text-slate-600">
                  Ask any doubt or prompt the AI to clarify, derive, or test you
                </p>
              </div>
            </div>
          </div>

          {/* Quick Prompts */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              1-Click Instant Prompts:
            </span>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              {quickPrompts.map((p, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => onAskTutor && onAskTutor(p)}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-amber-100/80 text-left border border-amber-200 text-xs text-slate-900 font-medium transition-all shadow-2xs hover:shadow-xs flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{p}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Question Input */}
          <form onSubmit={handleSendCustomQuestion} className="flex gap-2">
            <input
              type="text"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder={`Ask AI Mentor anything about ${section.heading}...`}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 shadow-2xs"
            />
            <button
              type="submit"
              disabled={!customQuestion.trim()}
              className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:pointer-events-none shadow-xs"
            >
              <span>Ask</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Bottom Navigation Footer */}
      <div className="bg-slate-50 p-4 sm:p-5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Topic Boxes</span>
        </button>

        <div className="flex items-center gap-2">
          {onPrev && (
            <button
              type="button"
              onClick={onPrev}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs sm:text-sm font-semibold flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
          )}
          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <span>Next Topic</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
