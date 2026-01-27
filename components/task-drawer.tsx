"use client";

import { priorities, statuses } from "@/db/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";

import {
    Field,
    FieldError,
    FieldLabel,
} from "./ui/field";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";
import {
    CheckCircle2,
    Clipboard,
    Clock,
    PenSquare,
    Plus,
    SignalHigh,
    SignalLow,
    SignalMedium,
} from "lucide-react";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "./ui/drawer";
import { Button } from "./ui/button";
import { Task } from "@/types/task";
import { useCreateTask, useUpdateTask } from "@/hooks/use-tasks";
import { useEffect, useState } from "react";

const schema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    priority: z.enum(priorities),
    status: z.enum(statuses),
});



const TaskDrawer = ({ variant, data }: { variant?: 'button' | 'icon'; data?: Task }) => {

    const isEditing = Boolean(data);
    const [open, setOpen] = useState(false);

    const createTask = useCreateTask();
    const updateTask = useUpdateTask();

    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: {
            title: "",
            description: "",
            priority: "low",
            status: "todo",
        },
    });

    useEffect(() => {
        if (isEditing && data) {
            form.reset({
                title: data.title,
                description: data.description || "",
                priority: data.priority || "low",
                status: data.status || "todo",
            });
        }
    }, [isEditing, data, form]);

    const onSubmit = async (formData: z.infer<typeof schema>) => {
        const taskData = {
            ...formData,
            description: formData.description ?? null,
        };

        if (isEditing && data?.id) {
            updateTask.mutate(
                { id: data.id, ...taskData },
                { onSuccess: () => { form.reset(); setOpen(false); } }
            );
        } else {
            createTask.mutate(taskData, {
                onSuccess: () => { form.reset(); setOpen(false); }
            });
        }
    };

    const isPending = createTask.isPending || updateTask.isPending;


    const renderTrigger = () => {
        if (isEditing) {
            return variant === "icon" ? (
                <Button size="icon-sm" variant="outline">
                    <PenSquare />
                </Button>
            ) : (
                <Button variant="outline">Edit Task</Button>
            );
        } else {
            return variant === "icon" ? (
                <Button size="icon-sm" variant="outline">
                    <Plus />
                </Button >
            ) : (
                <Button variant="outline">New Task</Button>
            );
        }
    };

    const renderHeader = () => {
        if (isEditing) {
            return (
                <>
                    <DrawerTitle>Edit Task</DrawerTitle>
                    <DrawerDescription>
                        Update the details of your task.
                    </DrawerDescription>
                </>
            );
        } else {
            return (
                <>
                    <DrawerTitle>Add New Task</DrawerTitle>
                    <DrawerDescription>
                        Fill in the details below to create a new task.
                    </DrawerDescription>
                </>
            );
        }
    };


    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
                {renderTrigger()}
            </DrawerTrigger>

            <DrawerContent>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="p-4 space-y-4"
                >
                    <DrawerHeader>{renderHeader()}</DrawerHeader>

                    <div className="space-y-4 px-4">

                        {/* Title */}
                        <Field>
                            <FieldLabel>Title</FieldLabel>
                            <Controller
                                name="title"
                                control={form.control}
                                render={({ field }) => (
                                    <Input {...field} placeholder="Task Title" />
                                )}
                            />
                            <FieldError>{form.formState.errors.title?.message}</FieldError>
                        </Field>

                        {/* Description */}
                        <Field>
                            <FieldLabel>Description</FieldLabel>
                            <Controller
                                name="description"
                                control={form.control}
                                render={({ field }) => (
                                    <Textarea {...field} placeholder="Task Description" />
                                )}
                            />
                        </Field>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Priority */}
                            <Field>
                                <FieldLabel>Priority</FieldLabel>
                                <Controller
                                    name="priority"
                                    control={form.control}
                                    render={({ field }) => (
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Priority" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="low">
                                                    <SignalLow className="mr-2" /> Low
                                                </SelectItem>
                                                <SelectItem value="medium">
                                                    <SignalMedium className="mr-2" /> Medium
                                                </SelectItem>
                                                <SelectItem value="high">
                                                    <SignalHigh className="mr-2" /> High
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                <FieldError>
                                    {form.formState.errors.priority?.message}
                                </FieldError>
                            </Field>

                            {/* Status */}
                            <Field>
                                <FieldLabel>Status</FieldLabel>
                                <Controller
                                    name="status"
                                    control={form.control}
                                    render={({ field }) => (
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="todo">
                                                    <Clipboard className="mr-2" /> To Do
                                                </SelectItem>
                                                <SelectItem value="in_progress">
                                                    <Clock className="mr-2" /> In Progress
                                                </SelectItem>
                                                <SelectItem value="done">
                                                    <CheckCircle2 className="mr-2" /> Done
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                <FieldError>
                                    {form.formState.errors.status?.message}
                                </FieldError>
                            </Field>
                        </div>
                    </div>

                    <DrawerFooter>
                        <Button type="submit">Submit</Button>
                        <DrawerClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DrawerClose>
                    </DrawerFooter>
                </form>
            </DrawerContent>
        </Drawer>
    );
};

export default TaskDrawer;
