import React from "react";
import { BookOpen, Sparkles, Youtube, Bookmark, GraduationCap, RotateCcw } from "lucide-react";
import { StudyNoteData } from "../types";
import mentorAvatarImg from "../assets/images/mentor_avatar_1790084207727.jpg";

interface NavbarProps {
  activeTab: "input" | "notes";
  setActiveTab: (tab: "input" | "notes") => void;
  currentNote: StudyNoteData | null;
  onOpenSavedModal: () => void;
  savedCount: number;
  onToggleTutor?: () => void;
  onStartFresh?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentNote,
  onOpenSavedModal,
  savedCount,
  onToggleTutor,
  onStartFresh,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-1 sm:gap-3">
          {/* Logo & Brand Title - Fully responsive & strictly contained */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-xs shrink-0 transition-transform duration-300 hover:rotate-6 hover:scale-105">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            </div>

            <div className="min-w-0 overflow-hidden">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  <span className="font-extrabold tracking-tight">Lectur</span>
                  <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">AI Study Notes</span>
                </h1>
                <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/60 shrink-0">
                  <Sparkles className="w-3 h-3 text-amber-600 animate-pulse" />
                  Gemini 3.8
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Mode Tabs - Compact and adaptive for phones */}
          <nav className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 p-0.5 sm:p-1 rounded-xl shrink-0">
            <button
              id="nav-input-btn"
              type="button"
              onClick={() => setActiveTab("input")}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                activeTab === "input"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Youtube className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span className="sm:hidden">Video</span>
              <span className="hidden sm:inline">YouTube Lecture</span>
            </button>

            <button
              id="nav-notes-btn"
              type="button"
              onClick={() => setActiveTab("notes")}
              disabled={!currentNote}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                !currentNote
                  ? "opacity-40 cursor-not-allowed text-slate-400"
                  : activeTab === "notes"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="sm:hidden">Notes</span>
              <span className="hidden sm:inline">Notes & Summary</span>
            </button>
          </nav>

          {/* Quick Actions: Fresh Start, Install App, AI Tutor, Saved Library, User Account */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Fresh Start button */}
            {onStartFresh && currentNote && (
              <button
                type="button"
                onClick={onStartFresh}
                className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1"
                title="Start fresh with a new lecture"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden md:inline">Start Fresh</span>
              </button>
            )}

            {onToggleTutor && (
              <button
                type="button"
                onClick={onToggleTutor}
                className="p-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors border border-slate-700/80 flex items-center gap-1.5"
                title="Open AI Socratic Mentor"
              >
                <img
                  src={mentorAvatarImg}
                  alt="Mentor"
                  referrerPolicy="no-referrer"
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover border border-amber-400 shrink-0"
                />
                <span className="hidden md:inline font-bold">AI Mentor</span>
              </button>
            )}

            {/* Saved Study Library */}
            <button
              id="open-library-btn"
              type="button"
              onClick={onOpenSavedModal}
              className="relative p-1.5 sm:p-2 rounded-xl text-slate-700 hover:text-slate-950 hover:bg-slate-100 border border-slate-200 transition-colors"
              title="Saved Study Library"
            >
              <Bookmark className="w-4 h-4" />
              {savedCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-slate-900 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {savedCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
