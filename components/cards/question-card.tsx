"use client";

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Question } from "@/types";
import { SingleChoice } from "../questions/single-choice";
import { MultipleChoice } from "../questions/multiple-choice";
import { TrueFalse } from "../questions/true-false";

interface Props {
    question: Question;
    index: number;
    language: string;
    answer: any;
    setAnswer: (val: any) => void;
}

export function QuestionCard({
    question,
    index,
    language,
    answer,
    setAnswer,
}: Props) {
    return (
        <Card
            className="
      rounded-2xl border border-border/60
      bg-background/70 backdrop-blur
      shadow-sm hover:shadow-lg
      transition-all duration-300
      hover:-translate-y-[2px]
    "
        >
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold leading-snug">
                    <span className="text-primary mr-2">{index + 1}.</span>
                    {question.text?.[language]}
                </CardTitle>

                {question.subText?.[language] && (
                    <p className="text-sm text-muted-foreground mt-1">
                        {question.subText[language]}
                    </p>
                )}
            </CardHeader>

            <CardContent>
                {question.type === "single-choice" && (
                    <SingleChoice
                        question={question}
                        language={language}
                        value={answer}
                        onChange={setAnswer}
                        qIndex={index}
                    />
                )}

                {question.type === "multiple-choice" && (
                    <MultipleChoice
                        question={question}
                        language={language}
                        value={answer}
                        onChange={setAnswer}
                        qIndex={index}
                    />
                )}

                {question.type === "true-false" && (
                    <TrueFalse
                        question={question}
                        language={language}
                        value={answer}
                        onChange={setAnswer}
                        qIndex={index}
                    />
                )}
            </CardContent>
        </Card>
    );
}
