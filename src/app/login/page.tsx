import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <p className="text-sm font-medium text-slate-500">
          Commercial Equipment Finance Platform
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Sign in</h1>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
