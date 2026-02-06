export type KnowledgeDocument = {
    id: string;
    title: string;
    content: string;
};

export const knowledgeBase: KnowledgeDocument[] = [
    {
        id: "quiz-model",
        title: "Quiz model",
        content:
            "Quizzes include a title, description, status (draft, published, unpublished), a creator user ID, and timestamps for creation and updates.",
    },
    {
        id: "question-model",
        title: "Question model",
        content:
            "Questions belong to a quiz and include a type, optional media, main text, and optional sub text. Question types include choice, true-false, fill-in, long-fill-in, matching, sequencing, numeric, likert, and performance.",
    },
    {
        id: "option-model",
        title: "Option model",
        content:
            "Options belong to a question and include a label. Answers also belong to questions to capture the correct response.",
    },
];
