import { highlight } from "@/lib/highlight";
import { CopyButton } from "./CopyButton";

export async function CodeBlock({ code, lang, title, copyLabel, copiedLabel }: {
  code: string; lang: string; title: string; copyLabel: string; copiedLabel: string;
}) {
  const html = await highlight(code, lang);
  return (
    <figure className="code-block">
      <figcaption>
        <span className="code-lang">{lang}</span>
        <span className="code-title">{title}</span>
        <CopyButton text={code} label={copyLabel} done={copiedLabel} />
      </figcaption>
      <div className="code-body" dangerouslySetInnerHTML={{ __html: html }} />
    </figure>
  );
}
