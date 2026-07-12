import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = ["p", "br", "strong", "b", "em", "i", "ul", "ol", "li"];

export function RichTextContent({ html }: { html: string }) {
  // Alte Einträge (vor Einführung des Rich-Text-Editors) sind reiner Text
  // ohne HTML-Tags - werden weiterhin über whitespace-pre-wrap dargestellt,
  // damit vorhandene Zeilenumbrüche nicht verloren gehen.
  if (!html.includes("<")) {
    return (
      <p className="whitespace-pre-wrap text-sm text-stone-600">{html}</p>
    );
  }

  const safeHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: [],
  });

  return (
    <div
      className="text-sm text-stone-600 [&_li]:ml-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5"
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
