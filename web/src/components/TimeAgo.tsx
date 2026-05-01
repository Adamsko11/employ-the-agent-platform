"use client";
import { useEffect, useState } from "react";
import { timeSince } from "@/lib/format";

export function TimeAgo({ iso, prefix = "", className = "" }: { iso: string; prefix?: string; className?: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setText(timeSince(iso));
    update();
    const id = setInterval(update, 5000);
    return () => clearInterval(id);
  }, [iso]);
  return <span className={className} suppressHydrationWarning>{text === null ? "" : prefix + text}</span>;
}
