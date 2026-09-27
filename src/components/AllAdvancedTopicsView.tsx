import React, { useState } from "react";
import {
  GraduationCap,
  Sparkles,
  Bot,
  Sigma,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Search,
  BookOpen,
} from "lucide-react";
import { StudyNoteData, StudySection } from "../types";

interface AllAdvancedTopicsViewProps {
  note: StudyNoteData;
  onAskTutor?: (prompt: string) => void;
  onOpenSectionBox?: (index: number) => void;
}

export const AllAdvancedTopicsView: React.FC<AllAdvancedTopicsViewProps> = ({
  note,
  onAskTutor,
  onOpenSectionBox,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTopics, setExpandedTopics] = useState<Record<number, boolean>>({});

  const toggleExpand = (idx: number) => {
    setExpandedTopics((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Build the list of all covered topics with their deep explanations
  // If the server provided topicBreakdowns, merge them; otherwise map from every section
  const sectionsList = Array.isArray(note.sections) ? note.sections : [];
  const topicsList = sectionsList.map((sec, idx) => {
    const matchedBreakdown = note.advancedMastery?.topicBreakdowns?.find(
      (b) =>
        b.topic.toLowerCase().includes(sec.heading.toLowerCase()) ||
        sec.heading.toLowerCase().includes(b.topic.toLowerCase())
    );

    return {
      index: idx,
      heading: sec.heading || `Topic ${idx + 1}`,
      timestamp: sec.timestamp,
      difficulty: sec.difficulty,
      deepMechanism:
        matchedBreakdown?.deepMechanism ||
        sec.advancedDeepDive ||
        (sec.advancedMechanisms && sec.advancedMechanisms.length > 0 ? sec.advancedMechanisms.join(". ") : "") ||
        `Comprehensive mechanical breakdown: ${sec.content?.slice(0, 300) || "Deep study analysis"}...`,
      advancedMechanisms: sec.advancedMechanisms || [],
      formulas: sec.formulasOrTheorems || [],
      edgeCases:
        note.advancedMastery?.edgeCasesAndNuances?.[idx] ||
        note.examTips?.[idx] ||
        "Watch for boundary assumptions, sign conventions, and non-ideal conditions on exams.",
      practicalApplication:
        matchedBreakdown?.practicalOrExamApplication ||
        sec.simplifiedContent ||
        "High-yield concept tested in multi-step problem solving.",
      concepts: sec.concepts || [],
      teachersSpokenTips: sec.teachersSpokenTips || [],
    };
  });

  const filteredTopics = topicsList.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.heading.toLowerCase().includes(q) ||
      t.deepMechanism.toLowerCase().includes(q) ||
      t.formulas.some((f) => f.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Advanced Hero Header */}
      <div className="bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 sm:p-7 border border-purple-800 shadow-md space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-600 text-white shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight font-editorial">
                ⚡ Advanced Mastery & Deep Breakdown
              </h2>
              <p className="text-xs text-purple-200">
                All {sectionsList.length} topics covered in this lecture explained in exhaustive technical detail
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-purple-800/80 border border-purple-600 text-xs font-bold font-mono">
            {sectionsList.length} Topics Analyzed
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
          Zero shortcuts or generic summaries. Every individual topic covered in the video is broken down here with its underlying mechanism, mathematical formulations, boundary conditions, and exam pitfalls.
        </p>

        {/* Search inside advanced */}
        <div className="relative pt-2 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search advanced mechanics, formulas, topics..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-purple-700/60 rounded-xl text-xs text-white placeholder:text-slate-400 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
      </div>

      {/* Topics Detailed Cards Grid / List */}
      <div className="space-y-4">
        {filteredTopics.map((topic) => {
          const isExpanded = expandedTopics[topic.index] !== false; // default expanded for easy reading

          return (
            <div
              key={topic.index}
              className="bg-white rounded-2xl border-2 border-purple-200/90 shadow-sm overflow-hidden hover:border-purple-300 transition-all"
            >
              {/* Topic Header Bar */}
              <div
                onClick={() => toggleExpand(topic.index)}
                className="p-4 sm:p-5 bg-purple-50/70 border-b border-purple-100 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-purple-100/50 transition-colors"
              >
                <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap min-w-0 flex-1">
                  <span className="px-2 py-0.5 rounded-md bg-purple-700 text-white font-mono font-bold text-xs shrink-0">
                    Topic {String(topic.index + 1).padStart(2, "0")}
                  </span>
                  {topic.timestamp && (
                    <span className="px-2 py-0.5 rounded-md bg-white text-slate-700 font-mono text-xs border border-purple-200 font-medium shrink-0">
                      ⏱️ {topic.timestamp}
                    </span>
                  )}
                  <h3 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 tracking-tight break-words">
                    {topic.heading}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {onOpenSectionBox && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenSectionBox(topic.index);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-purple-50 text-purple-900 border border-purple-300 flex items-center gap-1 transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                      <span className="hidden sm:inline">Open Topic Box</span>
                    </button>
                  )}
                  <button type="button" className="text-purple-700">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Topic Expanded Depth Details */}
              {isExpanded && (
                <div className="p-4 sm:p-6 space-y-4">
                  {/* 1. Underlying Mechanism */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                      <span className="text-purple-600">⚡</span>
                      <span>Deep Underlying Mechanism & Scientific/Logical Flow</span>
                    </span>
                    <div className="p-4 bg-slate-50 rounded-xl border border-purple-100 text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                      {topic.deepMechanism}
                    </div>
                  </div>

                  {/* Mechanical Progression Bullets */}
                  {topic.advancedMechanisms.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                        Under-The-Hood Steps:
                      </span>
                      <ul className="space-y-1">
                        {topic.advancedMechanisms.map((mech, mIdx) => (
                          <li
                            key={mIdx}
                            className="p-2.5 rounded-lg bg-purple-50/50 border border-purple-100 text-xs text-slate-800 flex items-start gap-2"
                          >
                            <span className="text-purple-700 font-bold">•</span>
                            <span>{mech}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Formulas (if present) */}
                  {topic.formulas.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                        <Sigma className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Governing Formulas & Equations</span>
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {topic.formulas.map((form, fIdx) => (
                          <div key={fIdx} className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200 text-xs space-y-1.5">
                            <span className="font-bold text-indigo-950 block">{form.name}</span>
                            <div className="p-2 bg-slate-900 text-emerald-300 font-mono rounded-lg">
                              <code>{form.equation || form.formula}</code>
                            </div>
                            {form.variables && (
                              <p className="text-[11px] text-slate-600 font-mono">
                                <strong>Vars: </strong>{form.variables}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Edge Cases & Exam Traps */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 text-xs space-y-1">
                      <span className="font-bold text-amber-950 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Edge Cases & Professor Pitfalls</span>
                      </span>
                      <p className="text-slate-700 leading-relaxed">
                        {topic.edgeCases}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-200 text-xs space-y-1">
                      <span className="font-bold text-sky-950 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                        <span>Exam Application & High-Yield Testing</span>
                      </span>
                      <p className="text-slate-700 leading-relaxed">
                        {topic.practicalApplication}
                      </p>
                    </div>
                  </div>

                  {/* Teacher's Spoken Verbal Cues */}
                  {topic.teachersSpokenTips.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs space-y-1.5">
                      <span className="font-bold text-amber-950 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>🎙️ Teacher's Spoken Lines & Verbal Insights (Unwritten on Board):</span>
                      </span>
                      <ul className="space-y-1">
                        {topic.teachersSpokenTips.map((tip, tIdx) => (
                          <li key={tIdx} className="text-slate-800 italic flex items-start gap-1.5">
                            <span className="text-amber-600 font-bold shrink-0">“</span>
                            <span>{tip}”</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Ask AI Tutor about this topic */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    {onAskTutor && (
                      <button
                        type="button"
                        onClick={() =>
                          onAskTutor(
                            `Could you explain the advanced mechanics, derivations, and tricky test traps for "${topic.heading}" in deep detail?`
                          )
                        }
                        className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1.5 transition-colors group"
                      >
                        <Bot className="w-3.5 h-3.5 text-purple-600 group-hover:scale-110 transition-transform" />
                        <span>Ask Mentor to deep-dive into {topic.heading}</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    )}

                    {onOpenSectionBox && (
                      <button
                        type="button"
                        onClick={() => onOpenSectionBox(topic.index)}
                        className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 ml-auto"
                      >
                        <span>Open Full Topic Box</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Global Pitfalls and Edge Cases summary */}
      {note.advancedMastery?.edgeCasesAndNuances && note.advancedMastery.edgeCasesAndNuances.length > 0 && (
        <div className="bg-purple-900 text-white rounded-2xl p-5 sm:p-6 space-y-3 shadow-sm border border-purple-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-700 text-amber-300">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Professor Pitfalls & Exam Traps Across Entire Lecture
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {note.advancedMastery.edgeCasesAndNuances.map((nuance, nIdx) => (
              <div key={nIdx} className="p-3 rounded-xl bg-purple-800/80 border border-purple-700 text-xs text-purple-100 flex items-start gap-2">
                <span className="text-amber-400 font-bold mt-0.5">⚠️</span>
                <span>{nuance}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
