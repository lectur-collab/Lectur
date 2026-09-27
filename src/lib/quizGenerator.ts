import { Flashcard, QuizQuestion, StudyNoteData } from "../types";

/**
 * MCQ / Quiz feature has been removed.
 * Returns empty array for backward compatibility.
 */
export function buildGroundedQuiz(_note: StudyNoteData, _existingQuiz?: QuizQuestion[]): QuizQuestion[] {
  return [];
}

/**
 * Converts any casual or regional Hinglish phrases into clean, articulate academic English
 * (Only applied when Standard Academic tone is selected).
 */
export function cleanHinglishToEnglish(text: string): string {
  if (!text) return "";
  let s = text;
  s = s.replace(/yahan students aksar confuse hote hain,?\s*dhyaan rahe ki/gi, "Common Exam Trap: Note that");
  s = s.replace(/yahan students confuse hote hain,?\s*dhyaan rahe ki/gi, "Common Student Misconception: Note that");
  s = s.replace(/yahan students aksar confuse hote hain/gi, "Students frequently confuse this point:");
  s = s.replace(/yahan students confuse hote hain/gi, "Students commonly confuse this concept:");
  s = s.replace(/dhyaan rahe ki|dhyan rahe ki/gi, "Keep in mind that");
  s = s.replace(/dhyan rakhein ki|dhyaan rakhein ki/gi, "Remember that");
  s = s.replace(/bhai is concept me[n]?/gi, "In this concept,");
  s = s.replace(/simple words me[n]?:/gi, "In simple terms:");
  s = s.replace(/trick yaad rakhna:/gi, "Key exam trick:");
  s = s.replace(/notice karo ki/gi, "Notice that");
  s = s.replace(/aksar exam me[n]? pucha jata hai/gi, "Frequently tested in exams:");
  s = s.replace(/isko yaad rakhna/gi, "remember that");
  s = s.replace(/ye passive resistance nahi hai/gi, "this is not passive resistance");
  return s.trim();
}

/**
 * Expert Flashcard Generator:
 * Generates active-recall flashcards grounded strictly in this lecture transcript.
 * Rules:
 * 1. Format: Question (front) formatted as "Que. : ...", Answer (back) as "Ans. : ...".
 * 2. Tone fidelity:
 *    - If Dost Tone (peer_friendly): Natural Hinglish + friendly study buddy language delivering the exact same rigorous information.
 *    - If Standard Academic (standard): 100% fluent, clear, academic English.
 * 3. Answers: Thorough, well-explained, and exam-oriented (not overly short or abrupt).
 * 4. Types: definition, formula, diagram, mnemonic, trap.
 * 5. Difficulty: Easy (definitions), Medium (application/derivations), Hard (traps/mistakes).
 * 6. Tags: High-Yield, Medium, Low + topicTag.
 */
export function buildGroundedFlashcards(note: StudyNoteData, existingCards?: Flashcard[]): Flashcard[] {
  const result: Flashcard[] = [];
  const existing = Array.isArray(existingCards) ? existingCards : [];
  const isDostTone = note.languageTone === "peer_friendly";

  // Normalize and clean existing cards
  for (const c of existing) {
    if (c && c.question && c.answer) {
      let q = isDostTone ? c.question : cleanHinglishToEnglish(c.question);
      if (!q.startsWith("Que.") && !q.startsWith("Que :") && !q.startsWith("Q:")) {
        q = `Que. : ${q.replace(/^Q:\s*/i, "").replace(/^Question:\s*/i, "")}`;
      }

      let a = isDostTone ? c.answer : cleanHinglishToEnglish(c.answer);
      if (!a.startsWith("Ans.") && !a.startsWith("Ans :") && !a.startsWith("A:")) {
        a = `Ans. : ${a.replace(/^A:\s*/i, "").replace(/^Answer:\s*/i, "")}`;
      }

      // Check if answer is too brief or abrupt and enrich it for clarity
      const rawAns = a.replace(/^Ans\.\s*:\s*/i, "").trim();
      if (rawAns.length < 65) {
        a = isDostTone
          ? `Ans. : ${rawAns} Dost, ye concept exam ke liye kaafi important hai, marks secure karne ke liye isko ache se prepare karna.`
          : `Ans. : ${rawAns} This represents a core exam concept that students must understand clearly to avoid standard examination pitfalls.`;
      }

      result.push({
        ...c,
        question: q,
        answer: a,
        type: c.type || "definition",
        difficulty: c.difficulty || "Medium",
        importance: c.importance || "High-Yield",
        topicTag: c.topicTag || note.title,
        hint: c.hint ? (isDostTone ? c.hint : cleanHinglishToEnglish(c.hint)) : undefined,
      });
      if (result.length >= 24) break;
    }
  }

  if (result.length >= 12) {
    return result;
  }

  const sections = Array.isArray(note.sections) ? note.sections : [];
  const formulas = Array.isArray(note.formulasOrTheorems) ? note.formulasOrTheorems : [];
  const keywords = Array.isArray(note.essentialKeywords) ? note.essentialKeywords : [];
  const teacherLines = Array.isArray(note.teachersSpokenGoldenLines) ? note.teachersSpokenGoldenLines : [];

  // 1. Definition cards (Easy / High-Yield) from keywords & definitions
  for (const k of keywords) {
    if (result.length >= 24) break;
    const rawMeaning = k.mustKnowMeaning || "";
    const meaning = isDostTone ? rawMeaning : cleanHinglishToEnglish(rawMeaning);

    const fullAnswer = isDostTone
      ? (meaning
          ? `Ans. : ${meaning}. Dost, exam me is term ka clear definition likhne par direct marks milte hain.`
          : `Ans. : Lecture ka essential academic concept jo standard exams me baar-baar test hota hai.`)
      : (meaning
          ? `Ans. : ${meaning}. In standard exams, this term is defined precisely to describe the governing phenomenon without ambiguity.`
          : `Ans. : Fundamental academic term tested under standard examination conditions to assess conceptual understanding.`);

    result.push({
      id: `fc_def_${result.length + 1}`,
      question: isDostTone
        ? `Que. : "${k.keyword}" ka matlab aur definition kya hai?`
        : `Que. : What is the formal definition of "${k.keyword}" in this lecture?`,
      answer: fullAnswer,
      type: "definition",
      difficulty: "Easy",
      importance: "High-Yield",
      topicTag: note.title,
      hint: isDostTone ? "Lecture ke real-world analogy ko yaad karo." : "Recall the intuitive real-world analogy and core characteristics discussed in the lecture.",
    });
  }

  // 2. Formula cards (Medium / High-Yield) from formulas & equations
  for (const f of formulas) {
    if (result.length >= 24) break;
    const fName = f.name || "Governing Relation";
    const eq = f.equation || f.formula || "Key Equation";
    const vars = f.variables ? ` Variables: ${f.variables}.` : "";
    const rawApp = f.application ? ` Application: ${f.application}.` : "";
    const app = isDostTone ? rawApp : cleanHinglishToEnglish(rawApp);

    result.push({
      id: `fc_formula_${result.length + 1}`,
      question: isDostTone
        ? `Que. : "${fName}" ka formula aur application kya hai?`
        : `Que. : What is the governing formula for "${fName}" and how is it applied?`,
      answer: isDostTone
        ? `Ans. : Formula: ${eq}.${vars}${app} Numericals solve karte waqt hamesha standard SI units me convert karna mat bhoolna!`
        : `Ans. : Formula: ${eq}.${vars}${app} In numerical problems, ensure all parameters are converted to consistent SI units before evaluating.`,
      type: "formula",
      difficulty: "Medium",
      importance: "High-Yield",
      topicTag: fName,
      hint: f.application
        ? (isDostTone ? f.application : cleanHinglishToEnglish(f.application))
        : (isDostTone ? "SI units aur boundary values ko check karo." : "Recall the SI units and boundary constraints."),
    });
  }

  // 3. Section Mechanism & Diagram cards
  for (let i = 0; i < sections.length; i++) {
    if (result.length >= 24) break;
    const sec = sections[i];
    const heading = sec.heading || `Topic ${i + 1}`;
    const rawMainPt = sec.mainPoint || sec.simplifiedContent || "Fundamental governing law.";
    const mainPt = isDostTone ? rawMainPt : cleanHinglishToEnglish(rawMainPt);
    const rawDeep = sec.advancedDeepDive || (sec.content ? sec.content.slice(0, 180) : "");
    const deepExplanation = isDostTone ? rawDeep : cleanHinglishToEnglish(rawDeep);

    // Core rule definition
    result.push({
      id: `fc_sec_${result.length + 1}`,
      question: isDostTone
        ? `Que. : "${heading}" ka central mechanism aur rule kya hai?`
        : `Que. : What is the central mechanism and governing rule of "${heading}"?`,
      answer: isDostTone
        ? `Ans. : ${mainPt} ${deepExplanation ? `Deep mechanism: ${deepExplanation}` : "Ye concept system ke equilibrium ko govern karta hai."}`
        : `Ans. : ${mainPt} ${deepExplanation ? `Furthermore, ${deepExplanation}` : "This governing principle dictates system behavior and boundary equilibrium."}`,
      type: "definition",
      difficulty: "Easy",
      importance: "High-Yield",
      topicTag: heading,
      hint: sec.teachersSpokenTips?.[0]
        ? (isDostTone ? sec.teachersSpokenTips[0] : cleanHinglishToEnglish(sec.teachersSpokenTips[0]))
        : (isDostTone ? "Core boundary setup ko recall karo." : "Remember the fundamental boundary condition."),
    });

    // Diagram card if ASCII chart exists
    if (sec.diagramOrChart?.asciiArt && result.length < 24) {
      result.push({
        id: `fc_diag_${result.length + 1}`,
        question: isDostTone
          ? `Que. : "${heading}" ka schematic layout ya flowchart kaisa hai?`
          : `Que. : How is the mechanism or pathway of "${heading}" schematically structured?`,
        answer: isDostTone
          ? `Ans. : Process Layout:\n${sec.diagramOrChart.asciiArt.trim()}\n\nDost, arrows aur stages ko sequentially follow karna!`
          : `Ans. : Structural Process Layout:\n${sec.diagramOrChart.asciiArt.trim()}\n\nKey takeaway: Follow each sequential stage in order, ensuring boundary inputs match governing equations.`,
        type: "diagram",
        difficulty: "Medium",
        importance: "Medium",
        topicTag: heading,
        hint: sec.diagramOrChart.explanation
          ? (isDostTone ? sec.diagramOrChart.explanation : cleanHinglishToEnglish(sec.diagramOrChart.explanation))
          : "Follow the directional arrows from start to finish.",
      });
    }

    // Conceptual trap card if teacher tip exists
    if (sec.teachersSpokenTips?.[0] && result.length < 24) {
      const rawTip = sec.teachersSpokenTips[0];
      const tipEng = isDostTone ? rawTip : cleanHinglishToEnglish(rawTip);
      result.push({
        id: `fc_trap_${result.length + 1}`,
        question: isDostTone
          ? `Que. : "${heading}" me students aksar kahan phas jaate hain (Common Trap)?`
          : `Que. : What is the most common exam trap or conceptual error in "${heading}"?`,
        answer: isDostTone
          ? `Ans. : Exam Trap Alert: ${tipEng}. Numerical solve karte waqt coordinate signs ko cross-check karna bilkul mat bhoolna!`
          : `Ans. : Common Exam Trap: ${tipEng}. To avoid losing marks, always double-check sign conventions and reference frames before finalizing the solution.`,
        type: "trap",
        difficulty: "Hard",
        importance: "High-Yield",
        topicTag: heading,
        hint: isDostTone ? "Signs aur reference frame ko cross-check karo." : "Pay attention to coordinate directions and reference frame constraints.",
      });
    }
  }

  // 4. Mnemonics / Teacher spoken golden lines
  for (const line of teacherLines) {
    if (result.length >= 24) break;
    const spoken = isDostTone ? line.spokenLine : cleanHinglishToEnglish(line.spokenLine);
    const examSignif = isDostTone ? (line.examSignificance || "Exam trick") : cleanHinglishToEnglish(line.examSignificance || "High-frequency exam trigger");

    result.push({
      id: `fc_mnemonic_${result.length + 1}`,
      question: isDostTone
        ? `Que. : "${line.context || note.title}" ke liye teacher ka verbal golden tip kya tha?`
        : `Que. : What crucial shortcut or educator memory cue applies to "${line.context || note.title}"?`,
      answer: isDostTone
        ? `Ans. : Teacher Golden Line: "${spoken}". Exam significance: ${examSignif}.`
        : `Ans. : Educator Insight: "${spoken}". Exam significance: ${examSignif}.`,
      type: "mnemonic",
      difficulty: "Medium",
      importance: "High-Yield",
      topicTag: line.context || note.title,
      hint: isDostTone ? "Teacher ke verbal alert ko dhyan me rakho." : "Remember the teacher's verbal warning stated aloud during the lecture.",
    });
  }

  return result;
}
