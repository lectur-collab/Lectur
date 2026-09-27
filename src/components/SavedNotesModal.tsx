import React, { useState } from "react";
import {
  X,
  Bookmark,
  Search,
  Trash2,
  Youtube,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { StudyNoteData } from "../types";

interface SavedNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedNotes: StudyNoteData[];
  onSelectNote: (note: StudyNoteData) => void;
  onDeleteNote: (id: string) => void;
}

export const SavedNotesModal: React.FC<SavedNotesModalProps> = ({
  isOpen,
  onClose,
  savedNotes,
  onSelectNote,
  onDeleteNote,
}) => {
  const [search, setSearch] = useState("");

  if (!isOpen) return null;

  const filtered = savedNotes.filter((n) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.sourceName.toLowerCase().includes(q) ||
      n.executiveSummary.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-2 rounded-xl bg-amber-400 text-slate-950 shrink-0 shadow-xs">
              <Bookmark className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-white tracking-tight truncate">
                Saved Study Sessions
              </h3>
              <p className="text-xs text-slate-400 truncate">
                {savedNotes.length} saved study guides
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 ml-2"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by topic, keyword, or lecture title..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 shadow-2xs"
            />
          </div>
        </div>

        {/* Saved List */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3 overscroll-contain">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No saved study notes found.</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Paste any YouTube lecture video to generate notes, then click the 'Save' button to bookmark it here.
              </p>
            </div>
          ) : (
            filtered.map((note) => (
              <div
                key={note.id}
                className="p-4 bg-slate-50 hover:bg-amber-50/30 rounded-2xl border border-slate-200 hover:border-amber-300/80 transition-all flex flex-col gap-2.5 group"
              >
                {/* Card Top: Source badge, date, and delete */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-red-100/80 text-red-700 border border-red-200">
                      <Youtube className="w-3 h-3 text-red-600" />
                      <span>YouTube Lecture</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(note.createdAt).toLocaleDateString(undefined, {
                        month: "numeric",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNote(note.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    title="Delete saved note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Card Title & Topics - Clean wrapping without clipping */}
                <div
                  onClick={() => {
                    onSelectNote(note);
                    onClose();
                  }}
                  className="cursor-pointer min-w-0"
                >
                  <h4 className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-amber-900 leading-snug line-clamp-2 break-words">
                    {note.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-normal">
                    <strong className="text-slate-700">{note.sections.length} topic sections</strong>
                    {note.formulasOrTheorems && note.formulasOrTheorems.length > 0
                      ? ` • ${note.formulasOrTheorems.length} formulas`
                      : ""}
                    {note.diagramOrChart ? " • 1 diagram" : ""}
                    {note.examTips && note.examTips.length > 0 ? ` • ${note.examTips.length} exam tips` : ""}
                  </p>
                </div>

                {/* Card Action */}
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectNote(note);
                      onClose();
                    }}
                    className="w-full sm:w-auto px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <span>Open Study Notes</span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
