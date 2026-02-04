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
import { PenSquare } from "lucide-react";
import { useUpdateQuiz } from "@/hooks/queries/use-quiz";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { UpdateQuizForm } from "@/schemas/quiz.schema";
import { Quiz } from "@/types";
import { updateQuizSchema } from "@/schemas/quiz.schema";

const EditQuizDialog = ({ quiz }: { quiz: Quiz }) => {
    const { mutate: createQuiz, isPending } = useUpdateQuiz(quiz?.id);
    const [open, setOpen] = useState(false);

    const form = useForm<UpdateQuizForm>({
        resolver: zodResolver(updateQuizSchema),
        defaultValues: {
            title: "",
            description: "",
        },
    });

    useEffect(() => {
        if (quiz) {
            form?.setValue('title', quiz?.title)
            form?.setValue('description', quiz?.description)
        }
    }, [quiz, form])

    const onSubmit = (values: UpdateQuizForm) => {
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
                <Button variant="outline" size="icon">
                    <PenSquare />
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-xl">
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <DialogHeader className="mb-4">
                        <DialogTitle>Edit quiz</DialogTitle>
                    </DialogHeader>

                    <FieldGroup>
                        <Field {...(form.formState.errors.title && { 'data-invalid': true })}>
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                {...form.register("title")}
                                autoFocus
                                aria-invalid
                            />
                            {form.formState.errors.title && (
                                <FieldError>{form.formState.errors.title.message}</FieldError>
                            )}
                        </Field>

                        <Field {...(form.formState.errors.description && { 'data-invalid': true })}>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                rows={4}
                                maxLength={225}
                                spellCheck
                                {...form.register("description")}
                            />
                            {form.formState.errors.description && (
                                <FieldError>{form.formState.errors.description.message}</FieldError>
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
                            {isPending ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default EditQuizDialog;
