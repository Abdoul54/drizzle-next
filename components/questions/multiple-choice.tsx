import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "../ui/radio-group"

type Props = {
    question: string
    options: string[]
    value?: string
    onChange: (v: string) => void
}

export function MultipleChoice({
    question,
    options,
    value,
    onChange,
}: Props) {
    return (
        <div className="space-y-3">
            <p className="font-medium">{question}</p>

            <RadioGroup
                value={value}
                onValueChange={onChange}
                className="space-y-2"
            >
                {options.map((opt) => (
                    <Label
                        key={opt}
                        className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-muted"
                    >
                        <RadioGroupItem value={opt} />
                        {opt}
                    </Label>
                ))}
            </RadioGroup>
        </div>
    )
}
