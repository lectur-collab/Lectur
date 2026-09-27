import React, { useState, useEffect, useMemo } from "react";
import confetti from "canvas-confetti";
import {
  Layers,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Lightbulb,
  Award,
  Sparkles,
  Zap,
  CheckCircle2,
  Filter,
  Bookmark,
  BookOpen,
  HelpCircle,
  AlertTriangle,
  GitCompare,
  Cpu,
} from "lucide-react";
import { Flashcard, QuizQuestion, StudyNoteData } from "../types";
import { buildGroundedFlashcards } from "../lib/quizGenerator";

interface FlashcardsAndQuizProps {
  flashcards?: Flashcard[];
  quiz?: QuizQuestion[];
  topicTitle: string;
  note?: StudyNoteData;
  initialTab?: "flashcards" | "quiz";
  onSwitchTab?: (tab: "flashcards" | "quiz") => void;
}

export const FlashcardsAndQuiz: React.FC<FlashcardsAndQuizProps> = ({
  flashcards = [],
  topicTitle,
  note,
}) => {
  // Compute effective cards with grounded fallback
  const allCards = useMemo((): Flashcard[] => {
    if (note) {
      return buildGroundedFlashcards(note, flashcards);
    }
    return Array.isArray(flashcards) && flashcards.length > 0 ? flashcards : [];
  }, [note, flashcards]);

  // Filter state
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [highYieldOnly, setHighYieldOnly] = useState<boolean>(false);

  // Filtered cards list
  const filteredCards = useMemo(() => {
    return allCards.filter((card) => {
      if (selectedType !== "all" && card.type !== selectedType) return false;
      if (selectedDifficulty !== "all" && card.difficulty !== selectedDifficulty) return false;
      if (highYieldOnly && card.importance !== "High-Yield") return false;
      return true;
    });
  }, [allCards, selectedType, selectedDifficulty, highYieldOnly]);

  // Flashcards state
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [masteredCards, setMasteredCards] = useState<Record<string, boolean>>({});
  const [shuffledCards, setShuffledCards] = useState<Flashcard[]>(filteredCards);

  // Sync shuffledCards when filteredCards change
  useEffect(() => {
    setShuffledCards(filteredCards);
    setCardIndex(0);
    setIsFlipped(false);
    setShowHint(false);
  }, [filteredCards]);

  const totalCards = shuffledCards.length;
  const currentCard = totalCards > 0 ? shuffledCards[cardIndex % totalCards] : null;

  const handleNextCard = () => {
    if (totalCards === 0) return;
    setIsFlipped(false);
    setShowHint(false);
    setCardIndex((prev) => (prev + 1) % totalCards);
  };

  const handlePrevCard = () => {
    if (totalCards === 0) return;
    setIsFlipped(false);
    setShowHint(false);
    setCardIndex((prev) => (prev - 1 + totalCards) % totalCards);
  };

  const handleShuffle = () => {
    if (totalCards <= 1) return;
    const shuffled = [...shuffledCards].sort(() => Math.random() - 0.5);
    setShuffledCards(shuffled);
    setCardIndex(0);
    setIsFlipped(false);
    setShowHint(false);
  };

  const toggleMastered = (cardId: string) => {
    setMasteredCards((prev) => {
      const updated = { ...prev, [cardId]: !prev[cardId] };
      const masteredTotal = Object.values(updated).filter(Boolean).length;
      if (masteredTotal === totalCards && totalCards > 0) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
      return updated;
    });
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") handleNextCard();
      else if (e.key === "ArrowLeft") handlePrevCard();
      else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [totalCards]);

  const masteredCount = Object.values(masteredCards).filter(Boolean).length;

  const getTypeBadge = (type?: string) => {
    switch (type) {
      case "formula":
        return { label: "Formula", icon: Cpu, style: "bg-blue-100 text-blue-900 border-blue-300" };
      case "difference":
        return { label: "Difference", icon: GitCompare, style: "bg-purple-100 text-purple-900 border-purple-300" };
      case "diagram":
        return { label: "Diagram / FBD", icon: Layers, style: "bg-emerald-100 text-emerald-900 border-emerald-300" };
      case "mnemonic":
        return { label: "Mnemonic / Trick", icon: Sparkles, style: "bg-amber-100 text-amber-900 border-amber-300" };
      case "trap":
        return { label: "Conceptual Trap", icon: AlertTriangle, style: "bg-rose-100 text-rose-900 border-rose-300" };
      case "definition":
      default:
        return { label: "Definition", icon: BookOpen, style: "bg-indigo-100 text-indigo-900 border-indigo-300" };
    }
  };

  const getDifficultyBadge = (difficulty?: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-emerald-50 text-emerald-800 border-emerald-300";
      case "Hard":
        return "bg-rose-50 text-rose-800 border-rose-300";
      case "Medium":
      default:
        return "bg-amber-50 text-amber-800 border-amber-300";
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 pt-4 sm:pt-6 pb-28 sm:pb-24 space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
              <Zap className="w-4 h-4" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-editorial">
              Active Recall Flashcards
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Exam-oriented Question & Answer cards grounded in: <strong className="text-slate-700 font-semibold">{topicTitle}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
            {allCards.length} Total Cards
          </span>
          <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300">
            {masteredCount} Mastered
          </span>
        </div>
      </div>

      {/* Filter and Categorization Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-600 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            Filter:
          </span>

          {/* Difficulty Filter */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="all">All Difficulties</option>
            <option value="Easy">Easy (Definitions)</option>
            <option value="Medium">Medium (Application)</option>
            <option value="Hard">Hard (Traps & Mistakes)</option>
          </select>

          {/* High-Yield toggle */}
          <button
            type="button"
            onClick={() => setHighYieldOnly((prev) => !prev)}
            className={`px-3 py-1 rounded-lg font-bold transition-all border cursor-pointer ${
              highYieldOnly
                ? "bg-indigo-600 text-white border-indigo-700 shadow-2xs"
                : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
            }`}
          >
            ⭐ High-Yield Only
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500">
            Showing {filteredCards.length} of {allCards.length}
          </span>
          <button
            type="button"
            onClick={handleShuffle}
            className="px-2.5 py-1 rounded-lg font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 flex items-center gap-1 shadow-2xs transition-colors"
            title="Shuffle Flashcards"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Shuffle</span>
          </button>
        </div>
      </div>

      {/* FLASHCARDS VIEW */}
      {totalCards === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <Layers className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">No Flashcards Match Filters</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Try adjusting your filters above to see more active-recall cards.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedType("all");
              setSelectedDifficulty("all");
              setHighYieldOnly(false);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-700">
                Card {cardIndex + 1} of {totalCards}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                {masteredCount} of {allCards.length} Mastered
              </span>
            </div>

            {currentCard?.topicTag && (
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 truncate max-w-[200px] border border-slate-200">
                {currentCard.topicTag}
              </span>
            )}
          </div>

          {/* Flashcard Flip Stage */}
          {currentCard && (
            <div className="perspective-1000">
              <div
                onClick={() => setIsFlipped((prev) => !prev)}
                role="button"
                tabIndex={0}
                className={`relative w-full min-h-[320px] sm:min-h-[360px] rounded-3xl p-6 sm:p-10 cursor-pointer transition-all duration-300 transform select-none shadow-md border-2 flex flex-col justify-between ${
                  isFlipped
                    ? "bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white border-indigo-700"
                    : "bg-white text-slate-900 border-slate-200 hover:border-indigo-400"
                }`}
              >
                {/* Top Card Bar: Badges for Type, Difficulty, Importance */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Type Badge */}
                    {(() => {
                      const badge = getTypeBadge(currentCard.type);
                      const Icon = badge.icon;
                      return (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.style}`}>
                          <Icon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      );
                    })()}

                    {/* Difficulty Badge */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getDifficultyBadge(currentCard.difficulty)}`}>
                      {currentCard.difficulty || "Medium"}
                    </span>

                    {/* Importance Badge */}
                    {currentCard.importance === "High-Yield" ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1">
                        <span>⭐ High-Yield</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        {currentCard.importance || "Medium"}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMastered(currentCard.id);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                      masteredCards[currentCard.id]
                        ? "bg-emerald-500 text-white shadow-xs"
                        : isFlipped
                        ? "bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{masteredCards[currentCard.id] ? "Mastered" : "Mark Mastered"}</span>
                  </button>
                </div>

                {/* Central Card Content */}
                <div className="py-6 sm:py-8 flex flex-col items-center justify-center text-center">
                  {!isFlipped ? (
                    <div className="space-y-4 max-w-xl mx-auto">
                      <div className="inline-block px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-mono font-bold uppercase tracking-wider">
                        Question (Front)
                      </div>
                      <h3 className="text-lg sm:text-2xl font-bold font-editorial tracking-tight leading-relaxed text-slate-900">
                        {currentCard.question}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center justify-center gap-1 pt-2">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        Click anywhere or press Space to reveal answer
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-w-xl mx-auto animate-in fade-in zoom-in-95 duration-200 text-left w-full">
                      <div className="inline-block px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-mono font-bold uppercase tracking-wider">
                        Answer (Back)
                      </div>
                      {currentCard.type === "diagram" ? (
                        <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto whitespace-pre leading-relaxed">
                          {currentCard.answer}
                        </pre>
                      ) : (
                        <p className="text-base sm:text-lg font-medium leading-relaxed whitespace-pre-line text-indigo-50">
                          {currentCard.answer}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Card Controls (Hint toggle & flip cue) */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-dashed border-slate-200/20">
                  {currentCard.hint ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowHint((prev) => !prev);
                      }}
                      className={`text-xs flex items-center gap-1 font-semibold transition-colors ${
                        isFlipped
                          ? "text-indigo-300 hover:text-white"
                          : "text-slate-500 hover:text-indigo-600"
                      }`}
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                      <span>{showHint ? "Hide Hint" : "Need a Hint?"}</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  <span className={`text-[11px] font-mono ${isFlipped ? "text-slate-400" : "text-slate-400"}`}>
                    Press Space / Click to Flip
                  </span>
                </div>

                {/* Hint popout if opened */}
                {showHint && currentCard.hint && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-400/40 text-amber-200 text-xs text-left animate-in fade-in duration-150"
                  >
                    <strong>💡 Hint:</strong> {currentCard.hint}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Flashcard Prev / Next Controls */}
          <div className="flex items-center justify-between gap-3 p-2 sm:p-2.5 bg-slate-50/90 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={handlePrevCard}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-white text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="text-xs font-mono font-bold text-slate-700">
              {cardIndex + 1} / {totalCards}
            </span>

            <button
              type="button"
              onClick={handleNextCard}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <span>Next Card</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
