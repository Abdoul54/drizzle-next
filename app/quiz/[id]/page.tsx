'use client';

import { useGetQuizInfo } from "@/hooks/queries/use-quiz";
import { t } from "@/lib/localized";
import { useParams } from "next/navigation";
import { FileText, Clock, Info } from "lucide-react";

const Page = () => {
    const { id } = useParams();

    const { data, isLoading, error } = useGetQuizInfo(Number(id));

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-accent">
                <p>Loading...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen flex items-center justify-center bg-accent">
                <p className="text-destructive">Error loading quiz: {error.message}</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="h-screen flex items-center justify-center bg-accent">
                <p>Quiz not found</p>
            </div>
        );
    }

    const { activeVersion } = data;
    const secondsPerQuestion = 30;
    const estimatedMinutes = Math.ceil((activeVersion.questionCount * secondsPerQuestion) / 60); // 1.5 min per question

    return (
        <div className="h-screen flex flex-col bg-accent">
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="bg-background p-8 rounded-lg shadow-lg max-w-xl w-full space-y-6">
                    {/* Title */}
                    <div className="text-center">
                        <h1 className="text-3xl font-bold mb-2">
                            {t(activeVersion.title, 'en')}
                        </h1>
                        {activeVersion.description && (
                            <p className="text-muted-foreground">
                                {t(activeVersion.description, 'en')}
                            </p>
                        )}
                    </div>

                    {/* Quiz Stats */}
                    <div className="grid grid-cols-2 gap-4 py-4">
                        {/* Question Count */}
                        <div className="flex flex-col items-center gap-2 p-4 bg-accent rounded-lg">
                            <FileText className="h-6 w-6 text-primary" />
                            <div className="text-center">
                                <p className="text-2xl font-bold">
                                    {activeVersion.questionCount}
                                </p>
                                <p className="text-sm text-muted-foreground">Questions</p>
                            </div>
                        </div>

                        {/* Estimated Time */}
                        <div className="flex flex-col items-center gap-2 p-4 bg-accent rounded-lg">
                            <Clock className="h-6 w-6 text-primary" />
                            <div className="text-center">
                                <p className="text-2xl font-bold">
                                    {estimatedMinutes}
                                </p>
                                <p className="text-sm text-muted-foreground">Minutes</p>
                            </div>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-accent p-4 rounded-lg space-y-2">
                        <div className="flex items-center gap-2 mb-3">
                            <Info className="h-5 w-5 text-primary" />
                            <h2 className="font-semibold">Instructions</h2>
                        </div>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>• Read each question carefully before answering</li>
                            <li>• Your progress will be saved automatically</li>
                            <li>• Make sure to submit your quiz when you're done</li>
                        </ul>
                    </div>

                    {/* Start Button */}
                    <button
                        className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                    >
                        Start Quiz
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Page;