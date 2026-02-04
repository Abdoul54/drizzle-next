import { Quiz } from "@/types"
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { QuizStatuses } from "@/enums"

const QuizCard = ({ quiz, action }: { quiz: Quiz, action?: () => void }) => {
    const label = QuizStatuses?.[quiz?.status]?.label
    const variant = (QuizStatuses?.[quiz?.status]?.badge as "success" | "destructive" | "outline") || "ghost"

    const clickStyle = "cursor-pointer hover:shadow-md transition-shadow ease-in-out"

    return (
        <Card onClick={action} className={action ? clickStyle : ""}>
            <CardHeader className="relative">
                <Badge className="absolute right-8 top-0" variant={variant}>{label}</Badge>
                <CardTitle>{quiz?.title}</CardTitle>
                <CardDescription>{quiz?.description}</CardDescription>
            </CardHeader>
        </Card>
    )
}

export default QuizCard