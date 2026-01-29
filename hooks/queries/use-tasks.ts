// hooks/use-tasks.ts
"use client";

import { Task } from "@/types/task";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useTasks() {
    return useQuery<Task[]>({
        queryKey: ["tasks"],
        queryFn: async () => {
            const res = await fetch("/api/tasks");

            if (res.status === 401) throw new Error("Unauthorized");
            if (!res.ok) throw new Error("Failed to fetch tasks");

            return res.json();
        },
        retry: (failureCount, error) => {
            if (error.message === "Unauthorized") return false;
            return failureCount < 3;
        },
    });
}

export function useCreateTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (task: Omit<Task, "id" | "createdAt" | "userId">) => {
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(task),
            });

            if (res.status === 401) throw new Error("Unauthorized");
            if (!res.ok) throw new Error("Failed to create task");

            return res.json();
        },

        onMutate: async (newTask) => {
            await queryClient.cancelQueries({ queryKey: ["tasks"] });

            const previous = queryClient.getQueryData<Task[]>(["tasks"]);

            queryClient.setQueryData<Task[]>(["tasks"], (old) => [
                {
                    ...newTask,
                    id: crypto.randomUUID(),  // string, not number
                    userId: "",  // placeholder, will be replaced on settle
                    createdAt: new Date(),
                } as Task,
                ...(old || []),
            ]);

            return { previous };
        },

        onError: (err, variables, context) => {
            queryClient.setQueryData(["tasks"], context?.previous);
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
        },
    });
}

export function useUpdateTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...data }: Partial<Task> & { id: string }) => {  // string
            const res = await fetch(`/api/tasks/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (res.status === 401) throw new Error("Unauthorized");
            if (res.status === 404) throw new Error("Task not found");
            if (!res.ok) throw new Error("Failed to update task");

            return res.json();
        },

        onMutate: async (updated) => {
            await queryClient.cancelQueries({ queryKey: ["tasks"] });

            const previous = queryClient.getQueryData<Task[]>(["tasks"]);

            queryClient.setQueryData<Task[]>(["tasks"], (old) =>
                old?.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
            );

            return { previous };
        },

        onError: (err, variables, context) => {
            queryClient.setQueryData(["tasks"], context?.previous);
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
        },
    });
}

export function useDeleteTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {  // string
            const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });

            if (res.status === 401) throw new Error("Unauthorized");
            if (res.status === 404) throw new Error("Task not found");
            if (!res.ok) throw new Error("Failed to delete task");

            return res.json();
        },

        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ["tasks"] });

            const previous = queryClient.getQueryData<Task[]>(["tasks"]);

            queryClient.setQueryData<Task[]>(["tasks"], (old) =>
                old?.filter((t) => t.id !== id)
            );

            return { previous };
        },

        onError: (err, variables, context) => {
            queryClient.setQueryData(["tasks"], context?.previous);
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
        },
    });
}