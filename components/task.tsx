"use client";

import { Check, Clock, Circle, Trash, Play } from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemMedia,
    ItemTitle,
} from "./ui/item";
import { Task as TaskType } from "@/types/task";
import { changeTaskStatus, deleteTask } from "@/actions/task";
import TaskDrawer from "./task-drawer";

const STATUS_MAP = {
    todo: { bgcolor: "bg-info/20", color: "text-info", label: "To Do", icon: Circle },
    in_progress: { bgcolor: "bg-warning/20", color: "text-warning", label: "In Progress", icon: Clock },
    done: { bgcolor: "bg-success/20", color: "text-success", label: "Done", icon: Check },
} as const;

const Task = ({ task }: { task: TaskType }) => {
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
                        onClick={() => changeTaskStatus(task.id, "in_progress")}
                    >
                        <Play />
                    </Button>
                )}

                {task.status === "in_progress" && (
                    <Button
                        size="icon-sm"
                        variant="outline-success"
                        onClick={() => changeTaskStatus(task.id, "done")}
                    >
                        <Check />
                    </Button>
                )}

                <TaskDrawer data={task} variant="icon" />

                <Button
                    size="icon-sm"
                    variant="outline-destructive"
                    onClick={() => deleteTask(task.id)}
                >
                    <Trash />
                </Button>

            </ItemActions>
        </Item>
    );
};

export default Task;
