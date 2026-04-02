"use client";

import Image from "next/image";
import Link from "next/link";

type Props = {
  /** Visual size of the logo box (image scales inside with object-contain). */
  size?: "sm" | "md";
  withLink?: boolean;
  className?: string;
};

const box = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
} as const;

export function BrandLogo({ size = "md", withLink = false, className = "" }: Props) {
  const inner = (
    <span className={`relative inline-block shrink-0 ${box[size]} ${className}`}>
      <Image
        src="/logo.png"
        alt="RootStream"
        fill
        className="object-contain"
        sizes={size === "sm" ? "32px" : "40px"}
        priority
      />
    </span>
  );

  if (withLink) {
    return (
      <Link href="/" className="inline-flex shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rs-orange)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--rs-bg)] rounded-lg">
        {inner}
      </Link>
    );
  }

  return inner;
}
