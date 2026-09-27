import { StudyNoteData } from "../types";

export interface SampleSource {
  id: string;
  type: "youtube" | "document";
  title: string;
  authorOrDomain: string;
  urlOrFilename: string;
  description: string;
  sampleContent?: string;
  youtubeId?: string;
}

// All pre-added samples have been removed per user instructions.
export const SAMPLE_SOURCES: SampleSource[] = [];
