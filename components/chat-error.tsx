"use client";

import { BotMessageSquare } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./ui/empty";

export default function ChatError({ error }: { error?: string | null }) {

    return (
        <div className="flex flex-col h-full w-full gap-6 py-4">
            <Empty className="border border-solid border-destructive">
                <EmptyHeader>
                    <EmptyMedia variant="icon" className="w-20 h-20 bg-destructive/20">
                        <BotMessageSquare className="size-10 text-destructive" />
                    </EmptyMedia>
                    <EmptyTitle>Something went wrong</EmptyTitle>
                    <EmptyDescription>
                        {error || "An error occured while trying to get the conversation"}
                    </EmptyDescription>
                </EmptyHeader>
            </Empty>
        </div>
    );
}