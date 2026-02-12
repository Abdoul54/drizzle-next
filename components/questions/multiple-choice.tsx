"use client";

import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { Question } from "@/types";

interface Props {
    question: Question;
    language: string;
    value: number[];
    onChange: (v: number[]) => void;
    qIndex: number;
}

export function MultipleChoice({
    question,
    language,
    value = [],
    onChange,
    qIndex,
}: Props) {
    const toggle = (index: number) => {
        if (value.includes(index)) {
            onChange(value.filter((i) => i !== index));
        } else {
            onChange([...value, index]);
        }
    };

    return (
        <div className="space-y-2">
            {question?.options?.map((opt, i) => {
                const checked = value.includes(i);

                return (
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
                        <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggle(i)}
                            id={`q${qIndex}-${i}`}
                        />
                        <span className="text-sm">{opt[language]}</span>
                    </Label>
                );
            })}
        </div>
    );
}
