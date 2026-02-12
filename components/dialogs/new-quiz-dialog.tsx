"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle } from "lucide-react";

import { useCreateQuiz } from "@/hooks/queries/use-quiz";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { CreateQuizForm, createQuizSchema } from "@/schemas/quiz.schema";
import { useSession } from "@/lib/auth-client";

const NewQuizDialog = () => {
    const { mutate: createQuiz, isPending } = useCreateQuiz();
    const [open, setOpen] = useState(false);
    const { data } = useSession()
    const currentLanguage = data?.user?.language || 'en' as string

    const form = useForm<CreateQuizForm>({
        resolver: zodResolver(createQuizSchema),
        defaultValues: {
            title: {},
            description: {},
        },
    });

    const onSubmit = (values: CreateQuizForm) => {
        createQuiz(
            {
                title: values.title,
                description: values.description || undefined,
            },
            {
                onSuccess: () => {
                    form.reset();
                    setOpen(false);
                },
            }
        );
    };


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <PlusCircle />
                    New Quiz
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-xl">
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <DialogHeader className="mb-4">
                        <DialogTitle>Create quiz</DialogTitle>
                        <DialogDescription>
                            Your quiz will be created as a draft.
                        </DialogDescription>
                    </DialogHeader>

                    <FieldGroup>
                        <Field {...(form.formState.errors.title?.[currentLanguage] && { 'data-invalid': true })}>
                            <Label htmlFor={`title.${currentLanguage}`}>Title</Label>
                            <Input
                                id={`title.${currentLanguage}`}
                                {...form.register(`title.${currentLanguage}`)}
                                autoFocus
                                aria-invalid
                            />
                            {form.formState.errors.title?.[currentLanguage] && (
                                <FieldError>{form.formState.errors.title?.[currentLanguage].message}</FieldError>
                            )}
                        </Field>

                        <Field {...(form.formState.errors.description?.[currentLanguage] && { 'data-invalid': true })}>
                            <Label htmlFor={`description.${currentLanguage}`}>Description</Label>
                            <Textarea
                                id={`description.${currentLanguage}`}
                                rows={4}
                                maxLength={225}
                                spellCheck
                                {...form.register(`description.${currentLanguage}`)}
                            />
                            {form.formState.errors.description?.[currentLanguage] && (
                                <FieldError>{form.formState.errors.description?.[currentLanguage].message}</FieldError>
                            )}
                        </Field>
                    </FieldGroup>

                    <DialogFooter className="mt-4">
                        <DialogClose asChild>
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </DialogClose>

                        <Button type="submit" disabled={isPending}>
                            {isPending ? "Creating..." : "Create"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default NewQuizDialog;
