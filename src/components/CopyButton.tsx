"use client";
import { useState } from "react";
import { Icon } from "./Icon";

export function CopyButton({ text, label, done }: { text: string; label: string; done: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className="copy-btn" aria-label={label}
      onClick={() => { navigator.clipboard?.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1500); }).catch(() => {}); }}>
      <Icon name={ok ? "check" : "copy"} size={15} />
      <span>{ok ? done : label}</span>
    </button>
  );
}
