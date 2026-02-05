"use client"

import { useQuiz } from "@/hooks/use-quiz"
import { NavUser } from "./nav-user"
import { useSession } from "@/lib/auth-client"
import { User } from "better-auth"
import { Button } from "./ui/button"
import { ClipboardCheck } from "lucide-react"
import { Separator } from "./ui/separator"
import { useRouter } from "next/navigation"

const AppHeader = () => {
    const { quiz } = useQuiz()
    const router = useRouter()
    const session = useSession()

    return (
        <header className="flex justify-between h-16 shrink-0 items-center gap-2 border-b px-4">
            <div className="flex justify-center items-center">
                <span className="font-bold text-xl">AI Quizzer</span>
                {/* <SidebarTrigger className="-ml-1" />
                <Separator
                    orientation="vertical"
                    className="mr-2 data-[orientation=vertical]:h-4"
                /> */}
                <span className="font-bold line-clamp-1">
                    {quiz?.title}
                </span>
            </div>
            <div className="flex justify-center gap-1 items-center">
                <Button variant="outline" onClick={() => router.push('/quizzes')}><ClipboardCheck />Quizzes</Button>
                <Separator
                    orientation="vertical"
                    className="mx-1 data-[orientation=vertical]:h-4"
                />
                <NavUser user={session?.data?.user as User} />
            </div>
        </header>
    )
}

export default AppHeader