"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import {
    FileText,
    AlignLeft,
    Layers,
    CheckSquare,
    Sparkles,
} from "lucide-react";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateQuiz } from "@/hooks/use-quiz";

const QUIZ_TYPES = [
    "multiple_choice",
    "true_false",
    "short_answer",
    "fill_in_blank",
] as const;

const schema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    category: z.string().min(1, "Category is required"),
    types: z.array(z.string()).min(1, "Select at least one type"),
});

type QuizFormData = z.infer<typeof schema>;

export default function Page() {
    const createQuiz = useCreateQuiz();

    const form = useForm<QuizFormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            title: "",
            description: "",
            category: "",
            types: [],
        },
    });

    const isPending = createQuiz.isPending;

    const onSubmit = async (data: QuizFormData) => {
        createQuiz.mutate(data, {
            onSuccess: () => {
                form.reset();
                // redirect or show success message
            },
        });
    };

    return (
        <div className="flex justify-center items-center min-h-[91vh]">
            <div className="w-full max-w-3xl bg-background rounded-xl shadow-sm border p-8">
                <div className="mb-6 flex items-center gap-3">
                    <Sparkles className="text-primary" />
                    <h1 className="text-2xl font-semibold">
                        Create AI Quiz
                    </h1>
                </div>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Title */}
                    <Field>
                        <FieldLabel className="flex items-center gap-2">
                            <FileText size={16} /> Title
                        </FieldLabel>
                        <Controller
                            name="title"
                            control={form.control}
                            render={({ field }) => (
                                <Input {...field} placeholder="e.g. World History Basics" />
                            )}
                        />
                        <FieldError>{form.formState.errors.title?.message}</FieldError>
                    </Field>

                    {/* Description */}
                    <Field>
                        <FieldLabel className="flex items-center gap-2">
                            <AlignLeft size={16} /> Description
                        </FieldLabel>
                        <Controller
                            name="description"
                            control={form.control}
                            render={({ field }) => (
                                <Textarea
                                    {...field}
                                    placeholder="What should the AI generate?"
                                    rows={4}
                                />
                            )}
                        />
                        <FieldError>{form.formState.errors.description?.message}</FieldError>
                    </Field>

                    {/* Category */}
                    <Field>
                        <FieldLabel className="flex items-center gap-2">
                            <Layers size={16} /> Category
                        </FieldLabel>
                        <Controller
                            name="category"
                            control={form.control}
                            render={({ field }) => (
                                <Input {...field} placeholder="History, Science, Tech…" />
                            )}
                        />
                        <FieldError>{form.formState.errors.category?.message}</FieldError>
                    </Field>

                    {/* Types */}
                    <Field>
                        <FieldLabel className="flex items-center gap-2">
                            <CheckSquare size={16} /> Question Types
                        </FieldLabel>

                        <Controller
                            name="types"
                            control={form.control}
                            render={({ field }) => (
                                <div className="grid grid-cols-2 gap-3">
                                    {QUIZ_TYPES.map((type) => (
                                        <label
                                            key={type}
                                            className="flex items-center gap-2 border rounded-md px-3 py-2 hover:bg-muted cursor-pointer"
                                        >
                                            <Checkbox
                                                checked={field.value.includes(type)}
                                                onCheckedChange={(checked: boolean) =>
                                                    checked
                                                        ? field.onChange([...field.value, type])
                                                        : field.onChange(
                                                            field.value.filter((t) => t !== type)
                                                        )
                                                }
                                            />
                                            <span className="text-sm">
                                                {type
                                                    .split("_")
                                                    .map((w) => w[0].toUpperCase() + w.slice(1))
                                                    .join(" ")}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        />

                        <FieldError>{form.formState.errors.types?.message}</FieldError>
                    </Field>

                    <Button
                        type="submit"
                        className="w-full gap-2"
                        disabled={isPending}
                    >
                        <Sparkles size={18} />
                        {isPending ? "Generating..." : "Generate Quiz"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
