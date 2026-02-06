import AppHeader from "@/components/app-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { QuizProvider } from "@/providers/quiz-provider";
import React from "react";

export default function layout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <SidebarProvider defaultOpen={false}>
            <QuizProvider>
                {/* <AppSidebar /> */}
                <SidebarInset>
                    <AppHeader />
                    <div className="flex flex-1 flex-col gap-4 p-4">
                        {children}
                    </div>
                </SidebarInset>
            </QuizProvider>
        </SidebarProvider>
    );
}
