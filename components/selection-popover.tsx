"use client";

import { useEffect, useState } from "react";
import {
    Popover,
    PopoverContent,
} from "@/components/ui/popover";

type SelectionPopoverProps = {
    children: React.ReactNode;
    renderActions: (selectedText: string) => React.ReactNode;
};

export function SelectionPopover({
    children,
    renderActions,
}: SelectionPopoverProps) {
    const [open, setOpen] = useState(false);
    const [rect, setRect] = useState<DOMRect | null>(null);
    const [text, setText] = useState("");

    useEffect(() => {
        const onMouseUp = () => {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed) {
                setOpen(false);
                return;
            }

            const range = selection.getRangeAt(0);
            setRect(range.getBoundingClientRect());
            setText(selection.toString());
            setOpen(true);
        };

        document.addEventListener("mouseup", onMouseUp);
        return () => document.removeEventListener("mouseup", onMouseUp);
    }, []);

    return (
        <div className="relative">
            {children}

            {rect && (
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverContent
                        side="top"
                        align="center"
                        className="w-fit"
                        style={{
                            position: "fixed",
                            padding: 0,
                            backgroundColor: "transparent",
                            left: rect.left + rect.width / 2,
                            top: rect.top,
                            transform: "translate(-50%, -120%)",
                        }}
                    >
                        {renderActions(text)}
                    </PopoverContent>
                </Popover>
            )}
        </div>
    );
}
