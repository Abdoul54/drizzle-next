// hooks/use-tasks.ts
"use client";

import { Task } from "@/types/task";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useTasks() {
    return useQuery<Task[]>({
        queryKey: ["tasks"],
        queryFn: async () => {
            const res = await fetch("/api/tasks");
            if (!res.ok) throw new Error("Failed to fetch tasks");
            return res.json();
        },
    });
}

export function useCreateTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => {
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(task),
            });
            if (!res.ok) throw new Error("Failed to create task");
            return res.json();
        },

        // Optimistic update
        onMutate: async (newTask) => {
            await queryClient.cancelQueries({ queryKey: ["tasks"] });

            const previous = queryClient.getQueryData<Task[]>(["tasks"]);

            queryClient.setQueryData<Task[]>(["tasks"], (old) => [
                {
                    ...newTask,
                    id: Date.now(), // temp id
                    createdAt: new Date(),
                    updatedAt: new Date(),
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
        mutationFn: async ({ id, ...data }: Partial<Task> & { id: number }) => {
            const res = await fetch(`/api/tasks/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
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
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
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