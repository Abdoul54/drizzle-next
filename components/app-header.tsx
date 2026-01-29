"use client"

import { useQuiz } from "@/hooks/use-quiz"
import { Separator } from "./ui/separator"
import { SidebarTrigger } from "./ui/sidebar"

const AppHeader = () => {
    const { quiz } = useQuiz()

    return (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
            />
            {quiz?.title}
        </header>
    )
}

export default AppHeader