'use client'

import { PromptInputMessage } from "@/components/ai-elements/prompt-input"
import { ChatPromptInput } from "@/components/chat/chat-prompt-input"
import EditQuizDialog from "@/components/dialogs/edit-quiz-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { QuizStatuses } from "@/enums"
import { useGetQuiz } from "@/hooks/queries/use-quiz"
import { EllipsisVertical } from "lucide-react"
import { useParams } from "next/navigation"

const Page = () => {
    const { id } = useParams()
    const { data, isLoading, error } = useGetQuiz(id as string)

    const status =
        data?.status && data.status in QuizStatuses
            ? (data.status as keyof typeof QuizStatuses)
            : undefined

    const label = status ? QuizStatuses[status]?.label : ""
    const IconComponent = status ? QuizStatuses[status]?.icon : null
    const variant = (status ? (QuizStatuses[status]?.badge as "success" | "destructive" | "outline") : null) || "ghost"

    console.log(data)


    const handleSubmit = (message: PromptInputMessage) => {
        console.log(message);

    }


    const sending = false


    return (
        <div className="flex flex-col justify-center">
            <div className="w-full px-4">
                {!isLoading ? <div className="flex justify-between gap-4 w-full">
                    <div className="flex flex-col flex-1 min-w-0">
                        <h1 className="text-3xl font-bold text-gray-900 mb-4 truncate">
                            {data?.title}
                        </h1>
                        <p className="text-gray-700 line-clamp-3">
                            {data?.description}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <EditQuizDialog quiz={data} />
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
                                <DropdownMenuItem>
                                    <QuizStatuses.published.icon className="mr-2 stroke-success" />
                                    {QuizStatuses.published.verb}
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <QuizStatuses.unpublished.icon className="mr-2 stroke-destructive" />
                                    {QuizStatuses.unpublished.verb}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                    :
                    <div className="flex justify-between gap-4 w-full">
                        <div className="flex flex-col flex-1 min-w-0 gap-2">
                            <Skeleton className="h-8 w-1/3" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Skeleton className="h-9 w-9" />
                            <Skeleton className="h-9 w-20" />
                            <Skeleton className="h-9 w-9" />
                        </div>
                    </div>}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-3 border">
                        <div>
                            <ChatPromptInput
                                onSubmit={handleSubmit}
                                disabled={sending}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Card></Card>
                            <Card></Card>
                            <Card></Card>
                            <Card></Card>
                            <Card></Card>
                            <Card></Card>
                            <Card></Card>
                            <Card></Card>
                            <Card></Card>
                            <Card></Card>
                        </div>
                    </div>
                    <div className="col-span-2 md:col-span-1 border">Section B</div>
                </div>
            </div>
        </div>
    )
}

export default Page
