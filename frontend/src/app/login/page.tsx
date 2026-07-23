import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">OpalPOS</h1>
        <p className="mt-1 mb-8 text-sm text-zinc-500">
          Sign in to continue
        </p>

        <LoginForm />
      </div>
    </div>
  );
}
