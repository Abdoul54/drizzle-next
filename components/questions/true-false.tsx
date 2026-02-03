import { Button } from "@/components/ui/button"

type Props = {
    question: string
    value?: boolean
    onChange: (v: boolean) => void
}

export function TrueFalse({ question, value, onChange }: Props) {
    return (
        <div className="space-y-3">
            <p className="font-medium">{question}</p>

            <div className="flex gap-3">
                <Button
                    variant={value === true ? "default" : "outline"}
                    onClick={() => onChange(true)}
                >
                    True
                </Button>
                <Button
                    variant={value === false ? "default" : "outline"}
                    onClick={() => onChange(false)}
                >
                    False
                </Button>
            </div>
        </div>
    )
}
