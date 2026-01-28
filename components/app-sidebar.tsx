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
import { useConversations } from "@/hooks/use-conversations"



export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { data: conversations } = useConversations()

    return (
        <Sidebar {...props}>
            <SidebarHeader>
                <div className="flex justify-center items-center gap-2 font-bold text-xl py-1"><GraduationCap />Quizzes</div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {conversations?.map((conv) => (
                                <SidebarMenuItem key={conv.id}>
                                    <SidebarMenuButton asChild>
                                        <a href={`/quiz/${conv.quizId}`}>
                                            <span>{conv.title}</span>
                                        </a>
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
