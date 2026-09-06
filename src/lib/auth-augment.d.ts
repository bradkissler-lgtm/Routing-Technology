import type { DefaultSession } from "next-auth";
import type { UserRole } from "@prisma/client";

// Extends next-auth's built-in types with the two fields our authorize()
// callback returns and our session/jwt callbacks propagate (src/lib/auth.ts)
// — role and dealerId are what every access check in this app relies on.
declare module "next-auth" {
  interface User {
    role: UserRole;
    dealerId: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      dealerId: string | null;
    } & DefaultSession["user"];
  }
}

// "next-auth/jwt" re-exports JWT from "@auth/core/jwt" via `export *`, so
// the augmentation has to target the module the interface is actually
// declared in for TypeScript's declaration merging to apply.
declare module "@auth/core/jwt" {
  interface JWT {
    role: UserRole;
    dealerId: string | null;
  }
}
