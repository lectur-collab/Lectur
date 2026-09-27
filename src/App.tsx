/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { SourceInput } from "./components/SourceInput";
import { InteractiveSummary } from "./components/InteractiveSummary";
import { ConceptClarifierModal } from "./components/ConceptClarifierModal";
import { SavedNotesModal } from "./components/SavedNotesModal";
import { FloatingAITutor } from "./components/FloatingAITutor";
import { StudyNoteData, ConceptItem } from "./types";

export default function App() {
  // Active Navigation Tab: starts on "input" so user directly pastes video link
  const [activeTab, setActiveTab] = useState<"input" | "notes">("input");

  // Current active study note session (starts empty so every user starts freshly)
  const [currentNote, setCurrentNote] = useState<StudyNoteData | null>(null);

  // Global loading state for source processing
  const [isLoading, setIsLoading] = useState(false);

  // Floating AI Tutor state - always connected to current note knowledge
  const [isFloatingTutorOpen, setIsFloatingTutorOpen] = useState(false);
  const [floatingTutorPrompt, setFloatingTutorPrompt] = useState<string | null>(null);

  // Concept Clarification Modal state
  const [selectedConcept, setSelectedConcept] = useState<ConceptItem | null>(null);
  const [conceptContextText, setConceptContextText] = useState("");

  // Saved Notes Library state (persisted in localStorage for fast, private offline-first use)
  const [savedNotes, setSavedNotes] = useState<StudyNoteData[]>(() => {
    try {
      const stored =
        localStorage.getItem("study_notes_lib") ||
        localStorage.getItem("guest_study_notes_lib");
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.warn("Error reading saved notes from localStorage", e);
    }
    return [];
  });

  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);

  // Save notes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("study_notes_lib", JSON.stringify(savedNotes));
      localStorage.setItem("guest_study_notes_lib", JSON.stringify(savedNotes));
    } catch (e) {
      console.warn("Failed to save notes to localStorage", e);
    }
  }, [savedNotes]);

  // Handle when notes are generated from YouTube or Document
  const handleNotesGenerated = async (newNote: StudyNoteData) => {
    setCurrentNote(newNote);
    setActiveTab("notes");

    // Automatically save to personal notes collection
    setSavedNotes((prev) => {
      const exists = prev.some((n) => n.id === newNote.id);
      return exists ? prev : [newNote, ...prev];
    });
  };

  // Open Concept Clarifier Modal
  const handleConceptClick = (concept: ConceptItem, contextText: string) => {
    setSelectedConcept(concept);
    setConceptContextText(contextText);
  };

  // Toggle Save Note to Library
  const handleSaveToLibrary = async (note: StudyNoteData) => {
    const exists = savedNotes.some((n) => n.id === note.id);
    if (exists) {
      // Remove
      setSavedNotes((prev) => prev.filter((n) => n.id !== note.id));
    } else {
      // Add
      setSavedNotes((prev) => [note, ...prev]);
    }
  };

  // Delete Note from Library
  const handleDeleteSavedNote = async (id: string) => {
    setSavedNotes((prev) => prev.filter((n) => n.id !== id));
  };

  // Start fresh with a clean session
  const handleStartFresh = () => {
    setCurrentNote(null);
    setActiveTab("input");
  };

  const isCurrentNoteSaved = currentNote
    ? savedNotes.some((n) => n.id === currentNote.id)
    : false;

  // Trigger floating AI tutor with a specific question prompt
  const handleAskTutor = (prompt: string) => {
    setFloatingTutorPrompt(prompt);
    setIsFloatingTutorOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-amber-200 selection:text-amber-900 relative">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentNote={currentNote}
        onOpenSavedModal={() => setIsSavedModalOpen(true)}
        savedCount={savedNotes.length}
        onToggleTutor={() => setIsFloatingTutorOpen((prev) => !prev)}
        onStartFresh={handleStartFresh}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {activeTab === "input" && (
          <SourceInput
            onNotesGenerated={handleNotesGenerated}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )}

        {activeTab === "notes" && currentNote && (
          <InteractiveSummary
            note={currentNote}
            onConceptClick={handleConceptClick}
            onSaveToLibrary={handleSaveToLibrary}
            isSaved={isCurrentNoteSaved}
            onAskTutor={handleAskTutor}
          />
        )}
      </main>

      {/* Floating AI Tutor - Always connected to the active video knowledge */}
      <FloatingAITutor
        note={currentNote}
        isOpen={isFloatingTutorOpen}
        onToggle={() => setIsFloatingTutorOpen((prev) => !prev)}
        externalPrompt={floatingTutorPrompt}
        onClearExternalPrompt={() => setFloatingTutorPrompt(null)}
      />

      {/* Concept Deep-Dive Clarification Modal */}
      <ConceptClarifierModal
        concept={selectedConcept}
        contextText={conceptContextText}
        academicLevel={currentNote?.academicLevel || "undergraduate"}
        onClose={() => setSelectedConcept(null)}
      />

      {/* Saved Study Library Modal */}
      <SavedNotesModal
        isOpen={isSavedModalOpen}
        onClose={() => setIsSavedModalOpen(false)}
        savedNotes={savedNotes}
        onSelectNote={(note) => {
          setCurrentNote(note);
          setActiveTab("notes");
        }}
        onDeleteNote={handleDeleteSavedNote}
      />
    </div>
  );
}
