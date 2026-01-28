import SignIn from "@/components/auth/sign-in"

const Page = () => {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <SignIn />
            </div>
        </div>
    )
}

export default Page