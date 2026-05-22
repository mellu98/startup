"use client";

import React from "react";
import { markdownToHtml } from "@/lib/markdown";

interface SkillRendererProps {
  content: string;
}

export default function SkillRenderer({ content }: SkillRendererProps) {
  return (
    <div
      className="prose prose-zinc max-w-none dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
    />
  );
}
