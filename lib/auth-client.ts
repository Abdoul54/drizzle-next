import {
    createAuthClient
} from "better-auth/react";
import { auth } from "./auth";
import { inferAdditionalFields } from "better-auth/client/plugins";


export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL,
    plugins: [inferAdditionalFields<typeof auth>()],

});

export type Session = typeof authClient.$Infer.Session

export const {
    signIn,
    signOut,
    signUp,
    useSession
} = authClient;