import Task from "./task";
import { Task as TaskType } from "@/types/task";
import { ScrollArea } from "./ui/scroll-area";

const Tasks = ({ tasks }: { tasks: TaskType[] }) => {
    return (
        <ScrollArea className="h-[calc(100vh-95px)] w-full rounded-md border">
            <div className="p-4 space-y-4">
                {
                    tasks.map((task) => (
                        <Task
                            key={task.id}
                            task={{
                                id: task.id,
                                title: task.title,
                                description: task.description,
                                priority: task.priority,
                                status: task.status,
                                createdAt: task.createdAt,
                                updatedAt: task.updatedAt,
                            }}
                        />
                    ))
                }
            </div>
        </ScrollArea>
    );
}

export default Tasks;