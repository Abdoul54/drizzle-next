// components/cards/quiz-card.tsx
import { Quiz } from "@/types";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { QuizStatuses } from "@/enums";
import { t } from "@/lib/localized";

interface QuizCardProps {
    quiz: Quiz;
    locale?: string;
    action?: () => void;
}

const QuizCard = ({ quiz, locale = "en", action }: QuizCardProps) => {
    const label = QuizStatuses?.[quiz?.status]?.label;
    const variant =
        (QuizStatuses?.[quiz?.status]?.badge as
            | "success"
            | "destructive"
            | "outline") || "ghost";

    const clickStyle =
        "cursor-pointer hover:shadow-md transition-shadow ease-in-out";

    return (
        <Card onClick={action} className={action ? clickStyle : ""}>
            <CardHeader className="relative">
                <Badge
                    className="absolute right-8 top-0"
                    variant={variant}
                >
                    {label}
                </Badge>
                <CardTitle>{t(quiz?.title, locale)}</CardTitle>
                <CardDescription>
                    {quiz?.description ? t(quiz.description, locale) : ""}
                </CardDescription>
            </CardHeader>
        </Card>
    );
};

export default QuizCard;