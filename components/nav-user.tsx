"use client"

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { LogOut, UserCircle2, UserIcon, UserRound } from "lucide-react"
import { User } from "better-auth"
import { signOut } from "@/lib/auth-client"
import { useRouter } from "next/navigation"

const COLORS = [
    { bg: "bg-red-200", text: "text-red-500" },
    { bg: "bg-blue-200", text: "text-blue-500" },
    { bg: "bg-green-200", text: "text-green-500" },
    { bg: "bg-yellow-200", text: "text-yellow-500" },
    { bg: "bg-purple-200", text: "text-purple-500" },
    { bg: "bg-pink-200", text: "text-pink-500" },
    { bg: "bg-indigo-200", text: "text-indigo-500" },
    { bg: "bg-orange-200", text: "text-orange-500" },
]

export function getAvatarColors(seed = "") {
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash)
    }

    const index = Math.abs(hash) % COLORS.length
    return COLORS[index]
}


export function NavUser({
    user,
}: {
    user: User
}) {

    const router = useRouter()

    const initials = user?.name
        ? user.name.trim().split(/\s+/).map(n => n[0]).join("")
        : null

    const { bg, text } = getAvatarColors(user?.name || "");

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Avatar className="h-9 w-9 rounded-md cursor-pointer">
                    <AvatarImage src={user?.image || ""} alt={user?.name} />
                    <AvatarFallback
                        className={`rounded-md ${bg} ${text}`}
                    >
                        {initials ? initials : <UserRound className="size-5" />}
                    </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
            >
                <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                        <Avatar className="h-8 w-8 rounded-md">
                            <AvatarImage src={user?.image || ""} alt={user?.name} />
                            <AvatarFallback
                                className={`rounded-md ${bg} ${text}`}
                            >
                                {!initials ? initials : <UserRound className="size-4" />}
                            </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-medium">{user?.name}</span>
                            <span className="text-muted-foreground truncate text-xs" title={user?.email}>
                                {user?.email}
                            </span>
                        </div>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem>
                        <UserCircle2 />
                        Account
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({
                    fetchOptions: {
                        onSuccess: () => {
                            router.push("/login")
                        }
                    }
                })}>
                    <LogOut />
                    Log out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
