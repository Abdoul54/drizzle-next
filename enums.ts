import { FileText, CheckCircle, XCircle } from 'lucide-react'

export const QuizStatuses = {
    draft: {
        label: 'Draft',
        badge: 'outline',
        icon: FileText,
    },
    published: {
        label: 'Published',
        badge: 'success',
        verb: 'Publish',
        icon: CheckCircle,
    },
    unpublished: {
        label: 'Unpublished',
        badge: 'destructive',
        verb: 'Unpublish',
        icon: XCircle,
    },
}
