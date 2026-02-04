import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db"; // your drizzle instance
import * as schema from '@/db/schema';
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    database: drizzleAdapter(db, {
        provider: "pg", // or "mysql", "sqlite",
        schema: schema
    }),
    emailAndPassword: {
        enabled: true,
        async sendResetPassword(data, request) {
            // Send an email to the user with a link to reset their password
        },
        plugins: [
            nextCookies(),
        ]
    }
});