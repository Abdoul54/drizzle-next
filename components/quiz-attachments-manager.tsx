// components/quiz-attachments.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "@/lib/axios";
import { FileTextIcon, Loader2Icon, TrashIcon, UploadIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

interface Attachment {
    id: number;
    filename: string;
    mediaType: string;
    size: number;
    embeddingStatus: "pending" | "processing" | "completed" | "failed";
    chunkCount: number;
    errorMessage?: string;
    createdAt: string;
}

interface QuizAttachmentsProps {
    quizId: number;
}

export function QuizAttachments({ quizId }: QuizAttachmentsProps) {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch attachments
    const { data: attachments = [], isLoading } = useQuery<Attachment[]>({
        queryKey: ["quiz-attachments", quizId],
        queryFn: async () => {
            const { data } = await axiosInstance.get(`/api/v1/quizzes/${quizId}/attachments`);
            return data;
        },
    });

    // Upload mutation
    const uploadMutation = useMutation({
        mutationFn: async (files: File[]) => {
            const formData = new FormData();
            files.forEach((file) => formData.append("files", file));
            const { data } = await axiosInstance.post(
                `/api/v1/quizzes/${quizId}/attachments`,
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quiz-attachments", quizId] });
            toast.success(
                "Upload successful", {
                description: "Files are being processed..."
            });
            if (fileInputRef.current) fileInputRef.current.value = "";
        },
        onError: (error: any) => {
            toast.error("Upload failed", {
                description: error.response?.data?.message || "An error occurred",
            });
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (attachmentId: number) => {
            await axiosInstance.delete(`/api/v1/quizzes/${quizId}/attachments/${attachmentId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quiz-attachments", quizId] });
            toast.success(
                "Deleted", {
                description: "Attachment removed successfully"
            });

        },
        onError: (error: any) => {
            toast.error("Delete failed", {
                description: error.response?.data?.message || "An error occurred",
            });
        },
    });

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            uploadMutation.mutate(files);
        }
    };

    const handleDelete = (attachmentId: number) => {
        if (confirm("Delete this file?")) {
            deleteMutation.mutate(attachmentId);
        }
    };

    const getStatusIcon = (status: Attachment["embeddingStatus"]) => {
        switch (status) {
            case "completed": return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
            case "failed": return <XCircleIcon className="h-4 w-4 text-red-500" />;
            case "processing": return <Loader2Icon className="h-4 w-4 animate-spin text-blue-500" />;
            case "pending": return <ClockIcon className="h-4 w-4 text-gray-500" />;
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Quiz Knowledge Base</CardTitle>
                        <CardDescription>
                            Upload reference materials (PDFs, Word docs, text files)
                        </CardDescription>
                    </div>
                    <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadMutation.isPending}
                    >
                        {uploadMutation.isPending ? (
                            <><Loader2Icon className="mr-2 h-4 w-4 animate-spin" />Uploading...</>
                        ) : (
                            <><UploadIcon className="mr-2 h-4 w-4" />Upload</>
                        )}
                    </Button>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx,.txt,.md"
                    onChange={handleFileSelect}
                    className="hidden"
                />
            </CardHeader>

            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2Icon className="h-6 w-6 animate-spin" />
                    </div>
                ) : attachments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <FileTextIcon className="mx-auto h-12 w-12 mb-2 opacity-50" />
                        <p>No files uploaded yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {attachments.map((att) => (
                            <div
                                key={att.id}
                                className="flex items-center justify-between p-4 border rounded-lg"
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    <FileTextIcon className="h-8 w-8 text-muted-foreground" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-medium truncate">{att.filename}</p>
                                            {getStatusIcon(att.embeddingStatus)}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <span>{formatFileSize(att.size)}</span>
                                            <span>•</span>
                                            <Badge variant={att.embeddingStatus === "completed" ? "default" : "secondary"}>
                                                {att.embeddingStatus}
                                            </Badge>
                                            {att.embeddingStatus === "completed" && (
                                                <>
                                                    <span>•</span>
                                                    <span>{att.chunkCount} chunks</span>
                                                </>
                                            )}
                                        </div>
                                        {att.errorMessage && (
                                            <p className="text-sm text-red-500 mt-1">
                                                Error: {att.errorMessage}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(att.id)}
                                    disabled={deleteMutation.isPending}
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}