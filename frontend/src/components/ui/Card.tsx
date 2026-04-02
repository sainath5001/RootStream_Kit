"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

export function Card({
  title,
  description,
  right,
  children,
}: {
  title: string;
  description?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      whileHover={{ scale: 1.01 }}
      className="rs-card rounded-2xl p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {description ? <p className="mt-1 text-sm text-[var(--rs-muted)]">{description}</p> : null}
        </div>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </motion.section>
  );
}

