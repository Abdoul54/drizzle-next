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
    Paperclip,
    X,
} from "lucide-react";
import { useState } from "react";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateQuiz } from "@/hooks/queries/use-quiz";
import { useRouter } from "next/navigation";
import { useQuiz } from "@/hooks/use-quiz";

const QUIZ_TYPES = [
    "multiple_choice",
    "true_false",
    "short_answer",
    "fill_in_blank",
] as const;

const ACCEPTED_FILE_TYPES = [
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const schema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    category: z.string().min(1, "Category is required"),
    types: z.array(z.string()).min(1, "Select at least one type"),
});

type QuizFormData = z.infer<typeof schema>;

export default function Page() {
    const createQuiz = useCreateQuiz();
    const router = useRouter();
    const { setQuiz } = useQuiz();
    const [files, setFiles] = useState<File[]>([]);

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        const validFiles = selectedFiles.filter((file) =>
            ACCEPTED_FILE_TYPES.includes(file.type)
        );
        setFiles((prev) => [...prev, ...validFiles]);
        e.target.value = ""; // Reset input
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const onSubmit = async (data: QuizFormData) => {
        createQuiz.mutateAsync(
            { ...data, files },
            {
                onSuccess: (result) => {
                    form.reset();
                    setFiles([]);
                    router.push(`/quiz/${result?.quiz?.id}`);
                    setQuiz(result?.quiz);
                },
            }
        );
    };

    return (
        <div className="flex justify-center items-center min-h-[91vh]">
            <div className="w-full max-w-3xl bg-background rounded-xl shadow-sm border p-8">
                <div className="mb-6 flex items-center gap-3">
                    <Sparkles className="text-primary" />
                    <h1 className="text-2xl font-semibold">Create AI Quiz</h1>
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
                        <FieldError>
                            {form.formState.errors.description?.message}
                        </FieldError>
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

                    {/* File Upload */}
                    <Field>
                        <FieldLabel className="flex items-center gap-2">
                            <Paperclip size={16} /> Attachments (optional)
                        </FieldLabel>
                        <p className="text-sm text-muted-foreground mb-2">
                            Upload PDFs or documents for the AI to generate questions from
                        </p>

                        <label className="flex items-center justify-center gap-2 border border-dashed rounded-md px-4 py-6 hover:bg-muted cursor-pointer transition-colors">
                            <Paperclip size={18} className="text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                                Click to upload files
                            </span>
                            <input
                                type="file"
                                multiple
                                accept={ACCEPTED_FILE_TYPES.join(",")}
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </label>

                        {files.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {files.map((file, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between bg-muted rounded-md px-3 py-2"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <FileText size={16} className="shrink-0" />
                                            <span className="text-sm truncate">{file.name}</span>
                                            <span className="text-xs text-muted-foreground shrink-0">
                                                ({(file.size / 1024).toFixed(1)} KB)
                                            </span>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 shrink-0"
                                            onClick={() => removeFile(index)}
                                        >
                                            <X size={14} />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Field>

                    <Button type="submit" className="w-full gap-2" disabled={isPending}>
                        <Sparkles size={18} />
                        {isPending ? "Generating..." : "Generate Quiz"}
                    </Button>
                </form>
            </div>
        </div>
    );
}