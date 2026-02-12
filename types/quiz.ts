// types/quiz.ts

// =============================================
// LOCALIZATION
// =============================================

/** A record keyed by language code (e.g. "en", "ar", "fr") */
export type LocalizedString = Record<string, string>;

// =============================================
// QUESTION TYPES
// =============================================

export type QuestionType = "single-choice" | "multiple-choice" | "true-false";

/** Base fields shared by every question */
interface QuestionBase {
    type: QuestionType;
    text: LocalizedString;
    subText?: LocalizedString;
    media?: string;
}

/** Single-choice: radio select, exactly 1 correct answer */
export interface SingleChoiceQuestion extends QuestionBase {
    type: "single-choice";
    options: LocalizedString[];
    correctOptionIndexes: [number]; // tuple – exactly 1
}

/** Multiple-choice: checkbox select, 1+ correct answers */
export interface MultipleChoiceQuestion extends QuestionBase {
    type: "multiple-choice";
    options: LocalizedString[];
    correctOptionIndexes: number[]; // 1 or more
}

/** True / False */
export interface TrueFalseQuestion extends QuestionBase {
    type: "true-false";
    options: [LocalizedString, LocalizedString]; // [trueLabel, falseLabel]
    correctOptionIndexes: [0] | [1]; // index 0 = true, 1 = false
}

/** Union of all supported question shapes */
export type Question =
    | SingleChoiceQuestion
    | MultipleChoiceQuestion
    | TrueFalseQuestion;

/** The draft stored in conversation.draft JSONB */
export interface QuizDraft {
    questions: Question[];
}