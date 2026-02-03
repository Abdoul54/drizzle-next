import { Input } from "@/components/ui/input"

type Props = {
    sentence: string // "React is maintained by ___"
    value?: string
    onChange: (v: string) => void
}

export function FillInBlank({
    sentence,
    value,
    onChange,
}: Props) {
    const [before, after] = sentence.split("___")

    return (
        <p className="flex flex-wrap items-center gap-2 font-medium">
            {before}
            <Input
                className="w-32"
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value)}
            />
            {after}
        </p>
    )
}
