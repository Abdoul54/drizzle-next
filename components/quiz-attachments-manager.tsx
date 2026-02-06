// components/quiz-attachments-manager.tsx
"use client";

import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "@/lib/axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
    FileTextIcon,
    Loader2Icon,
    TrashIcon,
    UploadIcon,
    FileIcon
} from "lucide-react";

interface Attachment {
    id: number;
    quizId: number;
    conversationId: number | null;
    messageId?: string | null;
    filename: string | null;
    storageKey?: string | null;
    url?: string | null;
    mediaType?: string | null;
    size?: number | null;
    content: string | null;
    createdAt: string;
    updatedAt: string;
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
            toast.success("Upload successful", {
                description: "Files uploaded successfully"
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
            toast.success("Deleted", {
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
        if (confirm("Delete this file? This action cannot be undone.")) {
            deleteMutation.mutate(attachmentId);
        }
    };

    const getFileIcon = (filename: string | null) => {
        if (!filename) return <FileIcon className="h-4 w-4" />;

        const ext = filename.toLowerCase();
        if (ext.endsWith(".pdf")) return <FileTextIcon className="h-4 w-4 text-red-500" />;
        if (ext.endsWith(".docx") || ext.endsWith(".doc"))
            return <FileTextIcon className="h-4 w-4 text-blue-500" />;
        if (ext.endsWith(".txt") || ext.endsWith(".md"))
            return <FileTextIcon className="h-4 w-4 text-gray-500" />;

        return <FileIcon className="h-4 w-4" />;
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">Knowledge Base</CardTitle>
                        <CardDescription className="text-xs">
                            Upload reference materials for quiz generation
                        </CardDescription>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadMutation.isPending}
                    >
                        {uploadMutation.isPending ? (
                            <>
                                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <UploadIcon className="mr-2 h-4 w-4" />
                                Upload
                            </>
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
                        <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : attachments.length === 0 ? (
                    <div className="text-center py-8">
                        <FileTextIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
                        <p className="mt-2 text-sm text-muted-foreground">
                            No files uploaded yet
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Upload PDFs, Word docs, or text files
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {attachments.map((attachment) => (
                            <div
                                key={attachment.id}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {getFileIcon(attachment.filename)}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {attachment.filename || "Unnamed file"}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>
                                                {new Date(attachment.createdAt).toLocaleDateString()}
                                            </span>
                                            {attachment.content && (
                                                <>
                                                    <span>•</span>
                                                    <span>{attachment.content.length} chars</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => handleDelete(attachment.id)}
                                    disabled={deleteMutation.isPending}
                                >
                                    <TrashIcon className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}