import React, { useState } from "react";
import {
  Youtube,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Clipboard,
  X,
  Play,
  RotateCw,
  Zap,
  Users,
  GraduationCap,
  Languages,
} from "lucide-react";
import { StudyNoteData, LanguageTone } from "../types";

interface SourceInputProps {
  onNotesGenerated: (notes: StudyNoteData) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const SourceInput: React.FC<SourceInputProps> = ({
  onNotesGenerated,
  isLoading,
  setIsLoading,
}) => {
  // YouTube state
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [detectedVideoId, setDetectedVideoId] = useState<string | null>(null);

  // Writing Technique & Language Tone (standard = English, peer_friendly = Hinglish + Friendly)
  const [selectedTone, setSelectedTone] = useState<LanguageTone>(() => {
    const saved = localStorage.getItem("lectur_preferred_tone");
    return saved === "peer_friendly" ? "peer_friendly" : "standard";
  });

  const handleToneChange = (tone: LanguageTone) => {
    setSelectedTone(tone);
    try {
      localStorage.setItem("lectur_preferred_tone", tone);
    } catch {
      // ignore localstorage errors
    }
  };

  // Loading phase progress
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Extract YouTube ID helper
  const handleUrlChange = (val: string) => {
    setYoutubeUrl(val);
    setErrorMessage(null);
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/;
    const match = val.trim().match(regExp);
    if (match && match[1]) {
      setDetectedVideoId(match[1]);
    } else {
      setDetectedVideoId(null);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleUrlChange(text);
      }
    } catch {
      // Clipboard fallback
    }
  };

  const setSampleVideo = (url: string) => {
    handleUrlChange(url);
  };

  // Submit Handler
  const handleGenerate = async () => {
    setErrorMessage(null);

    if (!youtubeUrl.trim() || !detectedVideoId) {
      setErrorMessage("Please enter a valid YouTube video URL to generate notes.");
      return;
    }

    setIsLoading(true);
    setLoadingStep(1);

    // Multi-phase step progression for reassuring UX
    const interval1 = setTimeout(() => setLoadingStep(2), 2200);
    const interval2 = setTimeout(() => setLoadingStep(3), 5500);
    const interval3 = setTimeout(() => setLoadingStep(4), 9500);

    try {
      const response = await fetch("/api/process-youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: youtubeUrl.trim(),
          languageTone: selectedTone,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned error (${response.status})`);
      }

      const noteData: StudyNoteData = await response.json();
      onNotesGenerated(noteData);
    } catch (err: any) {
      console.error("Failed to generate notes:", err);
      setErrorMessage(err.message || "An unexpected error occurred while converting the video. Please try again.");
    } finally {
      clearTimeout(interval1);
      clearTimeout(interval2);
      clearTimeout(interval3);
      setIsLoading(false);
      setLoadingStep(0);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-3.5 sm:px-6 py-6 sm:py-10 animate-in fade-in duration-300">
      {/* Introduction Hero */}
      <div className="text-center mb-6 sm:mb-8 animate-in fade-in slide-in-from-top-3 duration-500">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-amber-950 mb-3 border border-amber-300/80 shadow-2xs shimmer-badge transition-transform hover:scale-105">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
          AI YouTube Lecture Companion
        </span>
        <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight font-editorial">
          Transform YouTube Lectures into Master Study Notes
        </h2>
        <p className="mt-2.5 text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
          Paste any educational YouTube video link. Gemini extracts every topic in detail — from foundational basics to advanced mechanics like string constraints, wedge problems, friction, equations, and diagrams.
        </p>
      </div>

      {/* Main Single-Box Form */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden p-5 sm:p-8 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="yt-url-input" className="block text-slate-800">
              <span className="block text-sm font-black uppercase tracking-wide text-slate-900">
                YouTube Lecture
              </span>
              <span className="block text-[11px] font-bold text-amber-700 uppercase tracking-wider mt-0.5">
                Video URL
              </span>
            </label>
            <span className="text-[11px] text-slate-400 font-medium">Standard or Shorts link</span>
          </div>

          <div className="relative flex items-center group">
            <div className="absolute left-3.5 text-red-600 group-hover:scale-110 transition-transform duration-200 shrink-0">
              <Youtube className="w-5 h-5" />
            </div>
            <input
              id="yt-url-input"
              type="url"
              value={youtubeUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
              disabled={isLoading}
              className="w-full pl-11 pr-24 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 hover:border-slate-400 transition-all disabled:opacity-60"
            />
            <div className="absolute right-2.5 flex items-center gap-1.5">
              {youtubeUrl && !isLoading && (
                <button
                  type="button"
                  onClick={() => handleUrlChange("")}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
                  title="Clear input"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {!isLoading && (
                <button
                  type="button"
                  onClick={handlePaste}
                  className="px-2.5 py-1 text-xs font-bold bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-700 rounded-lg flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                >
                  <Clipboard className="w-3 h-3" />
                  <span>Paste</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Video Thumbnail Preview */}
        {detectedVideoId && (
          <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in duration-200">
            <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-black shrink-0 shadow-xs">
              <img
                src={`https://img.youtube.com/vi/${detectedVideoId}/mqdefault.jpg`}
                alt="YouTube thumbnail preview"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                <Play className="w-5 h-5 text-white drop-shadow-md" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold mb-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ready to Convert</span>
              </div>
              <p className="text-xs text-slate-600 font-mono font-medium truncate">
                Video ID: {detectedVideoId}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Extracts all lecture subtopics, string &amp; wedge constraints, formulas, and 10 difficult MCQs.
              </p>
            </div>
          </div>
        )}

        {/* Peer-Style Language / Writing Technique & Tone Section */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
              <span className="p-1 rounded-lg bg-indigo-100 text-indigo-700">
                <Languages className="w-3.5 h-3.5" />
              </span>
              <span>Study Writing Technique</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-linear-to-r from-indigo-50 via-purple-50 to-amber-50 text-indigo-900 border border-indigo-200/90 shadow-2xs font-mono">
              <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
              <span>Writing Technique &amp; Tone</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Standard Academic (English Language) */}
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleToneChange("standard")}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between relative group ${
                selectedTone === "standard"
                  ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20"
                  : "bg-slate-50/80 hover:bg-slate-100 border-slate-200 text-slate-800"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm">
                    <GraduationCap className={`w-4 h-4 ${selectedTone === "standard" ? "text-amber-400" : "text-slate-600"}`} />
                    <span>Standard Academic</span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    selectedTone === "standard" ? "bg-amber-400 text-slate-950" : "bg-slate-200 text-slate-700"
                  }`}>
                    English
                  </span>
                </div>
                <p className={`text-xs leading-relaxed font-sans mt-1 ${selectedTone === "standard" ? "text-slate-300" : "text-slate-600"}`}>
                  Complete, rigorous notes &amp; active-recall flashcards written in 100% clear academic English.
                </p>
              </div>

              <div className={`mt-3 pt-2 border-t flex items-center justify-between text-[11px] font-mono ${
                selectedTone === "standard" ? "border-slate-800 text-amber-300" : "border-slate-200 text-slate-500"
              }`}>
                <span>Pure English Language</span>
                <span>Formal &amp; Exam-Ready</span>
              </div>
            </button>

            {/* 2. Peer-Style / Study Buddy (Dost Tone - Hinglish) */}
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleToneChange("peer_friendly")}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between relative group overflow-hidden ${
                selectedTone === "peer_friendly"
                  ? "bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white border-indigo-500 shadow-lg ring-2 ring-indigo-400/40"
                  : "bg-indigo-50/70 hover:bg-indigo-100/80 border-indigo-200 text-indigo-950"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm">
                    <Users className={`w-4 h-4 ${selectedTone === "peer_friendly" ? "text-amber-300" : "text-indigo-600"}`} />
                    <span>Dost Tone (Peer-to-Peer)</span>
                  </div>
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-2xs">
                    Hinglish + Friendly
                  </span>
                </div>
                <p className={`text-xs leading-relaxed font-sans mt-1 ${selectedTone === "peer_friendly" ? "text-indigo-200" : "text-indigo-900"}`}>
                  Exact same rigorous academic information, formulas, and flashcards explained in natural, friendly Hinglish.
                </p>
              </div>

              <div className={`mt-3 pt-2 border-t flex items-center justify-between text-[11px] font-mono ${
                selectedTone === "peer_friendly" ? "border-indigo-800 text-amber-300" : "border-indigo-200 text-indigo-700"
              }`}>
                <span>Hinglish Language</span>
                <span>Same Deep Information</span>
              </div>
            </button>
          </div>
        </div>

        {/* Quick Sample Links */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500" />
            <span>Try sample lecture topics:</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {[
              {
                label: "Newton's Laws of Motion (Physics)",
                url: "https://www.youtube.com/watch?v=kKKM8Y-u7ds",
              },
              {
                label: "Biomolecules & Cell Biology",
                url: "https://www.youtube.com/watch?v=H8WJ2KENlK0",
              },
              {
                label: "Calculus: Derivatives & Limits",
                url: "https://www.youtube.com/watch?v=WUvTyaaNkzM",
              },
            ].map((sample) => (
              <button
                key={sample.label}
                type="button"
                disabled={isLoading}
                onClick={() => setSampleVideo(sample.url)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-amber-100 hover:border-amber-300 text-slate-700 hover:text-amber-950 border border-slate-200 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message Box */}
        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-xs animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-bold">Error: </strong>
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Action Button */}
        <div>
          <button
            id="generate-notes-btn"
            type="button"
            onClick={handleGenerate}
            disabled={isLoading || !youtubeUrl.trim()}
            className="w-full py-3.5 px-6 rounded-xl font-extrabold text-sm text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer group"
          >
            {isLoading ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin text-slate-900" />
                <span className="animate-pulse">
                  {loadingStep === 1 && "Connecting to lecture..."}
                  {loadingStep === 2 && "Analyzing video topics & curriculum..."}
                  {loadingStep === 3 && "Synthesizing string, wedge, formula & topic boxes..."}
                  {loadingStep >= 4 && "Finalizing 10 MCQ quiz & master study notes..."}
                </span>
              </>
            ) : (
              <>
                <span>Generate Master Study Notes</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>

        {/* Educational Guarantee Note */}
        <p className="text-center text-[11px] text-slate-400 leading-normal">
          ⚡ Comprehensive dual-depth mode active: guaranteed coverage of all basic 101 concepts plus advanced mastery mechanics, formulas, 10 difficult MCQs, and visual timelines.
        </p>
      </div>
    </div>
  );
};
