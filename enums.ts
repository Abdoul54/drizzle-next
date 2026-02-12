import { FileText, CheckCircle, XCircle, LucideIcon } from 'lucide-react'
import { QuizStatus } from './types'


export const QuizStatuses: Record<
    QuizStatus,
    {
        label: string
        badge: "outline" | "success" | "destructive"
        icon: LucideIcon
        verb?: string
    }
> = {
    draft: {
        label: "Draft",
        badge: "outline",
        icon: FileText,
    },
    published: {
        label: "Published",
        badge: "success",
        verb: "Publish",
        icon: CheckCircle,
    },
    unpublished: {
        label: "Unpublished",
        badge: "destructive",
        verb: "Unpublish",
        icon: XCircle,
    },
}
