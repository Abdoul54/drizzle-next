import { axiosInstance } from "@/lib/axios";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

/* =======================
   GET ALL QUIZZES
======================= */

const useGetQuizzes = () => {
    return useQuery({
        queryKey: ["quizzes"],
        queryFn: async () => {
            const { data } = await axiosInstance.get("/api/v1/quizzes");
            return data;
        },
        staleTime: 5_000,
        retry: 2,
    });
};

/* =======================
   GET SINGLE QUIZ
======================= */

const useGetQuiz = (id?: number | string) => {
    const normalizedId = id ? Number(id) : undefined;

    return useQuery({
        queryKey: ["quiz", normalizedId],
        queryFn: async () => {
            const { data } = await axiosInstance.get(
                `/api/v1/quizzes/${normalizedId}`
            );
            return data;
        },
        enabled: !!normalizedId,
    });
};

/* =======================
   CREATE QUIZ
======================= */

type CreateQuizInput = {
    title: string;
    description?: string;
    status?: "draft" | "published" | "unpublished";
};

const useCreateQuiz = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateQuizInput) => {
            const { data } = await axiosInstance.post(
                "/api/v1/quizzes",
                payload
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quizzes"] });
        },
    });
};

/* =======================
   UPDATE QUIZ
======================= */

type UpdateQuizInput = {
    title?: string;
    description?: string | null;
    status?: "draft" | "published" | "unpublished";
};

const useUpdateQuiz = (id: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: UpdateQuizInput) => {
            const { data } = await axiosInstance.patch(
                `/api/v1/quizzes/${id}`,
                payload
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quizzes"] });
            queryClient.invalidateQueries({ queryKey: ["quiz", id] });
        },
    });
};

/* =======================
   DELETE QUIZ
======================= */

const useDeleteQuiz = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            const { data } = await axiosInstance.delete(
                `/api/v1/quizzes/${id}`
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quizzes"] });
        },
    });
};

export {
    useGetQuizzes,
    useGetQuiz,
    useCreateQuiz,
    useUpdateQuiz,
    useDeleteQuiz,
};
