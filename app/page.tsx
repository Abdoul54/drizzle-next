// app/page.tsx
"use client";

import { useTasks } from "@/hooks/use-tasks";
import EmptyTasks from "@/components/empty-tasks";
import TaskDrawer from "@/components/task-drawer";
import Tasks from "@/components/tasks";

export default function Page() {
  const { data: tasks, isLoading, error } = useTasks();

  if (isLoading) {
    return (
      <div className="container mx-auto p-5">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-5 text-destructive">
        Failed to load tasks
      </div>
    );
  }

  return (
    <div className="container mx-auto p-5">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold">All Tasks</h1>
        <TaskDrawer variant="icon" />
      </div>
      {tasks && tasks.length > 0 ? (
        <Tasks tasks={tasks} />
      ) : (
        <EmptyTasks />
      )}
    </div>
  );
}