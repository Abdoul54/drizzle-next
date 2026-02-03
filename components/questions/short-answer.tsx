import { Input } from "@/components/ui/input"

type Props = {
    question: string
    value?: string
    onChange: (v: string) => void
}

export function ShortAnswer({
    question,
    value,
    onChange,
}: Props) {
    return (
        <div className="space-y-3">
            <p className="font-medium">{question}</p>
            <Input
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Your answer"
            />
        </div>
    )
}
