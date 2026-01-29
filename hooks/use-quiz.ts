'use client'

import { QuizContext } from '@/contexts/quiz-context';
import { useContext } from 'react';

export const useQuiz = () => {
    const context = useContext(QuizContext);
    if (!context) {
        throw new Error('useQuiz must be used within QuizProvider');
    }
    return context;
};
