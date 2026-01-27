import { StickyNote } from "lucide-react";
import { Button } from "./ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./ui/empty";
import TaskDrawer from "./task-drawer";

const EmptyTasks = () => {
    return (
        <Empty className="border border-dashed">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <StickyNote />
                </EmptyMedia>
                <EmptyTitle>No Tasks</EmptyTitle>
                <EmptyDescription>
                    You have no tasks at the moment. Start by adding a new task to stay organized!
                </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
                <TaskDrawer />
            </EmptyContent>
        </Empty>

    );
}

export default EmptyTasks;