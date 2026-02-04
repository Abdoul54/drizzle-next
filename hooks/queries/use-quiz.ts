import { axiosInstance } from "@/lib/axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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


export { useGetQuizzes, useCreateQuiz };
