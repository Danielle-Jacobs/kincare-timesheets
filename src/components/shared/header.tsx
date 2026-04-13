"use client";

import { useSession, signOut } from "next-auth/react";
import { Heart, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6 text-primary fill-primary/20" />
          <div>
            <p className="text-sm font-semibold text-primary leading-tight">
              KinCare
            </p>
            <p className="text-[10px] text-muted-foreground -mt-0.5">
              Senior Support
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:block">
            {session?.user?.name}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="h-9 w-9"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
