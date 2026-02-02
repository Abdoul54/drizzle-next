"use client"

import { useQuiz } from "@/hooks/use-quiz"
import { Separator } from "./ui/separator"
import { SidebarTrigger } from "./ui/sidebar"
import { NavUser } from "./nav-user"
import { useSession } from "@/lib/auth-client"
import { User } from "better-auth"

const AppHeader = () => {
    const { quiz } = useQuiz()
    const session = useSession()

    return (
        <header className="flex justify-between h-16 shrink-0 items-center gap-2 border-b px-4">
            <div className="flex justify-center items-center">
                <SidebarTrigger className="-ml-1" />
                <Separator
                    orientation="vertical"
                    className="mr-2 data-[orientation=vertical]:h-4"
                />
                <span className="font-bold line-clamp-1">
                    {quiz?.title}
                </span>
            </div>
            <div className="flex justify-center items-center">
                <NavUser user={session?.data?.user as User} />
            </div>
        </header>
    )
}

export default AppHeader