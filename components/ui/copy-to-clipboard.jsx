"use client";

import { cn } from "@/lib/utils";
import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import { CheckCheck, Clipboard } from "lucide-react";

export default function CopyToClipboard({ text = "none", className }) {
  const [copied, setCopied] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const resetTimerRef = React.useRef(null);

  React.useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const resetCopiedState = React.useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => {
      setCopied(false);
      setOpen(false);
      resetTimerRef.current = null;
    }, 2000);
  }, []);

  async function handleCopy() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        await fallbackCopy(text);
      }
      setCopied(true);
      setOpen(true);
      resetCopiedState();
    } catch (error) {
      console.error("Failed to copy text", error);
    }
  }

  async function fallbackCopy(value) {
    const textArea = document.createElement("textarea");
    textArea.value = value;
    textArea.style.position = "absolute";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand("copy");
      if (!successful) {
        throw new Error("Copy command was unsuccessful");
      }
    } finally {
      textArea.remove();
    }
  }

  const handleOpenChange = (nextOpen) => {
    if (copied) {
      setOpen(true);
      return;
    }
    setOpen(nextOpen);
  };

  return (
    <Tooltip open={open} onOpenChange={handleOpenChange}>
      <TooltipTrigger
        className={cn(
          "max-w-48 text-sm text-muted-foreground truncate text-start",
          className
        )}
        onClick={() => handleCopy()}
      >
        {text}
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="flex items-center gap-1 [&>svg]:size-3.5 px-2.5"
      >
        {copied ? <CheckCheck /> : <Clipboard />}{" "}
        {copied ? "Copied !!" : "Copy"}
      </TooltipContent>
    </Tooltip>
  );
}
