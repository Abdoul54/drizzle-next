"use client";

import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { Question } from "@/types";

interface Props {
    question: Question;
    language: string;
    value: number | undefined;
    onChange: (v: number) => void;
    qIndex: number;
}

export function SingleChoice({
    question,
    language,
    value,
    onChange,
    qIndex,
}: Props) {
    return (
        <RadioGroup
            value={value?.toString()}
            onValueChange={(v) => onChange(Number(v))}
            className="space-y-2"
        >
            {question?.options?.map((opt, i) => (
                <Label
                    key={i}
                    htmlFor={`q${qIndex}-${i}`}
                    className="
            flex items-center gap-3 rounded-xl border
            border-border/60 bg-background
            px-4 py-3 cursor-pointer
            hover:bg-accent/60 hover:border-primary/40
            transition-all
          "
                >
                    <RadioGroupItem value={i.toString()} id={`q${qIndex}-${i}`} />
                    <span className="text-sm">{opt[language]}</span>
                </Label>
            ))}
        </RadioGroup>
    );
}
