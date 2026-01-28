// hooks/use-conversations.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Types
export type Conversation = {
    id: string;
    title: string | null;
    userId: string;
    quizId: string;
    createdAt: Date;
    updatedAt: Date;
};

export type Message = {
    id: string;
    conversationId: string;
    role: "user" | "assistant";
    content: string;
    createdAt: Date;
};

export type ConversationWithMessages = Conversation & {
    messages: Message[];
};

// ============ CONVERSATIONS ============

export function useConversations() {
    return useQuery<Conversation[]>({
        queryKey: ["conversations"],
        queryFn: async () => {
            const res = await fetch("/api/conversations");

            if (res.status === 401) throw new Error("Unauthorized");
            if (!res.ok) throw new Error("Failed to fetch conversations");

            return res.json();
        },
        retry: (failureCount, error) => {
            if (error.message === "Unauthorized") return false;
            return failureCount < 3;
        },
    });
}

export function useConversation(id: string) {
    return useQuery<ConversationWithMessages>({
        queryKey: ["conversations", id],
        queryFn: async () => {
            const res = await fetch(`/api/conversations/${id}`);

            if (res.status === 401) throw new Error("Unauthorized");
            if (res.status === 404) throw new Error("Conversation not found");
            if (!res.ok) throw new Error("Failed to fetch conversation");

            return res.json();
        },
        enabled: !!id,
        retry: (failureCount, error) => {
            if (error.message === "Unauthorized" || error.message === "Conversation not found") {
                return false;
            }
            return failureCount < 3;
        },
    });
}

export function useConversationByQuizId(quizId: string) {
    return useQuery<ConversationWithMessages>({
        queryKey: ["conversations", "quiz", quizId],
        queryFn: async () => {
            const res = await fetch(`/api/conversations/quiz/${quizId}`);

            if (res.status === 401) throw new Error("Unauthorized");
            if (res.status === 404) throw new Error("Conversation not found");
            if (!res.ok) throw new Error("Failed to fetch conversation");

            return res.json();
        },
        enabled: !!quizId,
        retry: (failureCount, error) => {
            if (error.message === "Unauthorized" || error.message === "Conversation not found") {
                return false;
            }
            return failureCount < 3;
        },
    });
}

export function useUpdateConversation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...data }: Partial<Conversation> & { id: string }) => {
            const res = await fetch(`/api/conversations/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (res.status === 401) throw new Error("Unauthorized");
            if (res.status === 404) throw new Error("Conversation not found");
            if (!res.ok) throw new Error("Failed to update conversation");

            return res.json();
        },

        onMutate: async (updated) => {
            await queryClient.cancelQueries({ queryKey: ["conversations"] });

            const previousList = queryClient.getQueryData<Conversation[]>(["conversations"]);
            const previousSingle = queryClient.getQueryData<ConversationWithMessages>(["conversations", updated.id]);

            queryClient.setQueryData<Conversation[]>(["conversations"], (old) =>
                old?.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
            );

            if (previousSingle) {
                queryClient.setQueryData<ConversationWithMessages>(["conversations", updated.id], {
                    ...previousSingle,
                    ...updated,
                });
            }

            return { previousList, previousSingle };
        },

        onError: (err, variables, context) => {
            queryClient.setQueryData(["conversations"], context?.previousList);
            if (context?.previousSingle) {
                queryClient.setQueryData(["conversations", variables.id], context.previousSingle);
            }
        },

        onSettled: (data, error, variables) => {
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            queryClient.invalidateQueries({ queryKey: ["conversations", variables.id] });
        },
    });
}

export function useDeleteConversation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });

            if (res.status === 401) throw new Error("Unauthorized");
            if (res.status === 404) throw new Error("Conversation not found");
            if (!res.ok) throw new Error("Failed to delete conversation");

            return res.json();
        },

        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ["conversations"] });

            const previous = queryClient.getQueryData<Conversation[]>(["conversations"]);

            queryClient.setQueryData<Conversation[]>(["conversations"], (old) =>
                old?.filter((c) => c.id !== id)
            );

            return { previous };
        },

        onError: (err, variables, context) => {
            queryClient.setQueryData(["conversations"], context?.previous);
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
    });
}

// ============ MESSAGES ============

export function useMessages(conversationId: string) {
    return useQuery<Message[]>({
        queryKey: ["messages", conversationId],
        queryFn: async () => {
            const res = await fetch(`/api/conversations/${conversationId}/messages`);

            if (res.status === 401) throw new Error("Unauthorized");
            if (res.status === 404) throw new Error("Conversation not found");
            if (!res.ok) throw new Error("Failed to fetch messages");

            return res.json();
        },
        enabled: !!conversationId,
        retry: (failureCount, error) => {
            if (error.message === "Unauthorized" || error.message === "Conversation not found") {
                return false;
            }
            return failureCount < 3;
        },
    });
}

export function useCreateMessage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (message: { conversationId: string; role: "user" | "assistant"; content: string }) => {
            const res = await fetch(`/api/conversations/${message.conversationId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: message.role, content: message.content }),
            });

            if (res.status === 401) throw new Error("Unauthorized");
            if (res.status === 404) throw new Error("Conversation not found");
            if (!res.ok) throw new Error("Failed to create message");

            return res.json() as Promise<Message>;
        },

        onMutate: async (newMessage) => {
            const { conversationId } = newMessage;

            await queryClient.cancelQueries({ queryKey: ["messages", conversationId] });
            await queryClient.cancelQueries({ queryKey: ["conversations", conversationId] });

            const previousMessages = queryClient.getQueryData<Message[]>(["messages", conversationId]);
            const previousConversation = queryClient.getQueryData<ConversationWithMessages>(["conversations", conversationId]);

            const optimisticMessage: Message = {
                id: crypto.randomUUID(),
                conversationId,
                role: newMessage.role,
                content: newMessage.content,
                createdAt: new Date(),
            };

            queryClient.setQueryData<Message[]>(["messages", conversationId], (old) => [
                ...(old || []),
                optimisticMessage,
            ]);

            if (previousConversation) {
                queryClient.setQueryData<ConversationWithMessages>(["conversations", conversationId], {
                    ...previousConversation,
                    messages: [...previousConversation.messages, optimisticMessage],
                });
            }

            return { previousMessages, previousConversation };
        },

        onError: (err, variables, context) => {
            const { conversationId } = variables;
            queryClient.setQueryData(["messages", conversationId], context?.previousMessages);
            if (context?.previousConversation) {
                queryClient.setQueryData(["conversations", conversationId], context.previousConversation);
            }
        },

        onSettled: (data, error, variables) => {
            const { conversationId } = variables;
            queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
            queryClient.invalidateQueries({ queryKey: ["conversations", conversationId] });
        },
    });
}

export function useDeleteMessage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ conversationId, messageId }: { conversationId: string; messageId: string }) => {
            const res = await fetch(`/api/conversations/${conversationId}/messages/${messageId}`, {
                method: "DELETE",
            });

            if (res.status === 401) throw new Error("Unauthorized");
            if (res.status === 404) throw new Error("Message not found");
            if (!res.ok) throw new Error("Failed to delete message");

            return res.json();
        },

        onMutate: async ({ conversationId, messageId }) => {
            await queryClient.cancelQueries({ queryKey: ["messages", conversationId] });

            const previous = queryClient.getQueryData<Message[]>(["messages", conversationId]);

            queryClient.setQueryData<Message[]>(["messages", conversationId], (old) =>
                old?.filter((m) => m.id !== messageId)
            );

            return { previous };
        },

        onError: (err, variables, context) => {
            queryClient.setQueryData(["messages", variables.conversationId], context?.previous);
        },

        onSettled: (data, error, variables) => {
            queryClient.invalidateQueries({ queryKey: ["messages", variables.conversationId] });
            queryClient.invalidateQueries({ queryKey: ["conversations", variables.conversationId] });
        },
    });
}