import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardFooter,
} from "@/components/ui/card"

export function QuestionCard({
    index,
    children,
    footer,
}: {
    index: number
    children: React.ReactNode
    footer?: React.ReactNode
}) {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="text-base">
                    Question {index}
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
                {children}
            </CardContent>

            {footer && (
                <CardFooter className="text-sm text-muted-foreground">
                    {footer}
                </CardFooter>
            )}
        </Card>
    )
}
