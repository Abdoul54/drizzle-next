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


const conversations = [
    {
        id: 1,
        title: 'ghfdhgfh',
        url: 'hghgvhgvh'
    }
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar {...props}>
            <SidebarHeader>
                <div className="flex justify-center items-center gap-2 font-bold text-xl py-1"><GraduationCap />Quizzes</div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {conversations.map((conv) => (
                                <SidebarMenuItem key={conv.title}>
                                    <SidebarMenuButton asChild>
                                        <a href={conv.url}>
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
