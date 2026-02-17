'use client';


import { FillInBlank } from '@/components/questions/fill-in-blank';
import { MultipleChoice } from '@/components/questions/multiple-choice';
import { QuestionCard } from '@/components/questions/question-card';
import { ShortAnswer } from '@/components/questions/short-answer';
import { TrueFalse } from '@/components/questions/true-false';
import { Button } from '@/components/ui/button';
import { useQuiz } from '@/hooks/queries/use-quiz';

import { useParams } from 'next/navigation';
import { useState } from 'react';

export type Question =
    | {
        id: string
        type: "multiple_choice"
        question: string
        options: string[]
    }
    | {
        id: string
        type: "true_false"
        question: string
    }
    | {
        id: string
        type: "short_answer"
        question: string
    }
    | {
        id: string
        type: "fill_in_blank"
        sentence: string
    }



function QuestionRenderer({
    question,
    value,
    onChange,
}: {
    question: Question
    value: any
    onChange: (v: any) => void
}) {
    switch (question.type) {
        case "multiple_choice":
            return (
                <MultipleChoice
                    question={question.question}
                    options={question.options}
                    value={value}
                    onChange={onChange}
                />
            )

        case "true_false":
            return (
                <TrueFalse
                    question={question.question}
                    value={value}
                    onChange={onChange}
                />
            )

        case "short_answer":
            return (
                <ShortAnswer
                    question={question.question}
                    value={value}
                    onChange={onChange}
                />
            )

        case "fill_in_blank":
            return (
                <FillInBlank
                    sentence={question.sentence}
                    value={value}
                    onChange={onChange}
                />
            )

        default:
            return null
    }
}

export default function Page() {
    const { id } = useParams();

    const { data: quiz, isLoading: isQuizLoading, error: quizError } = useQuiz(id as string)


    const correctAnswers: Record<string, any> = {
        q1: "Bern",
        q2: false,
        q3: "Facebook",
        q4: "Facebook",
    }

    const questions: Question[] = [
        {
            id: "q1",
            type: "multiple_choice",
            question: "What is the capital of Switzerland?",
            options: ["Berlin", "Bern", "Geneva", "Zurich"],
        },
        {
            id: "q2",
            type: "true_false",
            question: "React is a backend framework.",
        },
        {
            id: "q3",
            type: "short_answer",
            question: "Who created React?",
        },
        {
            id: "q4",
            type: "fill_in_blank",
            sentence: "React is maintained by ___.",
        },
    ]


    const [answers, setAnswers] = useState<Record<string, any>>({})
    const [score, setScore] = useState(0)
    const [showScore, setShowScore] = useState(false)


    const checkResult = () => {
        const correctCount = questions.reduce((acc, q) => {
            const userAnswer = answers[q.id]
            const correctAnswer = correctAnswers[q.id]

            if (typeof userAnswer === "string") {
                return acc + (userAnswer.trim().toLowerCase() === correctAnswer.toLowerCase() ? 1 : 0)
            }

            return acc + (userAnswer === correctAnswer ? 1 : 0)
        }, 0)

        const percentage = Math.round((correctCount / questions.length) * 100)

        setScore(percentage)
        setShowScore(true)
    }

    console.log(answers);

    return (
        <div className="max-h-screen h-[100vh-200px]  bg-slate-100 p-8">
            <div className="mx-auto max-w-2xl">
                {/* Score Display */}
                {showScore && (
                    <div className="mb-8 rounded-lg bg-white p-4 text-center shadow-sm">
                        <p className="text-lg font-semibold text-slate-900">
                            Score: {score} / 100
                        </p>
                    </div>
                )
                }

                <div className="space-y-6">
                    {questions.map((q, index) => (
                        <QuestionCard key={q.id} index={index + 1}>
                            <QuestionRenderer
                                question={q}
                                value={answers[q.id]}
                                onChange={(val) =>
                                    setAnswers((prev) => ({ ...prev, [q.id]: val }))
                                }
                            />
                        </QuestionCard>
                    ))}
                </div>
                <div>
                    <Button onClick={checkResult}>Submit</Button>
                </div>
            </div>
        </div>

    );
}