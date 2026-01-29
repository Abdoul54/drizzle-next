'use client'

import { Quiz } from '@/types';
import { createContext } from 'react';

type QuizContextType = {
    quiz: Quiz | null;
    setQuiz: React.Dispatch<React.SetStateAction<Quiz | null>>;
};

export const QuizContext = createContext<QuizContextType | undefined>(undefined);

