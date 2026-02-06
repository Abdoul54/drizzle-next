// hooks/queries/use-conversation.ts

import { axiosInstance } from "@/lib/axios";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

/* =======================
   GET SINGLE CONVERSATION BY ID
======================= */

export const useGetConversation = (conversationId: number | string) => {
    const normalizedId = conversationId ? Number(conversationId) : undefined;

    return useQuery({
        queryKey: ["conversation", normalizedId],
        queryFn: async () => {
            const { data } = await axiosInstance.get(
                `/api/v1/conversations/${normalizedId}`
            );
            return data;
        },
        enabled: !!normalizedId,
    });
};

/* =======================
   GET CONVERSATION BY QUIZ ID (latest)
======================= */

export const useConversationByQuizId = (quizId: string) => {
    return useQuery({
        queryKey: ["conversation", "quiz", quizId],
        queryFn: async () => {
            const { data } = await axiosInstance.get(
                `/api/v1/quizzes/${quizId}/conversations/latest`
            );
            return data;
        },
        enabled: !!quizId,
    });
};

/* =======================
   GET ALL CONVERSATIONS FOR A QUIZ
======================= */

export const useGetConversations = (quizId: number | string) => {
    const normalizedId = quizId ? Number(quizId) : undefined;

    return useQuery({
        queryKey: ["conversations", normalizedId],
        queryFn: async () => {
            const { data } = await axiosInstance.get(
                `/api/v1/quizzes/${normalizedId}/conversations`
            );
            return data;
        },
        enabled: !!normalizedId,
    });
};

/* =======================
   CREATE CONVERSATION
======================= */

type CreateConversationInput = {
    text?: string;
    files?: File[];
};

export const useCreateConversation = (quizId: number | string) => {
    const queryClient = useQueryClient();
    const normalizedId = Number(quizId);

    return useMutation({
        mutationFn: async (payload?: CreateConversationInput) => {
            // If we have files, use FormData
            if (payload?.files && payload.files.length > 0) {
                const formData = new FormData();

                if (payload.text) {
                    formData.append("text", payload.text);
                }

                for (const file of payload.files) {
                    formData.append("files", file);
                }

                const { data } = await axiosInstance.post(
                    `/api/v1/quizzes/${normalizedId}/conversations`,
                    formData,
                    {
                        headers: {
                            "Content-Type": "multipart/form-data",
                        },
                    }
                );
                return data;
            }

            // Otherwise, use JSON
            const { data } = await axiosInstance.post(
                `/api/v1/quizzes/${normalizedId}/conversations`,
                payload?.text ? { text: payload.text } : {}
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["conversations", normalizedId] });
            queryClient.invalidateQueries({ queryKey: ["conversation", "quiz", String(normalizedId)] });
        },
    });
};