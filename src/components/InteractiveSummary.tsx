import React, { useState } from "react";
import {
  Sparkles,
  BookOpen,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Download,
  Printer,
  Search,
  Bookmark,
  CheckSquare,
  Square,
  ExternalLink,
  Youtube,
  FileText,
  AlertCircle,
  Sigma,
  Network,
  Zap,
  CheckCircle2,
  Circle,
  Flame,
  Layers,
  ArrowRight,
  Bot,
  Clock,
  Compass,
  GraduationCap,
  Smartphone,
  HelpCircle,
} from "lucide-react";
import { StudyNoteData, ConceptItem } from "../types";
import { FlashcardsAndQuiz } from "./FlashcardsAndQuiz";
import { VisualTimelinesGuide } from "./VisualTimelinesGuide";
import { TopicDetailBox } from "./TopicDetailBox";
import { AllAdvancedTopicsView } from "./AllAdvancedTopicsView";
import mentorAvatarImg from "../assets/images/mentor_avatar_1790084207727.jpg";

interface InteractiveSummaryProps {
  note: StudyNoteData;
  onConceptClick: (concept: ConceptItem, contextText: string) => void;
  onSaveToLibrary: (note: StudyNoteData) => void;
  isSaved: boolean;
  onAskTutor?: (prompt: string) => void;
}

export const InteractiveSummary: React.FC<InteractiveSummaryProps> = ({
  note,
  onConceptClick,
  onSaveToLibrary,
  isSaved,
  onAskTutor,
}) => {
  // Main view tab: boxes (topic cards) | advanced (all topics in depth) | visuals (timeline) | flashcards
  const [mainTab, setMainTab] = useState<"boxes" | "advanced" | "visuals" | "flashcards">("boxes");

  // Selected active topic box (when user "goes inside" that box to read depth information)
  const [activeTopicIndex, setActiveTopicIndex] = useState<number | null>(null);

  // Search filter inside topic boxes
  const [searchQuery, setSearchQuery] = useState("");

  // Clean meta-commentary preamble if model accidentally included "This guide covers..."
  const cleanSummaryText = (text: string) => {
    if (!text) return "";
    return text
      .replace(
        /^(this (guide|lecture|video|document|notes?)|in this (video|lecture|guide|document))\s+(covers?|helps? you|provides?|explores?|walks? through|discusses?)[^.!?]*[.!?]\s*/i,
        ""
      )
      .replace(
        /^(by reading this|after watching this|this material is designed to)[^.!?]*[.!?]\s*/i,
        ""
      )
      .trim();
  };

  // Checkboxes for takeaways & mastered status
  const [checkedTakeaways, setCheckedTakeaways] = useState<Record<number, boolean>>({});
  const [masteredSections, setMasteredSections] = useState<Record<number, boolean>>({});

  // Audio Speech state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copiedNote, setCopiedNote] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Toggle section mastered
  const toggleSectionMastered = (idx: number) => {
    setMasteredSections((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Toggle takeaway checkbox
  const toggleTakeaway = (idx: number) => {
    setCheckedTakeaways((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Audio speech synthesis
  const handleToggleSpeech = () => {
    if (!window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const takeawaysList = Array.isArray(note.keyTakeaways) ? note.keyTakeaways : [];
      const fullText = `${note.title}. Executive summary: ${note.executiveSummary}. Key takeaways: ${takeawaysList.join(". ")}`;
      const utterance = new SpeechSynthesisUtterance(fullText);
      utterance.rate = 0.95;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  // Copy full notes
  const handleCopyNotes = () => {
    const takeaways = Array.isArray(note.keyTakeaways) ? note.keyTakeaways : [];
    const sectionsList = Array.isArray(note.sections) ? note.sections : [];

    let md = `# ${note.title}\n\n`;
    md += `Source: ${note.sourceName} (${note.sourceType})\n\n`;
    md += `## Executive Summary\n${note.executiveSummary}\n\n`;
    md += `## Key Takeaways\n${takeaways.map((k) => `- ${k}`).join("\n")}\n\n`;
    md += `## Detailed Topics\n`;
    sectionsList.forEach((sec, i) => {
      md += `### Topic ${i + 1}: ${sec.heading} ${sec.timestamp ? `(${sec.timestamp})` : ""}\n`;
      md += `${sec.content}\n\n`;
      if (sec.concepts && sec.concepts.length > 0) {
        md += `**Key Concepts:**\n`;
        sec.concepts.forEach((c) => {
          md += `- **${c.term}**: ${c.definition} (Analogy: ${c.analogy})\n`;
        });
        md += "\n";
      }
    });

    navigator.clipboard.writeText(md);
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 2000);
  };

  // Download Markdown file
  const handleDownloadMarkdown = () => {
    const takeaways = Array.isArray(note.keyTakeaways) ? note.keyTakeaways : [];
    const sectionsList = Array.isArray(note.sections) ? note.sections : [];

    let md = `# ${note.title}\n\n`;
    md += `**Source**: ${note.sourceName} | **Style**: ${note.style} | **Level**: ${note.academicLevel}\n\n`;
    md += `## Executive Summary\n${note.executiveSummary}\n\n`;
    md += `## Key Takeaways\n${takeaways.map((k) => `- [ ] ${k}`).join("\n")}\n\n`;
    md += `## Topics Covered\n`;
    sectionsList.forEach((s, idx) => {
      md += `### Topic ${idx + 1}: ${s.heading} ${s.timestamp ? `[${s.timestamp}]` : ""}\n\n`;
      md += `${s.content}\n\n`;
      md += `*Main Point:* ${s.mainPoint || s.simplifiedContent}\n\n`;
      if (s.concepts && s.concepts.length > 0) {
        md += `#### Key Academic Concepts\n`;
        s.concepts.forEach((c) => {
          md += `- **${c.term}**: ${c.definition}\n  - *Analogy:* ${c.analogy}\n`;
        });
        md += "\n";
      }
    });

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${note.title.slice(0, 30).replace(/[^a-z0-9]/gi, "_")}_Notes.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(note.executiveSummary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  // Filter sections by search query
  const rawSections = Array.isArray(note.sections) ? note.sections : [];
  const filteredSections = rawSections.map((s, idx) => ({ ...s, originalIndex: idx })).filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const concepts = Array.isArray(s.concepts) ? s.concepts : [];
    return (
      (s.heading || "").toLowerCase().includes(q) ||
      (s.content || "").toLowerCase().includes(q) ||
      (s.simplifiedContent || "").toLowerCase().includes(q) ||
      concepts.some((c) => (c.term || "").toLowerCase().includes(q) || (c.definition || "").toLowerCase().includes(q))
    );
  });

  // Gamified Mastery & Stats calculations
  const totalCheckpoints = (note.keyTakeaways?.length || 0) + rawSections.length;
  const masteredCount =
    Object.values(checkedTakeaways).filter(Boolean).length +
    Object.values(masteredSections).filter(Boolean).length;
  const masteryPct = totalCheckpoints > 0 ? Math.round((masteredCount / totalCheckpoints) * 100) : 0;

  const totalChars =
    (note.executiveSummary?.length || 0) +
    rawSections.reduce((acc, s) => acc + (s.content?.length || 0), 0);
  const estimatedReadTime = Math.max(2, Math.ceil(totalChars / 900));

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">
      {/* Top Study Quest & Dopamine Mastery HUD - Mobile Compact */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-800 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-xs">
              <Flame className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
              <span>STUDY QUEST</span>
            </span>
            <span className="text-xs text-slate-300 font-medium">
              ⏱️ ~{estimatedReadTime} min read
            </span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-xs text-amber-300 font-medium hidden sm:inline">
              {masteredCount} of {totalCheckpoints} mastered
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-extrabold text-amber-400 font-mono">
              {masteryPct}% XP
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-700">
          <div
            className="bg-linear-to-r from-amber-400 via-amber-300 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${Math.min(100, Math.max(4, masteryPct))}%` }}
          />
        </div>
      </div>

      {/* Main Study Navigation Tabs - Clean, High-Contrast & Mobile Compact */}
      <div className="bg-white p-1.5 sm:p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1.5 overflow-x-auto scrollbar-none w-full">
        <button
          type="button"
          onClick={() => {
            setMainTab("boxes");
            setActiveTopicIndex(null);
          }}
          className={`px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap transition-all shrink-0 ${
            mainTab === "boxes"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <BookOpen className="w-4 h-4 text-amber-400" />
          <span>Topic Boxes</span>
          <span
            className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
              mainTab === "boxes" ? "bg-amber-400 text-slate-950" : "bg-slate-200 text-slate-800"
            }`}
          >
            {note.sections.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab("advanced")}
          className={`px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap transition-all shrink-0 ${
            mainTab === "advanced"
              ? "bg-purple-800 text-white shadow-xs"
              : "bg-slate-50 text-slate-700 hover:bg-purple-50 border border-slate-200"
          }`}
        >
          <GraduationCap className="w-4 h-4 text-purple-300" />
          <span>⚡ All Advanced Topics</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMainTab("flashcards");
            setActiveTopicIndex(null);
          }}
          className={`px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap transition-all shrink-0 ${
            mainTab === "flashcards"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-slate-50 text-slate-700 hover:bg-indigo-50 border border-slate-200"
          }`}
        >
          <Layers className="w-4 h-4 text-indigo-300" />
          <span>🗂️ Flashcards</span>
          <span
            className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
              mainTab === "flashcards" ? "bg-white text-indigo-950" : "bg-indigo-100 text-indigo-800"
            }`}
          >
            {note.flashcards?.length || 10}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMainTab("visuals");
            setActiveTopicIndex(null);
          }}
          className={`px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap transition-all shrink-0 ${
            mainTab === "visuals"
              ? "bg-amber-400 text-slate-950 shadow-xs"
              : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Clock className="w-4 h-4 text-slate-800" />
          <span>Visuals & Timeline</span>
        </button>
      </div>

      {/* 1. VISUALS & TIMELINE TAB VIEW */}
      {mainTab === "visuals" && (
        <VisualTimelinesGuide note={note} onAskTutor={onAskTutor} />
      )}

      {/* 2. FLASHCARDS TAB VIEW */}
      {mainTab === "flashcards" && (
        <FlashcardsAndQuiz
          flashcards={note.flashcards || []}
          topicTitle={note.title}
          note={note}
        />
      )}

      {/* 4. ALL ADVANCED TOPICS VIEW (EXPLAINED IN DETAIL) */}
      {mainTab === "advanced" && (
        <AllAdvancedTopicsView
          note={note}
          onAskTutor={onAskTutor}
          onOpenSectionBox={(idx) => {
            setActiveTopicIndex(idx);
            setMainTab("boxes");
          }}
        />
      )}

      {/* 5. TOPIC STUDY BOXES TAB VIEW */}
      {mainTab === "boxes" && (
        <>
          {/* If the user clicked to "go inside" a specific topic box */}
          {activeTopicIndex !== null && note.sections[activeTopicIndex] ? (
            <TopicDetailBox
              section={note.sections[activeTopicIndex]}
              sectionIndex={activeTopicIndex}
              totalSections={note.sections.length}
              onClose={() => setActiveTopicIndex(null)}
              onNext={
                activeTopicIndex < note.sections.length - 1
                  ? () => setActiveTopicIndex(activeTopicIndex + 1)
                  : undefined
              }
              onPrev={
                activeTopicIndex > 0
                  ? () => setActiveTopicIndex(activeTopicIndex - 1)
                  : undefined
              }
              isMastered={!!masteredSections[activeTopicIndex]}
              onToggleMastered={() => toggleSectionMastered(activeTopicIndex)}
              onConceptClick={onConceptClick}
              onAskTutor={onAskTutor}
            />
          ) : (
            /* Otherwise: Show clean lecture overview + all topic boxes */
            <div className="space-y-5 sm:space-y-6">
              {/* Lecture Title Header & Compact Toolbar */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 pb-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        note.sourceType === "youtube"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}
                    >
                      {note.sourceType === "youtube" ? (
                        <>
                          <Youtube className="w-3.5 h-3.5 text-red-600" />
                          <span>YouTube Lecture</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          <span>Document</span>
                        </>
                      )}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                      {note.academicLevel?.replace("_", " ")}
                    </span>
                    {note.languageTone === "peer_friendly" && (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-1 shadow-2xs">
                        <span>🤝 Peer / Dost Tone</span>
                      </span>
                    )}
                  </div>

                  {/* Action Icons Bar (Mobile-Compact) */}
                  <div className="flex items-center gap-1.5">
                    {onAskTutor && (
                      <button
                        type="button"
                        onClick={() =>
                          onAskTutor(
                            `Could you summarize the main points, diagrams, and crucial formulas of "${note.title}"? What are the key takeaways I must know?`
                          )
                        }
                        className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors shadow-xs cursor-pointer"
                        title="Ask AI Socratic Tutor"
                      >
                        <img
                          src={mentorAvatarImg}
                          alt="Mentor"
                          referrerPolicy="no-referrer"
                          className="w-4 h-4 rounded-full object-cover border border-slate-900/30"
                        />
                        <span className="hidden sm:inline">Ask AI Mentor</span>
                      </button>
                    )}

                    <button
                      onClick={handleToggleSpeech}
                      className={`p-2 rounded-xl text-xs font-medium flex items-center gap-1 transition-colors border cursor-pointer ${
                        isSpeaking
                          ? "bg-amber-100 text-amber-900 border-amber-300"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                      title={isSpeaking ? "Pause Audio" : "Listen to Audio"}
                    >
                      {isSpeaking ? <VolumeX className="w-4 h-4 text-amber-700" /> : <Volume2 className="w-4 h-4 text-slate-700" />}
                    </button>

                    <button
                      onClick={handleCopyNotes}
                      className="p-2 rounded-xl text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                      title="Copy all notes"
                    >
                      {copiedNote ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={handleDownloadMarkdown}
                      className="p-2 rounded-xl text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                      title="Export Markdown Notes"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => window.print()}
                      className="p-2 rounded-xl text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors hidden sm:flex cursor-pointer"
                      title="Print"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onSaveToLibrary(note)}
                      className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border cursor-pointer ${
                        isSaved
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : "bg-slate-900 hover:bg-slate-800 text-white border-slate-900"
                      }`}
                      title="Save Note"
                    >
                      <Bookmark className={`w-4 h-4 ${isSaved ? "text-emerald-600 fill-emerald-600" : "text-amber-400"}`} />
                      <span className="hidden sm:inline">{isSaved ? "Saved" : "Save"}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-editorial leading-tight">
                    {note.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500">
                    <span>Source: {note.sourceName}</span>
                    {note.sourceUrlOrInfo && note.sourceType === "youtube" && (
                      <a
                        href={note.sourceUrlOrInfo}
                        target="_blank"
                        rel="noreferrer"
                        className="text-red-600 hover:underline inline-flex items-center gap-0.5 font-medium"
                      >
                        <span>Watch video</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Chapter Summary (Like the end of a chapter in a textbook - Zero Meta Talk) */}
                <div className="p-5 sm:p-6 bg-slate-950 text-white rounded-2xl border border-slate-800 space-y-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-amber-400 text-slate-950 font-bold">
                        <Zap className="w-4 h-4 fill-slate-950 text-slate-950" />
                      </span>
                      <div>
                        <h2 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-2">
                          <span>Chapter Summary & Core Truths</span>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-850 text-amber-300 border border-slate-700">
                            What You Must Know
                          </span>
                        </h2>
                        <p className="text-[11px] text-slate-400">
                          Essential physical truths, governing laws & core mechanisms (like the summary at the end of a textbook chapter).
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleCopySummary}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-850 hover:bg-slate-750 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors border border-slate-750"
                    >
                      {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSummary ? "Copied" : "Copy Summary"}</span>
                    </button>
                  </div>

                  {/* Factual Summary Statement */}
                  <div className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans font-normal">
                    <p>{cleanSummaryText(note.executiveSummary)}</p>
                  </div>

                  {/* Essential Keywords & Must-Know Meanings */}
                  {((note.essentialKeywords && note.essentialKeywords.length > 0) || (note.sections.flatMap(s => s.concepts).length > 0)) && (
                    <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Essential Keywords & What You Must Know</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                          Key vocabulary terms
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(note.essentialKeywords && note.essentialKeywords.length > 0
                          ? note.essentialKeywords
                          : note.sections.flatMap(s => s.concepts).slice(0, 8).map(c => ({ keyword: c.term, mustKnowMeaning: c.definition }))
                        ).map((kw, kwIdx) => (
                          <div
                            key={kwIdx}
                            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex flex-col gap-1"
                          >
                            <div className="font-bold text-amber-300 flex items-center gap-1.5">
                              <span>📌</span>
                              <span>{kw.keyword}</span>
                            </div>
                            <p className="text-slate-300 text-[11px] leading-relaxed">
                              {kw.mustKnowMeaning}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Core High-Yield Takeaways (What You Must Know on Exams) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                      <CheckSquare className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900">
                        Must-Know Rules & Core Takeaways
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        The non-negotiable exam principles and core facts from this chapter
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {Object.values(checkedTakeaways).filter(Boolean).length} / {note.keyTakeaways.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {note.keyTakeaways.map((takeaway, idx) => {
                    const isChecked = !!checkedTakeaways[idx];
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleTakeaway(idx)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                          isChecked
                            ? "bg-emerald-50/50 border-emerald-200 text-slate-400 line-through"
                            : "bg-slate-50 hover:bg-slate-100/70 border-slate-200 text-slate-800"
                        }`}
                      >
                        <button type="button" className="mt-0.5 text-emerald-600">
                          {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                        </button>
                        <span className="text-xs font-medium leading-relaxed flex-1">
                          {takeaway}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Teacher's Spoken Golden Lines & Verbal Insights (Unwritten Board Remarks) */}
              {note.teachersSpokenGoldenLines && note.teachersSpokenGoldenLines.length > 0 && (
                <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-amber-200/80 text-amber-950">
                        <Sparkles className="w-4 h-4 text-amber-800" />
                      </span>
                      <div>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                          <span>Teacher's Spoken Golden Lines</span>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-200 text-amber-950">
                            Spoken & Unwritten on Board
                          </span>
                        </h3>
                        <p className="text-[11px] text-slate-600">
                          Crucial spoken exam warnings, verbal shortcuts & rules of thumb the teacher stated out loud in the lecture.
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300/60 shrink-0">
                      {note.teachersSpokenGoldenLines.length} Spoken Gems
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                    {note.teachersSpokenGoldenLines.map((item, gIdx) => (
                      <div
                        key={gIdx}
                        className="p-3 bg-white rounded-xl border border-amber-200/70 shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-amber-600 text-base leading-none shrink-0 font-serif">“</span>
                          <p className="text-xs font-bold text-slate-900 leading-snug">
                            {item.spokenLine}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                          <span className="font-semibold text-amber-900 bg-amber-100/60 px-1.5 py-0.5 rounded text-[10px]">
                            Topic: {item.context}
                          </span>
                          <span className="text-slate-600 italic">
                            💡 {item.examSignificance}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Topic Notes Explained In Simple Words (Available Below) Header & Search */}
              <div className="pt-3 border-t-2 border-dashed border-indigo-200/80">
                <div className="bg-indigo-50/70 border border-indigo-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="p-1.5 rounded-lg bg-indigo-600 text-white">
                        <BookOpen className="w-4 h-4" />
                      </span>
                      <h2 className="text-base sm:text-lg font-black text-slate-900">
                        Topic Notes Explained In Simple Words
                      </h2>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-200/80 text-indigo-950 text-xs font-mono font-bold">
                        {note.sections.length} Topics
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Every topic from the video explained below in simple, clear words with zero jargon. Tap any topic box to study!
                    </p>
                  </div>

                  {/* Compact Search Bar */}
                  <div className="relative w-full sm:w-64 shrink-0">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter topic notes..."
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* SEPARATE TOPIC BOXES LIST */}
              <div className="space-y-4">
                {filteredSections.map((sec) => {
                  const idx = sec.originalIndex;
                  const isMastered = !!masteredSections[idx];

                  return (
                    <div
                      key={idx}
                      onClick={() => setActiveTopicIndex(idx)}
                      className={`bg-white rounded-2xl border-2 transition-all duration-200 p-4 sm:p-5 cursor-pointer shadow-xs hover:shadow-lg hover:-translate-y-0.5 hover:border-indigo-400 group relative ${
                        isMastered ? "border-emerald-300 bg-emerald-50/20" : "border-slate-200/90"
                      }`}
                    >
                      {/* Box Top: Topic Number, Heading, Timestamp, and Difficulty Pill */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-900 text-xs font-bold font-mono">
                            Topic {String(idx + 1).padStart(2, "0")}
                          </span>
                          {sec.timestamp && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-mono font-medium">
                              ⏱️ {sec.timestamp}
                            </span>
                          )}
                          {sec.difficulty === "foundational_basic" || idx === 0 ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                              🌱 101 Basics
                            </span>
                          ) : sec.difficulty === "advanced_mastery" || (sec.formulasOrTheorems && sec.formulasOrTheorems.length > 0) ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                              ⚡ Advanced Depth
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Core Concept
                            </span>
                          )}
                        </div>

                        {/* Got It Checkmark */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSectionMastered(idx);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                            isMastered
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          }`}
                        >
                          {isMastered ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                              <span>Got It ✓</span>
                            </>
                          ) : (
                            <>
                              <Circle className="w-3.5 h-3.5 text-slate-400" />
                              <span>Mark Got It</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Topic Title */}
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-2.5 font-editorial group-hover:text-indigo-900 transition-colors">
                        {sec.heading}
                      </h3>

                      {/* Highlighted Main Point Box */}
                      <div className="mt-2.5 p-3 rounded-xl bg-amber-500/10 border-l-4 border-amber-500 border-y border-r border-amber-200/60 text-xs sm:text-sm font-semibold text-slate-950 leading-relaxed">
                        <span className="text-amber-800 font-extrabold uppercase text-[10px] block mb-0.5 tracking-wider">
                          Key Principle:
                        </span>
                        {sec.mainPoint || sec.simplifiedContent || sec.keyPoints?.[0]}
                      </div>

                      {/* Preview Snippet */}
                      <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                        {sec.foundationalIntro || sec.simplifiedContent || sec.content.slice(0, 160)}
                      </p>

                      {/* Bottom Info Chips & Action CTAs */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                          {sec.concepts.length > 0 && (
                            <span className="px-2 py-0.5 bg-slate-100 rounded-md font-medium">
                              {sec.concepts.length} terms
                            </span>
                          )}
                          {sec.formulasOrTheorems && sec.formulasOrTheorems.length > 0 && (
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-semibold">
                              {sec.formulasOrTheorems.length} formulas
                            </span>
                          )}
                          {sec.diagramOrChart && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-semibold">
                              Diagram
                            </span>
                          )}
                          {sec.teachersSpokenTips && sec.teachersSpokenTips.length > 0 && (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-md font-semibold text-[10px]">
                              🎙️ {sec.teachersSpokenTips.length} Teacher Cues
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {onAskTutor && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAskTutor(
                                  `Could you explain Topic ${idx + 1}: "${sec.heading}" in depth? What are the key mechanisms, diagram flows, and common test pitfalls?`
                                );
                              }}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 flex items-center gap-1.5 transition-colors"
                              title="Ask AI Mentor about this topic"
                            >
                              <Bot className="w-3.5 h-3.5 text-amber-600" />
                              <span className="hidden sm:inline">Ask AI</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setActiveTopicIndex(idx)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 group-hover:bg-indigo-600 text-white flex items-center gap-1.5 transition-colors shadow-xs"
                          >
                            <span>Open Topic Box</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Key Formulas, Theorems & Equations Overview Card (if present) */}
              {note.formulasOrTheorems && note.formulasOrTheorems.length > 0 && (
                <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-4 sm:p-6 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                        <Sigma className="w-4 h-4" />
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900">
                        Formulas, Theorems & Mathematical Equations
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                      {note.formulasOrTheorems.length} Total
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {note.formulasOrTheorems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                      >
                        <div className="font-bold text-xs sm:text-sm text-indigo-950">
                          {item.name}
                        </div>
                        <div className="p-2.5 bg-slate-900 text-emerald-300 font-mono text-xs rounded-lg overflow-x-auto shadow-inner">
                          <code>{item.formula || item.equation}</code>
                        </div>
                        {(item.explanation || item.application) && (
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {item.explanation || item.application}
                          </p>
                        )}
                        {item.variables && (
                          <p className="text-[11px] text-slate-500 font-mono bg-white p-1.5 rounded border border-slate-200">
                            <strong>Vars: </strong>{item.variables}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Overall Technical Diagram / Flowchart (if present) */}
              {note.diagramOrChart && (note.diagramOrChart.asciiArt || (note.diagramOrChart.steps && note.diagramOrChart.steps.length > 0)) && (
                <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-4 sm:p-6 space-y-3.5">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                      <Network className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      {note.diagramOrChart.title || "Concept Diagram & Visual Flowchart"}
                    </h3>
                  </div>

                  {note.diagramOrChart.steps && note.diagramOrChart.steps.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {note.diagramOrChart.steps.map((step, sIdx) => (
                        <div
                          key={sIdx}
                          className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-1 text-xs"
                        >
                          <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                              {step.stepNumber || sIdx + 1}
                            </span>
                            {step.title}
                          </span>
                          <p className="text-slate-600 pl-5">{step.description}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {note.diagramOrChart.asciiArt && (
                    <div className="p-3 bg-slate-900 rounded-xl overflow-x-auto border border-slate-800">
                      <pre className="font-mono text-xs text-emerald-400 leading-tight">
                        {note.diagramOrChart.asciiArt}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Exam Pitfalls & Memory Tricks */}
              {note.examTips && note.examTips.length > 0 && (
                <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-4 sm:p-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                      <AlertCircle className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      Common Exam Pitfalls & Memory Tricks
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {note.examTips.map((tip, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 text-xs text-rose-950 leading-relaxed flex items-start gap-2"
                      >
                        <span className="font-bold text-rose-600 mt-0.5">⚠️</span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
