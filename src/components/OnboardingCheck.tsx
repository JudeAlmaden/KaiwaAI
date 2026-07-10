"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { hasAnyKey } from "@/lib/api-keys";

/**
 * Client component that checks if user has API keys.
 * Redirects to onboarding if no keys are found (except on onboarding/settings pages).
 */
export default function OnboardingCheck() {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Don't redirect if already on onboarding or settings pages
    const exemptPaths = ["/onboarding", "/settings"];
    const isExempt = exemptPaths.some((path) => pathname?.startsWith(path));

    if (!isExempt && !hasAnyKey()) {
      router.push("/onboarding");
    } else {
      setTimeout(() => setIsChecking(false), 0);
    }
  }, [router, pathname]);

  // Show nothing while checking (parent layout handles loading state)
  if (isChecking) return null;

  return null;
}
