// components/task.tsx
"use client";

import { Check, Clock, Circle, Trash, Play } from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "./ui/item";
import { Task as TaskType } from "@/types/task";
import { useDeleteTask, useUpdateTask } from "@/hooks/use-tasks";
import TaskDrawer from "./task-drawer";

const STATUS_MAP = {
    todo: { bgcolor: "bg-info/20", color: "text-info", icon: Circle },
    in_progress: { bgcolor: "bg-warning/20", color: "text-warning", icon: Clock },
    done: { bgcolor: "bg-success/20", color: "text-success", icon: Check },
} as const;

export default function Task({ task }: { task: TaskType }) {
    const updateTask = useUpdateTask();
    const deleteTask = useDeleteTask();

    const status = STATUS_MAP[task.status ?? "todo"];
    const Icon = status.icon;

    return (
        <Item variant="outline">
            <ItemMedia>
                <Avatar className={`size-10 rounded-md ${status.bgcolor}`}>
                    <AvatarFallback className="bg-transparent">
                        <Icon className={`size-4 ${status.color}`} />
                    </AvatarFallback>
                </Avatar>
            </ItemMedia>

            <ItemContent>
                <ItemTitle>{task.title}</ItemTitle>
                <ItemDescription>{task.description}</ItemDescription>
            </ItemContent>

            <ItemActions>
                {task.status === "todo" && (
                    <Button
                        size="icon-sm"
                        variant="outline"
                        disabled={updateTask.isPending}
                        onClick={() => updateTask.mutate({ id: task.id, status: "in_progress" })}
                    >
                        <Play />
                    </Button>
                )}

                {task.status === "in_progress" && (
                    <Button
                        size="icon-sm"
                        variant="outline-success"
                        disabled={updateTask.isPending}
                        onClick={() => updateTask.mutate({ id: task.id, status: "done" })}
                    >
                        <Check />
                    </Button>
                )}

                <TaskDrawer data={task} variant="icon" />

                <Button
                    size="icon-sm"
                    variant="outline-destructive"
                    disabled={deleteTask.isPending}
                    onClick={() => deleteTask.mutate(task.id)}
                >
                    <Trash />
                </Button>
            </ItemActions>
        </Item>
    );
}