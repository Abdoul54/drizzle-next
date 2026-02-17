import ChatPreviewSingleChoice from "./chat/chat-preview-single-choice";
import { t } from "@/lib/localized";
import ChatPreviewMultipleChoice from "./chat/chat-preview-multiple-choice";
import { QuestionInput } from "@/lib/tools";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Direction, languages } from "@/utils/languages";
import { useState } from "react";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight, CircleCheck, LoaderCircle, MousePointer2 } from "lucide-react";
import { CustomCursor } from "./custom-cursor";
import { QuestionSelection } from "@/app/(protected)/conversations/[id]/page";
import { useApproveDraft } from "@/hooks/queries/use-conversation";


export function ConversationPreview({
    questions,
    selectedItem,
    setSelectedItem,
    conversationId,
    quizId
}: {
    questions: QuestionInput[];
    selectedItem: QuestionSelection;
    setSelectedItem: React.Dispatch<React.SetStateAction<QuestionSelection>>;
    conversationId: number | string;
    quizId: number | string;
}) {
    const [language, setLanguage] = useState('en')
    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [selectionEnabled, setSelectionEnabled] = useState(false)

    const approveDraft = useApproveDraft(conversationId);

    const getDirection = () => {
        return languages?.find(lang => lang?.code === language)
    }

    const questionRender = (question: QuestionInput) => {
        // Determine if this question is currently selected
        const isCurrentQuestionSelected = selectedItem?.questionIndex === currentQuestion;
        const currentSelection = isCurrentQuestionSelected ? selectedItem.selection : null;

        switch (question?.type) {
            case "single-choice":
            case 'true-false':
                return (
                    <ChatPreviewSingleChoice
                        text={t(question.text, language)}
                        subtext={t(question?.subText || undefined, language)}
                        options={question?.options?.map(
                            (opt, idx) => ({ id: idx, label: t(opt, language) })
                        )}
                        answer={question?.correctOptionIndexes?.[0] + 1}
                        enableSelection={selectionEnabled}
                        selectedItem={currentSelection}  // ← Add this
                        onSelection={(selection) => {
                            setSelectedItem({
                                questionIndex: currentQuestion,
                                selection
                            });
                        }}
                        dir={getDirection()?.direction as Direction || 'ltr'}
                    />
                )

            case "multiple-choice":
                return (
                    <ChatPreviewMultipleChoice
                        text={t(question.text, language)}
                        subtext={t(question?.subText || undefined, language)}
                        answers={question?.correctOptionIndexes?.map(c => c)}
                        options={question?.options?.map(
                            (opt, idx) => ({ id: idx, label: t(opt, language) })
                        )}
                        enableSelection={selectionEnabled}
                        selectedItem={currentSelection}  // ← Add this
                        onSelection={(selection) => {
                            setSelectedItem({
                                questionIndex: currentQuestion,
                                selection
                            });
                        }}
                        dir={getDirection()?.direction as Direction || 'ltr'}
                    />
                )

            default:
                return null
        }
    }

    const handleApproveDraft = async () => {
        try {
            const result = await approveDraft.mutateAsync();
            console.log("Version created:", result);
            // result: {
            //   success: true,
            //   message: "Quiz version created successfully",
            //   versionId: 123,
            //   versionNumber: 2,
            //   questionsCount: 3
            // }
        } catch (error) {
            console.error("Failed to approve:", error);
        }

    }

    return (
        <div className="flex flex-col bg-accent">
            <div className="flex flex-row justify-between bg-background p-2">
                <div className="flex gap-2 items-center">
                    <Select onValueChange={(v) => setLanguage(v)} value={language}>
                        <SelectTrigger className="w-full max-w-48">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {
                                    languages?.map(lang => (
                                        <SelectItem key={lang?.code} value={lang?.code}>{lang?.labels?.en}</SelectItem>
                                    ))
                                }
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <Button size="icon" variant="outline" onClick={() => setSelectionEnabled(!selectionEnabled)} data-selection={selectionEnabled} className="data-[selection='true']:border-info  data-[selection='true']:bg-info/15 data-[selection='true']:[&_svg]:stroke-info transition">
                        <MousePointer2 />
                    </Button>
                </div>

                <div className="flex gap-2 items-center">
                    <Button size="icon" variant="outline" onClick={() => setCurrentQuestion(currentQuestion - 1)} disabled={currentQuestion === 0}>
                        <ChevronLeft />
                    </Button>
                    <Select
                        onValueChange={(v) => setCurrentQuestion(Number(v))}
                        value={String(currentQuestion)}
                    >
                        <SelectTrigger className="w-full max-w-48 [&_svg]:hidden">
                            <SelectValue placeholder={`${currentQuestion + 1}/${questions?.length}`} >
                                <span className="font-sans">
                                    {currentQuestion + 1}/{questions?.length}
                                </span>
                            </SelectValue>
                        </SelectTrigger>

                        <SelectContent position="popper">
                            <SelectGroup>
                                {questions?.map((q, idx) => (
                                    <SelectItem key={idx} value={String(idx)}>
                                        {idx + 1}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <Button size="icon" variant="outline" onClick={() => setCurrentQuestion(currentQuestion + 1)} disabled={currentQuestion === questions?.length - 1}>
                        <ChevronRight />
                    </Button>
                    <Button
                        onClick={handleApproveDraft}
                        disabled={approveDraft.isPending}
                    >
                        {approveDraft.isPending ? <LoaderCircle className="animate-spin" /> : <CircleCheck />}
                        {approveDraft.isPending ? "Approving..." : "Approve Draft"}
                    </Button>

                </div>
            </div>
            <CustomCursor
                cursorSrc="/pointer.svg"
                enabled={selectionEnabled}
                cursorSize={24}
            >
                <div className="flex justify-center items-center h-[calc(100vh-150px)]">
                    {questionRender(questions?.[currentQuestion])}
                </div>
            </CustomCursor>
        </div>
    );
}
