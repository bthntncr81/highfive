import { LegalWebView } from "./_webview";

// KVKK için ayrı sayfa olmadığı için Privacy sayfasını gösterir
// (içerik KVKK aydınlatma metni de içeriyor)
export default function KvkkScreen() {
  return <LegalWebView path="/privacy" title="KVKK Aydınlatma Metni" />;
}
