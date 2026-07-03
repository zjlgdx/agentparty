import { useMemo } from "react";
import { renderMarkdown } from "../lib/markdown";

export function Markdown({ source }: { source: string }) {
  // renderMarkdown 内部已过 DOMPurify 白名单
  const html = useMemo(() => renderMarkdown(source), [source]);
  return <div className="msg-body" dangerouslySetInnerHTML={{ __html: html }} />;
}
