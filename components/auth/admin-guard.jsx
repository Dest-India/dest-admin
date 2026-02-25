"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { clearAdminSession, readAdminSession } from "@/lib/auth";
import { Loader } from "@/components/ui/loader";

function AdminGuard({ children }) {
  const router = useRouter();
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    try {
      const session = readAdminSession();
      if (!session) {
        router.replace("/");
        return;
      }

      if (session.expiresAt <= Date.now()) {
        clearAdminSession();
        router.replace("/");
        return;
      }

      setVerified(true);
    } finally {
      setChecking(false);
    }
  }, [router]);

  if (checking) {
    return (
      <div className="flex h-dvh w-full items-center justify-center">
        <Loader className="size-6" />
      </div>
    );
  }

  if (!verified) {
    return null;
  }

  return children;
}

export { AdminGuard };
