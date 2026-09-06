"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="shrink-0 text-sm text-slate-500 underline underline-offset-2 hover:text-slate-900"
    >
      Sign out
    </button>
  );
}
