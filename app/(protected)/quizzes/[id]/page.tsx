// app/(protected)/quizzes/[id]/page.tsx
'use client'

import { PromptInputMessage } from "@/components/ai-elements/prompt-input"
import { ChatPromptInput } from "@/components/chat/chat-prompt-input"
import EditQuizDialog from "@/components/dialogs/edit-quiz-dialog"
import { QuizAttachments } from "@/components/quiz-attachments-manager"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { QuizStatuses } from "@/enums"
import { useCreateConversation, useGetConversations } from "@/hooks/queries/use-conversation"
import { useGetQuiz, useUpdateQuiz } from "@/hooks/queries/use-quiz"
import { Conversation } from "@/types"
import { EllipsisVertical, MessageSquare, Plus, Trash2 } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"

const Page = () => {
    const { id } = useParams()
    const router = useRouter()

    const { data: quiz, isLoading, error } = useGetQuiz(id as string)
    const { data: conversations } = useGetConversations(id as string)
    const createConversation = useCreateConversation(id as string)
    const updateQuiz = useUpdateQuiz(Number(id))

    const [sending, setSending] = useState(false)

    // Status badge logic
    const status = quiz?.status && quiz.status in QuizStatuses
        ? (quiz.status as keyof typeof QuizStatuses)
        : undefined

    const label = status ? QuizStatuses[status]?.label : ""
    const IconComponent = status ? QuizStatuses[status]?.icon : null
    const variant = (status ? (QuizStatuses[status]?.badge as "success" | "destructive" | "outline") : null) || "ghost"

    // Handle sending a message - creates conversation with initial message + files
    const handleSubmit = async (message: PromptInputMessage) => {
        if ((!message.text?.trim() && (!message.files || message.files.length === 0)) || sending) return

        setSending(true)
        try {
            // Convert FileUIPart objects to File array
            // FileUIPart has: { url: string (blob URL or data URL), mediaType: string, filename: string }
            const files: File[] = [];

            if (message.files && message.files.length > 0) {
                for (const filePart of message.files) {
                    if (filePart.url) {
                        // Fetch the blob from the blob URL
                        const response = await fetch(filePart.url);
                        const blob = await response.blob();
                        // Create a File object from the blob
                        const file = new File([blob], filePart.filename || 'file', {
                            type: filePart.mediaType || blob.type,
                        });
                        files.push(file);
                    }
                }
            }

            // Create conversation with initial message and files
            const newConversation = await createConversation.mutateAsync({
                text: message.text || undefined,
                files: files.length > 0 ? files : undefined,
            })

            // Redirect to conversation page (no need to pass message in URL anymore)
            router.push(`/conversations/${newConversation.id}?new=true`)
        } catch (err) {
            console.error('Failed to create conversation:', err)
        } finally {
            setSending(false)
        }
    }

    // Handle status change
    const handlePublish = () => {
        updateQuiz.mutate({ status: 'published' })
    }

    const handleUnpublish = () => {
        updateQuiz.mutate({ status: 'unpublished' })
    }

    // Error state
    if (error) {
        return (
            <div className="flex flex-col justify-center items-center h-full p-8">
                <p className="text-destructive text-lg">Failed to load quiz</p>
                <p className="text-muted-foreground">{error.message}</p>
                <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => router.push('/quizzes')}
                >
                    Back to Quizzes
                </Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col justify-center">
            <div className="w-full px-4">
                {/* Header */}
                {!isLoading ? (
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">{quiz?.title}</h1>
                            {status && IconComponent && (
                                <Badge variant={variant}>
                                    <IconComponent className="mr-1 h-3 w-3" />
                                    {label}
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <EditQuizDialog quiz={quiz} />
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon">
                                        <EllipsisVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {status === 'draft' && (
                                        <DropdownMenuItem onClick={handlePublish}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Publish
                                        </DropdownMenuItem>
                                    )}
                                    {status === 'published' && (
                                        <DropdownMenuItem onClick={handleUnpublish}>
                                            Unpublish
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between mb-6">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-10 w-24" />
                    </div>
                )}

                {/* Description */}
                {quiz?.description && (
                    <p className="text-muted-foreground mb-6">{quiz.description}</p>
                )}

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Chat Input & Conversations */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Start Conversation Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    Start a Conversation
                                </CardTitle>
                                <CardDescription>
                                    Send a message to start generating quiz questions with AI.
                                    You can also attach PDF, Word, or text files.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChatPromptInput
                                    onSubmit={handleSubmit}
                                    status={sending ? "submitted" : "ready"}
                                    placeholder="Describe what kind of quiz you want to create..."
                                />
                            </CardContent>
                        </Card>

                        {/* Existing Conversations */}
                        {conversations && conversations.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">
                                        Previous Conversations
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {conversations.map((conv: Conversation) => (
                                        <Button
                                            key={conv.id}
                                            variant="outline"
                                            className="w-full justify-start"
                                            onClick={() => router.push(`/conversations/${conv.id}`)}
                                        >
                                            <MessageSquare className="mr-2 h-4 w-4" />
                                            Conversation #{conv.id}
                                            <span className="ml-auto text-xs text-muted-foreground">
                                                {new Date(conv.createdAt).toLocaleDateString()}
                                            </span>
                                        </Button>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button
                                    className="w-full justify-start"
                                    variant="outline"
                                    onClick={() => router.push(`/quiz/${id}/preview`)}
                                >
                                    Preview Quiz
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Quiz Info</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Status</span>
                                    <Badge variant={variant}>{label}</Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Created</span>
                                    <span>
                                        {quiz?.createdAt
                                            ? new Date(quiz.createdAt).toLocaleDateString()
                                            : '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Conversations</span>
                                    <span>{conversations?.length ?? 0}</span>
                                </div>
                            </CardContent>
                        </Card>
                        <QuizAttachments quizId={Number(id)} />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Page