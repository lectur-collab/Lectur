import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Lightbulb,
  Binary,
  Globe,
  AlertTriangle,
  HelpCircle,
  MessageSquare,
  Volume2,
  VolumeX,
  RotateCw,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { ConceptItem, ConceptClarification } from "../types";

interface ConceptClarifierModalProps {
  concept: ConceptItem | null;
  contextText?: string;
  academicLevel?: string;
  onClose: () => void;
}

export const ConceptClarifierModal: React.FC<ConceptClarifierModalProps> = ({
  concept,
  contextText = "",
  academicLevel = "undergraduate",
  onClose,
}) => {
  const [deepDive, setDeepDive] = useState<ConceptClarification | null>(null);
  const [loadingDeepDive, setLoadingDeepDive] = useState(false);
  const [showQuestionAnswer, setShowQuestionAnswer] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    // Reset state when concept changes
    setDeepDive(null);
    setShowQuestionAnswer(false);
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [concept]);

  if (!concept) return null;

  // Handle SpeechSynthesis audio read-aloud
  const toggleSpeech = () => {
    if (!window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const textToRead = `${concept.term}. ${concept.definition}. Real world analogy: ${concept.analogy}. Why it matters: ${concept.whyItMatters}`;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.rate = 0.95;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  // Request deep-dive clarification from Gemini API
  const handleFetchDeepDive = async () => {
    setLoadingDeepDive(true);
    try {
      const res = await fetch("/api/clarify-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          term: concept.term,
          context: `${concept.definition} ${concept.whyItMatters} ${contextText}`,
          academicLevel,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDeepDive(data);
      }
    } catch (err) {
      console.error("Deep dive error:", err);
    } finally {
      setLoadingDeepDive(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-400 text-slate-950">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                Academic Concept Clarifier
              </span>
              <h3 className="text-lg font-bold text-white font-editorial tracking-tight">
                {concept.term}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSpeech}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title={isSpeaking ? "Mute read aloud" : "Listen to audio explanation"}
            >
              {isSpeaking ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Formula or Theorem Highlight if present */}
          {concept.formulaOrDetail && (
            <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-xl font-mono-custom text-xs sm:text-sm text-slate-800 flex items-center gap-2.5">
              <Binary className="w-4 h-4 text-indigo-600 shrink-0" />
              <div className="overflow-x-auto">
                <span className="font-semibold text-indigo-900 mr-2">Formula / Rule:</span>
                <span className="bg-white px-2 py-0.5 rounded border border-slate-300 font-bold text-slate-900">
                  {concept.formulaOrDetail}
                </span>
              </div>
            </div>
          )}

          {/* Definition */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <BookOpen className="w-3.5 h-3.5 text-slate-700" />
              <span>Core Academic Definition</span>
            </div>
            <p className="text-sm text-slate-800 leading-relaxed font-medium bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              {concept.definition}
            </p>
          </div>

          {/* Real World Analogy */}
          <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-900">
              <Globe className="w-3.5 h-3.5 text-amber-700" />
              <span>Intuitive Real-World Analogy</span>
            </div>
            <p className="text-sm text-amber-950 leading-relaxed">
              {concept.analogy}
            </p>
          </div>

          {/* Why it Matters in the Subject */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Lightbulb className="w-3.5 h-3.5 text-emerald-600" />
              <span>Why This Matters for Exams & Mastery</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {concept.whyItMatters}
            </p>
          </div>

          {/* AI Deep-Dive Exploration Section */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            {!deepDive && !loadingDeepDive && (
              <button
                type="button"
                onClick={handleFetchDeepDive}
                className="w-full py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Generate Extended AI Deep Dive (Common Traps & Practice Question)</span>
              </button>
            )}

            {loadingDeepDive && (
              <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RotateCw className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Generating Socratic breakdown and exam trap analysis with Gemini...</span>
              </div>
            )}

            {deepDive && (
              <div className="space-y-4 pt-2 animate-in fade-in duration-200">
                {/* Technical breakdown */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-800">
                    <Binary className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Rigorous Technical Mechanics</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-indigo-50/40 p-3 rounded-xl border border-indigo-100">
                    {deepDive.technicalBreakdown}
                  </p>
                </div>

                {/* Common Student Mistakes / Exam Traps */}
                {deepDive.commonMistakes && deepDive.commonMistakes.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-700">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Frequent Exam Pitfalls & Misconceptions</span>
                    </div>
                    <ul className="space-y-1">
                      {deepDive.commonMistakes.map((mistake, i) => (
                        <li key={i} className="text-xs text-rose-900 bg-rose-50/60 p-2 rounded-lg border border-rose-100 flex items-start gap-1.5">
                          <span className="font-bold text-rose-600 mt-0.5">•</span>
                          <span>{mistake}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Quick Practice Check Question */}
                {deepDive.practiceQuestion && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Quick Self-Check Question</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowQuestionAnswer(!showQuestionAnswer)}
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                      >
                        {showQuestionAnswer ? "Hide Explanation" : "Reveal Answer"}
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800">
                      {deepDive.practiceQuestion.split("Answer:")[0]}
                    </p>
                    {showQuestionAnswer && deepDive.practiceQuestion.includes("Answer:") && (
                      <div className="mt-2 p-2.5 bg-emerald-50 text-emerald-900 rounded-lg text-xs font-medium border border-emerald-200 flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{deepDive.practiceQuestion.split("Answer:")[1]}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
