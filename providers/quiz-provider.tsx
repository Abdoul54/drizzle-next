'use client'

import { QuizContext } from "@/contexts/quiz-context";
import { Quiz } from "@/types";
import { ReactNode, useState } from "react";


type Props = {
    children: ReactNode;
};

export function QuizProvider({ children }: Props) {
    const [quiz, setQuiz] = useState<Quiz | null>(null);

    return (
        <QuizContext.Provider value={{ quiz, setQuiz }}>
            {children}
        </QuizContext.Provider>
    );
}
