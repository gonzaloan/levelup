import { redirect } from "next/navigation";
import { DEFAULT_LOCALE } from "@/i18n/config";

// Root simply forwards to the default locale. A client script in the locale
// layout upgrades to the visitor's stored/preferred locale.
export default function RootIndex() {
  redirect(`/${DEFAULT_LOCALE}`);
}
