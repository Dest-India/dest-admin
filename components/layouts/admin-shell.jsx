"use client";

import { Suspense } from "react";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "../ui/separator";
import { Loader } from "@/components/ui/loader";
import Link from "next/link";

function AdminShell({ children }) {
  return (
    <SidebarProvider
      style={{
        "--header-height": "3rem"
      }}
    >
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 items-center justify-start gap-3 border-b px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6!" />
            <Link href="/" className="text-base font-bold">Dest Admin</Link>
        </header>
        <main className="@container/main h-[calc(100dvh-var(--header-height))] md:h-[calc(100dvh-16px-var(--header-height))] overflow-auto p-6 md:px-8">
          <Suspense fallback={<div className="size-full flex items-center justify-center"><Loader /></div>}>
            {children}
          </Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export { AdminShell };
