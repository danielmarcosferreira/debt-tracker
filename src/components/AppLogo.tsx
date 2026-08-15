import Image from "next/image";
import { cn } from "@/lib/utils";

export function AppLogo({
  size = 48,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/web-app-manifest-512x512.png"
      alt="DebtTracker"
      width={size}
      height={size}
      className={cn("rounded-2xl object-cover shadow-lg shadow-indigo-600/30", className)}
    />
  );
}
