'use client'

import * as React from "react"

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar"
import { GraduationCap } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useQuiz } from "@/hooks/use-quiz"
import { useQuizzes } from "@/hooks/queries/use-quiz"
import { Quiz } from "@/types"



export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { data: quizzes } = useQuizzes()
    const { setQuiz } = useQuiz()
    const pathname = usePathname()
    const router = useRouter()

    const handleClick = (quiz: Quiz) => {
        setQuiz(quiz)
        router.push(`/quiz/${quiz.id}`)
    }

    return (
        <Sidebar {...props}>
            <SidebarHeader>
                <div className="flex justify-center items-center gap-2 font-bold text-xl py-1"><GraduationCap />Quizzes</div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {quizzes?.map((quiz) => (
                                <SidebarMenuItem key={quiz.id}>
                                    <SidebarMenuButton isActive={pathname === `/quiz/${quiz.id}`} onClick={() => handleClick(quiz)}>
                                        <span>{quiz.title}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    )
}
