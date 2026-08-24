"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ intervalMs = 3000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const scrollYRef = useRef<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      scrollYRef.current = window.scrollY;
      startTransition(() => {
        router.refresh();
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  useEffect(() => {
    if (!isPending && scrollYRef.current !== null) {
      window.scrollTo(0, scrollYRef.current);
      scrollYRef.current = null;
    }
  }, [isPending]);

  return null;
}
