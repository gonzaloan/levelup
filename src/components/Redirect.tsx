"use client";
// Client-side redirect for retired routes (static export can't do server
// redirects). Sends old surfaces to their new home so no link 404s.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function Redirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => { router.replace(to); }, [to, router]);
  return (
    <div className="wrap" style={{ padding: "var(--s-16) var(--s-6)", textAlign: "center" }}>
      <p className="dim">…</p>
    </div>
  );
}
