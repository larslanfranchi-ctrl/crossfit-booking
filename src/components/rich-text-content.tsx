import sanitizeHtml from "sanitize-html";

// sanitize-html statt isomorphic-dompurify: DOMPurify braucht ein DOM und
// zieht auf dem Server jsdom mit (~9,7 MB samt tough-cookie, whatwg-url,
// parse5). Das landete im Function-Bundle der Termin-Detailseite und
// verlängerte deren Cold Start. sanitize-html parst mit htmlparser2 und
// kommt ohne DOM aus - rund 1,8 MB, davon nichts doppelt, weil postcss
// über Tailwind ohnehin im Baum ist.
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

  // Wie zuvor: nicht erlaubte Tags fallen weg, ihr Textinhalt bleibt
  // erhalten. Ausnahme sind script/style & Co., deren Inhalt sanitize-html
  // per Default komplett verwirft (nonTextTags) - dasselbe Verhalten wie
  // DOMPurify. Attribute sind durchgängig gesperrt.
  const safeHtml = sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {},
  });

  return (
    <div
      className="text-sm text-stone-600 [&_li]:ml-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5"
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
