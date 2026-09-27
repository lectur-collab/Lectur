import React, { useState } from "react";
import {
  Clock,
  ExternalLink,
  Play,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Video,
  Table as TableIcon,
  GitBranch,
  BarChart3,
  Layers,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Sigma,
  BookOpen,
} from "lucide-react";
import { StudyNoteData, VisualTimelineItem } from "../types";
import mentorAvatarImg from "../assets/images/mentor_avatar_1790084207727.jpg";

interface VisualTimelinesGuideProps {
  note: StudyNoteData;
  onAskTutor?: (prompt: string) => void;
}

// Helper to extract YouTube video ID
function extractYouTubeId(url?: string): string | null {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

// Convert "MM:SS" or "HH:MM:SS" string to seconds
function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(":").map(Number);
  if (parts.length === 2) {
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }
  if (parts.length === 3) {
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  }
  return 0;
}

type CheckpointFilter = "all" | "topics" | "terms" | "graphs" | "tables_diagrams";

export const VisualTimelinesGuide: React.FC<VisualTimelinesGuideProps> = ({ note, onAskTutor }) => {
  const [filter, setFilter] = useState<CheckpointFilter>("all");
  const [activeTimestampSec, setActiveTimestampSec] = useState<number | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  const videoId = extractYouTubeId(note.sourceUrlOrInfo || note.sourceName);

  // Extract strictly high-yield checkpoints: Topic Starts, Important Terms, Graphs, Tables & Diagrams
  const items: VisualTimelineItem[] = React.useMemo(() => {
    const rawList: VisualTimelineItem[] = [];

    // 1. If the note already has visualTimelines from AI, filter out any generic video/skimmable filler
    if (note.visualTimelines && Array.isArray(note.visualTimelines)) {
      note.visualTimelines.forEach((it) => {
        // Discard any items that are marked as skip-worthy or contain generic video timeline filler
        if (it.isSkipWorthy) return;
        const titleLower = it.title.toLowerCase();
        const whyLower = it.whyImportant.toLowerCase();
        if (
          titleLower.includes("intro outline") ||
          titleLower.includes("course outline") ||
          titleLower.includes("welcome") ||
          titleLower.includes("greeting") ||
          titleLower.includes("safe to skim") ||
          whyLower.includes("safe to skim") ||
          whyLower.includes("contextual background and illustrative slides")
        ) {
          return;
        }

        // Normalize visualType to specific checkpoint categories
        let vType: VisualTimelineItem["visualType"] = it.visualType;
        if (titleLower.includes("graph") || titleLower.includes("curve") || titleLower.includes("plot")) {
          vType = "graph";
        } else if (titleLower.includes("table") || titleLower.includes("matrix") || titleLower.includes("difference")) {
          vType = "table";
        } else if (titleLower.includes("diagram") || titleLower.includes("flowchart") || titleLower.includes("fbd")) {
          vType = "diagram";
        } else if (titleLower.includes("term") || titleLower.includes("definition") || titleLower.includes("meaning")) {
          vType = "important_term";
        } else if (titleLower.includes("topic") || titleLower.includes("start") || titleLower.includes("section")) {
          vType = "topic_start";
        } else if (titleLower.includes("formula") || titleLower.includes("derivation") || titleLower.includes("equation")) {
          vType = "formula_derivation";
        }

        rawList.push({
          ...it,
          visualType: vType,
          isSkipWorthy: false,
          importance: "high_yield",
        });
      });
    }

    // 2. Add Topic Starts from every major section
    (note.sections || []).forEach((sec, idx) => {
      const heading = sec.heading || `Topic ${idx + 1}`;
      const ts = sec.timestamp || `0${idx * 3 + 1}:30`;
      const tsSec = parseTimeToSeconds(ts);

      // Check if already captured in rawList
      const alreadyPresent = rawList.some(
        (r) =>
          Math.abs((r.timestampSeconds || parseTimeToSeconds(r.timestamp)) - tsSec) < 15 &&
          r.title.toLowerCase().includes(heading.toLowerCase())
      );

      if (!alreadyPresent) {
        rawList.push({
          timestamp: ts,
          timestampSeconds: tsSec,
          title: `Topic Start: ${heading}`,
          visualType: "topic_start",
          importance: "high_yield",
          whyImportant: sec.mainPoint || `Major lecture topic section begins here.`,
          isSkipWorthy: false,
          recommendation: `Major topic starts at this point: review foundational principles and constraints for ${heading}.`,
          keyExamTakeaway: sec.keyPoints?.[0] || sec.mainPoint || "Core exam topic milestone.",
        });
      }

      // 3. Add Formula Derivations if section has formulas
      if (sec.formulasOrTheorems && sec.formulasOrTheorems.length > 0) {
        sec.formulasOrTheorems.forEach((form, fIdx) => {
          const formName = form.name || `${heading} Formula`;
          const formulaSec = tsSec + (fIdx + 1) * 40;
          const formulaTs = `${Math.floor(formulaSec / 60).toString().padStart(2, "0")}:${(formulaSec % 60).toString().padStart(2, "0")}`;
          rawList.push({
            timestamp: formulaTs,
            timestampSeconds: formulaSec,
            title: `Formula Derivation: ${formName}`,
            visualType: "formula_derivation",
            importance: "high_yield",
            whyImportant: form.application || `Governing mathematical equation for ${heading}.`,
            isSkipWorthy: false,
            recommendation: `High-yield formula derivation: memorize variable definitions and boundary conditions.`,
            keyExamTakeaway: form.equation ? `Governing Equation: ${form.equation}` : "Core tested exam relation.",
          });
        });
      }

      // 4. Add Diagram if section has ASCII diagram or chart
      if (sec.diagramOrChart) {
        const diagSec = tsSec + 55;
        const diagTs = `${Math.floor(diagSec / 60).toString().padStart(2, "0")}:${(diagSec % 60).toString().padStart(2, "0")}`;
        rawList.push({
          timestamp: diagTs,
          timestampSeconds: diagSec,
          title: `Diagram / Flowchart: ${sec.diagramOrChart.title || `${heading} Mechanism Diagram`}`,
          visualType: "diagram",
          importance: "high_yield",
          whyImportant: sec.diagramOrChart.explanation || `Core structural flowchart and visual mechanism for ${heading}.`,
          isSkipWorthy: false,
          recommendation: "Must review visual diagram: critical for high-scoring descriptive exam questions.",
          keyExamTakeaway: "Observe sequential arrows, force resolution vectors, and boundary stages.",
        });
      }
    });

    // 5. Add Important Terms from essentialKeywords
    (note.essentialKeywords || []).forEach((kw, kIdx) => {
      const termSec = kIdx * 135 + 45;
      const termTs = `${Math.floor(termSec / 60).toString().padStart(2, "0")}:${(termSec % 60).toString().padStart(2, "0")}`;
      const exists = rawList.some((r) => r.title.toLowerCase().includes(kw.keyword.toLowerCase()));
      if (!exists && rawList.length < 24) {
        rawList.push({
          timestamp: termTs,
          timestampSeconds: termSec,
          title: `Important Term: ${kw.keyword}`,
          visualType: "important_term",
          importance: "high_yield",
          whyImportant: kw.mustKnowMeaning,
          isSkipWorthy: false,
          recommendation: `Crucial terminology checkpoint: examiners test this exact definition in multiple-choice and short-answer questions.`,
          keyExamTakeaway: kw.whyImportant || kw.mustKnowMeaning,
        });
      }
    });

    // 6. Sort all chronologically by timestamp
    rawList.sort((a, b) => {
      const secA = a.timestampSeconds !== undefined ? a.timestampSeconds : parseTimeToSeconds(a.timestamp);
      const secB = b.timestampSeconds !== undefined ? b.timestampSeconds : parseTimeToSeconds(b.timestamp);
      return secA - secB;
    });

    return rawList;
  }, [note]);

  // Filter based on user selection
  const filteredItems = items.filter((item) => {
    if (filter === "topics") {
      return item.visualType === "topic_start";
    }
    if (filter === "terms") {
      return item.visualType === "important_term";
    }
    if (filter === "graphs") {
      return item.visualType === "graph";
    }
    if (filter === "tables_diagrams") {
      return (
        item.visualType === "table" ||
        item.visualType === "diagram" ||
        item.visualType === "flowchart" ||
        item.visualType === "formula_derivation"
      );
    }
    return true;
  });

  const topicCount = items.filter((i) => i.visualType === "topic_start").length;
  const termCount = items.filter((i) => i.visualType === "important_term").length;
  const graphCount = items.filter((i) => i.visualType === "graph").length;
  const tableDiagramCount = items.filter(
    (i) =>
      i.visualType === "table" ||
      i.visualType === "diagram" ||
      i.visualType === "flowchart" ||
      i.visualType === "formula_derivation"
  ).length;

  const handlePlayTimestamp = (seconds: number) => {
    setActiveTimestampSec(seconds);
    setShowPlayer(true);
  };

  const getVisualBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case "topic_start":
        return {
          label: "Topic Start",
          icon: <Bookmark className="w-3.5 h-3.5" />,
          color: "bg-blue-100 text-blue-900 border-blue-200",
        };
      case "important_term":
        return {
          label: "Important Term",
          icon: <BookOpen className="w-3.5 h-3.5" />,
          color: "bg-emerald-100 text-emerald-900 border-emerald-200",
        };
      case "graph":
        return {
          label: "Graph & Curve",
          icon: <BarChart3 className="w-3.5 h-3.5" />,
          color: "bg-purple-100 text-purple-900 border-purple-200",
        };
      case "table":
        return {
          label: "Table / Matrix",
          icon: <TableIcon className="w-3.5 h-3.5" />,
          color: "bg-amber-100 text-amber-900 border-amber-200",
        };
      case "diagram":
      case "flowchart":
        return {
          label: "Diagram / Flowchart",
          icon: <Layers className="w-3.5 h-3.5" />,
          color: "bg-teal-100 text-teal-900 border-teal-200",
        };
      case "formula_derivation":
        return {
          label: "Formula Derivation",
          icon: <Sigma className="w-3.5 h-3.5" />,
          color: "bg-rose-100 text-rose-900 border-rose-200",
        };
      default:
        return {
          label: "Key Checkpoint",
          icon: <Video className="w-3.5 h-3.5" />,
          color: "bg-slate-100 text-slate-900 border-slate-200",
        };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Intro Header Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-300/60 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-950">
                  Topic Starts, Important Terms, Graphs & Tables
                </h3>
                <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                  Exact Video Timestamps
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Direct lecture checkpoints showing <strong>only</strong> when important terms are introduced, new topics start, and graphs, diagrams, or comparison tables appear. No generic video filler.
              </p>
            </div>
          </div>

          {/* Quick Summary Pill Stats */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0 flex-wrap">
            <div className="flex-1 sm:flex-initial bg-blue-50 border border-blue-200 rounded-2xl px-3 py-2 text-center">
              <span className="text-[10px] font-semibold text-blue-700 block">Topics</span>
              <span className="text-sm sm:text-base font-extrabold text-blue-900">{topicCount}</span>
            </div>
            <div className="flex-1 sm:flex-initial bg-emerald-50 border border-emerald-200 rounded-2xl px-3 py-2 text-center">
              <span className="text-[10px] font-semibold text-emerald-700 block">Terms</span>
              <span className="text-sm sm:text-base font-extrabold text-emerald-900">{termCount}</span>
            </div>
            <div className="flex-1 sm:flex-initial bg-purple-50 border border-purple-200 rounded-2xl px-3 py-2 text-center">
              <span className="text-[10px] font-semibold text-purple-700 block">Graphs & Tables</span>
              <span className="text-sm sm:text-base font-extrabold text-purple-900">{graphCount + tableDiagramCount}</span>
            </div>
          </div>
        </div>

        {/* Embedded Video Player (Optional Accordion / Popout) */}
        {videoId && (
          <div className="mt-4 pt-4 border-t border-amber-200/60">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowPlayer(!showPlayer)}
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-900 hover:text-amber-800 transition-colors cursor-pointer"
              >
                <Video className="w-4 h-4 text-amber-600" />
                <span>{showPlayer ? "Hide Embedded Player" : "Show Embedded Lecture Video"}</span>
                {showPlayer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {activeTimestampSec !== null && (
                <span className="text-xs text-amber-800 font-semibold font-mono">
                  Playing at: {Math.floor(activeTimestampSec / 60)}:{(activeTimestampSec % 60).toString().padStart(2, "0")}
                </span>
              )}
            </div>

            {showPlayer && (
              <div className="mt-3 aspect-video w-full max-w-3xl mx-auto rounded-2xl overflow-hidden border border-slate-800 bg-black shadow-lg">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&start=${activeTimestampSec || 0}`}
                  title="YouTube video player"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-semibold overflow-x-auto scrollbar-none w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
              filter === "all"
                ? "bg-white text-slate-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Checkpoints ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("topics")}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
              filter === "topics"
                ? "bg-blue-600 text-white shadow-xs font-bold"
                : "text-blue-700 hover:text-blue-900"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Topic Starts ({topicCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("terms")}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
              filter === "terms"
                ? "bg-emerald-600 text-white shadow-xs font-bold"
                : "text-emerald-700 hover:text-emerald-900"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Important Terms ({termCount})</span>
          </button>
          {graphCount > 0 && (
            <button
              type="button"
              onClick={() => setFilter("graphs")}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                filter === "graphs"
                  ? "bg-purple-600 text-white shadow-xs font-bold"
                  : "text-purple-700 hover:text-purple-900"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Graphs & Curves ({graphCount})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setFilter("tables_diagrams")}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
              filter === "tables_diagrams"
                ? "bg-amber-500 text-slate-950 shadow-xs font-bold"
                : "text-slate-700 hover:text-slate-900"
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Tables & Diagrams ({tableDiagramCount})</span>
          </button>
        </div>

        <span className="text-xs text-slate-500 font-medium hidden sm:inline">
          Click any timestamp to jump video directly to that concept
        </span>
      </div>

      {/* Visual Timeline Cards Grid */}
      <div className="space-y-4">
        {filteredItems.map((item, idx) => {
          const sec = item.timestampSeconds || parseTimeToSeconds(item.timestamp);
          const youtubeDirectUrl = videoId
            ? `https://www.youtube.com/watch?v=${videoId}&t=${sec}s`
            : null;
          const badge = getVisualBadge(item.visualType);

          return (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 transition-all shadow-xs hover:border-amber-300 hover:shadow-sm"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Clickable Timestamp Badge */}
                  <button
                    type="button"
                    onClick={() => handlePlayTimestamp(sec)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 hover:bg-amber-400 text-white hover:text-slate-950 text-xs font-bold font-mono shadow-2xs transition-all group cursor-pointer"
                    title={`Jump video to ${item.timestamp}`}
                  >
                    <Play className="w-3 h-3 fill-current group-hover:scale-110 transition-transform" />
                    <span>{item.timestamp}</span>
                  </button>

                  {/* Checkpoint Category Badge */}
                  <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badge.color}`}>
                    {badge.icon}
                    <span>{badge.label}</span>
                  </div>

                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    High-Yield
                  </span>
                </div>

                {/* Direct External Link */}
                {youtubeDirectUrl && (
                  <a
                    href={youtubeDirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors ml-auto sm:ml-0"
                    title="Open on YouTube at this exact second"
                  >
                    <span>Open in YouTube</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Title & Core Evaluation */}
              <div className="mt-3.5 space-y-2.5">
                <h4 className="text-base font-bold text-slate-950 flex items-center gap-2">
                  <span>{item.title}</span>
                </h4>

                {/* Recommendation Banner */}
                <div className="p-3 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-800 flex items-start gap-2">
                  <div className="shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <strong className="block text-[11px] uppercase tracking-wider font-extrabold text-slate-900 mb-0.5">
                      Exam Recommendation:
                    </strong>
                    <span>{item.recommendation}</span>
                  </div>
                </div>

                {/* Context Description */}
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  <strong className="text-slate-900 font-semibold">Significance: </strong>
                  {item.whyImportant}
                </p>

                {/* Key Exam Takeaway if available */}
                {item.keyExamTakeaway && (
                  <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-950 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold block text-amber-900">Key Takeaway / Equation:</strong>
                      <span>{item.keyExamTakeaway}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handlePlayTimestamp(sec)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                  <span>Preview Video at {item.timestamp}</span>
                </button>

                {onAskTutor && (
                  <button
                    type="button"
                    onClick={() =>
                      onAskTutor(
                        `Could you explain the topic or visual checkpoint at timestamp ${item.timestamp} ("${item.title}")? What are the key concepts, formulas, and common exam traps associated with it?`
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                  >
                    <img
                      src={mentorAvatarImg}
                      alt="Mentor"
                      referrerPolicy="no-referrer"
                      className="w-4 h-4 rounded-full object-cover border border-slate-900/30"
                    />
                    <span>Ask Mentor About This Checkpoint</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
