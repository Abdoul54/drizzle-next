import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type Quiz = {
    id: string;
    title: string;
    description: string;
    category: string;
    types: string[];
};

type CreateQuizInput = Omit<Quiz, "id">;

const fetchQuizzes = async (): Promise<Quiz[]> => {
    const res = await fetch("/api/quizzes");
    if (!res.ok) throw new Error("Failed to fetch quizzes");
    return res.json();
};

const fetchQuiz = async (id: string): Promise<Quiz> => {
    const res = await fetch(`/api/quizzes/${id}`);
    if (!res.ok) throw new Error("Failed to fetch quiz");
    return res.json();
};

const createQuiz = async (data: CreateQuizInput): Promise<Quiz> => {
    const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create quiz");
    return res.json();
};

const deleteQuiz = async (id: string): Promise<void> => {
    const res = await fetch(`/api/quizzes/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete quiz");
};

export const useQuizzes = () => {
    return useQuery({
        queryKey: ["quizzes"],
        queryFn: fetchQuizzes,
    });
};

export const useQuiz = (id: string) => {
    return useQuery({
        queryKey: ["quizzes", id],
        queryFn: () => fetchQuiz(id),
        enabled: !!id,
    });
};

export const useCreateQuiz = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createQuiz,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quizzes"] });
        },
    });
};

export const useDeleteQuiz = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteQuiz,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quizzes"] });
        },
    });
};