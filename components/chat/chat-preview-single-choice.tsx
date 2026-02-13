/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Item, ItemMedia, ItemTitle } from "@/components/ui/item";
import { CheckCircle2 } from "lucide-react";
import clsx from "clsx";
import { Direction } from "@/utils/languages";

type Option = {
    id: number;
    label: string;
};

type SelectionValue =
    | { type: "text" }
    | { type: "subtext" }
    | { type: "option"; id: number }
    | null;

interface Props {
    text: string;
    subtext?: string;
    answer: number;
    options: Option[];
    enableSelection?: boolean;
    selectedItem?: SelectionValue;
    onSelection: (v: SelectionValue) => void;
    dir: Direction
}

const ChatPreviewSingleChoice = ({
    text,
    subtext,
    answer,
    options,
    enableSelection = false,
    selectedItem,
    onSelection,
    dir
}: Props) => {

    const handleSelection = (value: SelectionValue) => {
        if (!enableSelection) return;

        // Check if clicking the same item (to deselect)
        const isSame =
            selectedItem?.type === value?.type &&
            (selectedItem as any)?.id === (value as any)?.id;

        const next = isSame ? null : value;

        // Call parent's handler directly
        onSelection(next);
    };


    return (
        <Card className="max-w-xl w-full shadow-xl border-muted/40 rounded-2xl" dir={dir}>
            <CardHeader className="space-y-2">
                {/* <img
                    src="https://media.premiumtimesng.com/wp-content/files/2018/11/uefa-champions-league-rebranding-2018-2021-7.jpg"
                    alt={text}
                    className="w-full h-64 object-cover rounded-xl"
                /> */}

                <div className="space-y-1">

                    {/* Title */}
                    <CardTitle
                        role="button"
                        tabIndex={enableSelection ? 0 : -1}
                        onClick={() => handleSelection({ type: "text" })}
                        className={clsx(
                            "text-xl font-semibold rounded px-2 py-1 transition-all",
                            enableSelection && "hover:bg-info/15 hover:scale-[1.02]",
                            selectedItem?.type === "text" &&
                            "ring-2 ring-info bg-info/10 text-info"
                        )}
                    >
                        {text}
                    </CardTitle>

                    {/* Subtext */}
                    {subtext && (
                        <CardDescription
                            role="button"
                            tabIndex={enableSelection ? 0 : -1}
                            onClick={() => handleSelection({ type: "subtext" })}
                            className={clsx(
                                "text-sm rounded px-2 py-1 transition-all",
                                enableSelection && "hover:bg-info/15 hover:scale-[1.02]",
                                selectedItem?.type === "subtext" &&
                                "ring-2 ring-info bg-info/10 text-info"
                            )}
                        >
                            {subtext}
                        </CardDescription>
                    )}
                </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-2">
                {options.map((opt) => {
                    const isCorrect = answer === opt.id;
                    const isSelected =
                        selectedItem?.type === "option" &&
                        selectedItem.id === opt.id;

                    return (
                        <Item
                            key={opt.id}
                            role="button"
                            tabIndex={enableSelection ? 0 : -1}
                            onClick={() => handleSelection({ type: "option", id: opt.id })}
                            className={clsx(
                                "transition-all duration-200 border border-accent-foreground px-4 py-3 flex items-center justify-between group",
                                enableSelection && "hover:scale-[1.02]",
                                isSelected &&
                                "ring-2 ring-info bg-info/10 border-info shadow-sm",
                                isCorrect &&
                                "border-success bg-success/10",
                                !enableSelection && "opacity-90"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                {isCorrect && (
                                    <ItemMedia className="flex items-center justify-center text-success animate-in zoom-in-50 duration-300">
                                        <CheckCircle2 size={18} />
                                    </ItemMedia>
                                )}

                                <ItemTitle
                                    className={clsx(
                                        "text-sm font-medium transition-colors",
                                        isCorrect && "text-success",
                                        isSelected && !isCorrect && "text-info"
                                    )}
                                >
                                    {opt.label}
                                </ItemTitle>
                            </div>
                        </Item>
                    );
                })}
            </CardContent>
        </Card>
    );
};

export default ChatPreviewSingleChoice;
