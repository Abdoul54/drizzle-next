'use client'

import { PromptInputMessage } from "@/components/ai-elements/prompt-input"
import { ChatPromptInput } from "@/components/chat/chat-prompt-input"
import EditQuizDialog from "@/components/dialogs/edit-quiz-dialog"
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

    // Handle sending a message - creates conversation and redirects
    const handleSubmit = async (message: PromptInputMessage) => {
        if (!message.text?.trim() || sending) return

        setSending(true)
        try {
            // Create conversation with the initial message
            const newConversation = await createConversation.mutateAsync({
                message: {
                    text: message.text,
                }
            })

            // Redirect to the conversation page
            router.push(`/conversations/${newConversation.id}`)
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
                    <div className="flex justify-between gap-4 w-full mb-6">
                        <div className="flex flex-col flex-1 min-w-0">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2 truncate">
                                {quiz?.title}
                            </h1>
                            <p className="text-gray-700 line-clamp-3">
                                {quiz?.description}
                            </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <EditQuizDialog quiz={quiz} />
                            <Badge variant={variant} className="text-base py-1 flex items-center gap-1">
                                {IconComponent && <IconComponent className="w-4 h-4" />}
                                {label}
                            </Badge>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon">
                                        <EllipsisVertical />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {status !== 'published' && (
                                        <DropdownMenuItem onClick={handlePublish}>
                                            <QuizStatuses.published.icon className="mr-2 h-4 w-4 stroke-success" />
                                            Publish
                                        </DropdownMenuItem>
                                    )}
                                    {status === 'published' && (
                                        <DropdownMenuItem onClick={handleUnpublish}>
                                            <QuizStatuses.unpublished.icon className="mr-2 h-4 w-4 stroke-destructive" />
                                            Unpublish
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete Quiz
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-between gap-4 w-full mb-6">
                        <div className="flex flex-col flex-1 min-w-0 gap-2">
                            <Skeleton className="h-8 w-1/3" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Skeleton className="h-9 w-9" />
                            <Skeleton className="h-9 w-20" />
                            <Skeleton className="h-9 w-9" />
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Chat Input Section */}
                    <div className="lg:col-span-2 space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5" />
                                    Start a Conversation
                                </CardTitle>
                                <CardDescription>
                                    Send a message to start generating quiz questions with AI
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChatPromptInput
                                    onSubmit={handleSubmit}
                                    disabled={sending || isLoading}
                                />
                            </CardContent>
                        </Card>

                        {/* Previous Conversations */}
                        {conversations && conversations.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Previous Conversations</CardTitle>
                                    <CardDescription>
                                        Continue a previous conversation or start a new one
                                    </CardDescription>
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
                                            Conversation from {new Date(conv.createdAt).toLocaleDateString()}
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
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Page