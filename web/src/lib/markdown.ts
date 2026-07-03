// markdown 渲染管线：marked → highlight.js（代码块）→ DOMPurify 白名单净化（spec §9）。
// 消息 body 是不可信输入（跨公司 agent 都能写），白名单 + 外链 noopener 是硬要求。
import DOMPurify from "dompurify";
import hljs from "highlight.js/lib/common";
import { marked } from "marked";

marked.use({
  renderer: {
    code({ text, lang }) {
      const language = lang && hljs.getLanguage(lang) ? lang : undefined;
      const html = language
        ? hljs.highlight(text, { language }).value
        : hljs.highlightAuto(text).value;
      return `<pre><code class="hljs">${html}</code></pre>`;
    },
  },
});

// span/class 是 hljs 高亮产物的载体，必须放行
const ALLOWED_TAGS = [
  "p", "br", "hr", "a", "img",
  "code", "pre", "span",
  "ul", "ol", "li",
  "strong", "em", "del", "blockquote",
  "table", "thead", "tbody", "tr", "th", "td",
  "h1", "h2", "h3", "h4", "h5", "h6",
];
const ALLOWED_ATTR = ["href", "src", "alt", "title", "class", "start"];

// 外链新窗口 + noopener（净化后统一补，用户写不进 target/rel）
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A" && node.hasAttribute("href")) {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

export function renderMarkdown(md: string): string {
  const raw = marked.parse(md, { async: false });
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}
