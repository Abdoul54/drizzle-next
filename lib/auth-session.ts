// lib/auth-session.ts
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getCurrentUser() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        return null;
    }

    return session.user;
}