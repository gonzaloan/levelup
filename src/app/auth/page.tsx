import { AuthCallback } from "@/components/AuthCallback";

export const metadata = { title: "Signing in…", robots: { index: false } };

export default function AuthPage() {
  return <main className="redirect"><AuthCallback /></main>;
}
