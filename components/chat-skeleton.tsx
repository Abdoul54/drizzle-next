"use client";

export default function ChatSkeleton() {
    const bubbles = [
        // User message - short question
        { role: "user", width: "w-48", height: "h-10" },
        // Assistant response - longer
        { role: "assistant", width: "w-full max-w-2xl", height: "h-32" },
        // User follow-up
        { role: "user", width: "w-64", height: "h-10" },
        // Assistant response - medium
        { role: "assistant", width: "w-full max-w-xl", height: "h-24" },
        // User message
        { role: "user", width: "w-40", height: "h-10" },
        // Assistant typing/response
        { role: "assistant", width: "w-full max-w-2xl", height: "h-40" },
    ];

    return (
        <div className="flex flex-col w-full gap-6 animate-pulse py-4">
            {bubbles?.map((b, i) => (
                <div
                    key={i}
                    className={`flex ${b.role === "user" ? "justify-end" : "justify-start"}`}
                >
                    <div
                        className={`${b.width} ${b.height} rounded-2xl ${b.role === "user"
                            ? "bg-primary/20 rounded-sm"
                            : "bg-muted rounded-sm"
                            }`}
                    />
                </div>
            ))}
        </div>
    );
}