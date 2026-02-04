'use client'

import NewQuizDialog from "@/components/dialogs/new-quiz-dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useGetQuizzes } from "@/hooks/queries/use-quiz"
import { Quiz } from "@/types"
import { useParams } from "next/navigation"

const Page = () => {
    const { id } = useParams()
    const { data, isLoading, error } = useGetQuizzes()
    return (
        <div className="flex flex-col justify-center">
            <div className="w-full p-8">
                <div className="flex  justify-between w-full">
                    <h1 className="text-3xl font-bold text-gray-900 mb-6">
                        {id}
                    </h1>
                    <NewQuizDialog />
                </div>
                <div className="grid grid-cols-2 gap-4">
                </div>
            </div>
        </div>
    )
}

export default Page
