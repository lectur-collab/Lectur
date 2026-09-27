export type NoteStyle =
  | 'bullet_points'
  | 'cornell'
  | 'deep_study_guide'
  | 'executive_summary'
  | 'mindmap_outline'
  | 'cheat_sheet';

export type AcademicLevel =
  | 'high_school'
  | 'undergraduate'
  | 'competitive_exam'
  | 'graduate';

export type LanguageTone =
  | 'standard'
  | 'peer_friendly'
  | 'hindi';

export interface ConceptItem {
  term: string;
  definition: string;
  formulaOrDetail?: string;
  whyItMatters: string;
  analogy: string;
}

export interface FormulaItem {
  name: string;
  equation?: string;
  formula?: string;
  variables?: string;
  application?: string;
  explanation?: string;
}

export interface DiagramStep {
  stepNumber: number;
  title: string;
  description: string;
}

export interface DiagramOrChart {
  title: string;
  type?: string;
  asciiArt?: string;
  explanation?: string;
  steps?: DiagramStep[];
}

export interface FoundationalBasics {
  prerequisites: string[];
  coreGlossary: { term: string; simpleExplanation: string }[];
  foundationalPrinciples: string[];
}

export interface AdvancedTopicDetail {
  topic: string;
  deepMechanism: string;
  practicalOrExamApplication: string;
}

export interface AdvancedMastery {
  deepMechanisms: string[];
  edgeCasesAndNuances: string[];
  topicBreakdowns?: AdvancedTopicDetail[];
}

export interface TeacherSpokenLine {
  spokenLine: string;
  context: string;
  examSignificance: string;
}

export interface EssentialKeyword {
  keyword: string;
  mustKnowMeaning: string;
  whyImportant?: string;
}

export interface StudySection {
  heading: string;
  timestamp?: string;
  difficulty?: 'foundational_basic' | 'core_concept' | 'advanced_mastery';
  mainPoint?: string;
  content: string;
  simplifiedContent: string;
  foundationalIntro?: string;
  advancedDeepDive?: string;
  advancedMechanisms?: string[];
  keyPoints: string[];
  concepts: ConceptItem[];
  formulasOrTheorems?: FormulaItem[];
  diagramOrChart?: DiagramOrChart;
  teachersSpokenTips?: string[];
}

export interface VisualTimelineItem {
  timestamp: string; // e.g. "04:15"
  timestampSeconds?: number; // e.g. 255
  title: string;
  visualType: 'topic_start' | 'important_term' | 'graph' | 'table' | 'diagram' | 'flowchart' | 'formula_derivation' | 'slide';
  importance: 'high_yield' | 'essential' | 'optional_skim';
  whyImportant: string;
  isSkipWorthy: boolean;
  recommendation: string;
  keyExamTakeaway?: string;
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  hint?: string;
  type?: 'definition' | 'formula' | 'difference' | 'diagram' | 'mnemonic' | 'trap';
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  importance?: 'High-Yield' | 'Medium' | 'Low';
  topicTag?: string;
}

export interface QuizQuestion {
  id: string;
  problemNumber?: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface StudyNoteData {
  id: string;
  title: string;
  sourceType: 'youtube' | 'pdf' | 'document';
  sourceName: string;
  sourceUrlOrInfo?: string;
  style: NoteStyle;
  academicLevel: AcademicLevel;
  languageTone?: LanguageTone;
  executiveSummary: string;
  keyTakeaways: string[];
  sections: StudySection[];
  foundationalBasics?: FoundationalBasics;
  advancedMastery?: AdvancedMastery;
  visualTimelines?: VisualTimelineItem[];
  formulasOrTheorems?: FormulaItem[];
  diagramOrChart?: DiagramOrChart;
  flashcards?: Flashcard[];
  quiz?: QuizQuestion[];
  examTips: string[];
  teachersSpokenGoldenLines?: TeacherSpokenLine[];
  essentialKeywords?: EssentialKeyword[];
  rawSourceSnippet?: string;
  hasTranscript?: boolean;
  transcriptNote?: string;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  conceptReference?: string;
  isClarification?: boolean;
}

export interface ConceptClarification {
  term: string;
  simpleExplanation: string;
  technicalBreakdown: string;
  realWorldAnalogy: string;
  commonMistakes: string[];
  practiceQuestion: string;
}
