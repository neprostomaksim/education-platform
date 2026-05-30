"use client";

import { useState, useRef, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  children?: ReactNode;
  className?: string;
  node?: any;
  [key: string]: any;
}

/**
 * Custom code block renderer for ReactMarkdown.
 * Wraps `<pre>` blocks with a copy-to-clipboard button.
 * Used as: components={{ pre: CodeBlockWrapper }}
 */
export function CodeBlockWrapper({ children, ...props }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const handleCopy = async () => {
    const text = preRef.current?.textContent || "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="code-block-wrapper">
      <button
        onClick={handleCopy}
        className="code-copy-btn"
        title={copied ? "Скопировано!" : "Копировать"}
        aria-label="Копировать код"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-success" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
      <pre ref={preRef} {...props}>
        {children}
      </pre>
    </div>
  );
}
