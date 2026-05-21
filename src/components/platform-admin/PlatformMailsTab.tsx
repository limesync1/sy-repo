import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/admin/shared/AdminUI";
import { SendLogView } from "./mails/SendLogView";
import { TemplatesView } from "./mails/TemplatesView";
import { SuppressedView } from "./mails/SuppressedView";

// PlatformMailsTab — admin-overblik over e-mailtrafik på platformen.
// Tre sektioner: Send-log (deduplikeret pr. besked), Skabeloner (live HTML-preview
// + test-mail) og Blokerede modtagere (suppression-listen).
export default function PlatformMailsTab() {
  return (
    <div className="space-y-4">
      <PageHeader title="Mails" description="Leverancer, skabeloner og blokerede modtagere." />
      <Tabs defaultValue="log" className="space-y-4">
        <TabsList>
          <TabsTrigger value="log">Send-log</TabsTrigger>
          <TabsTrigger value="templates">Skabeloner</TabsTrigger>
          <TabsTrigger value="suppressed">Blokerede</TabsTrigger>
        </TabsList>
        <TabsContent value="log" className="m-0"><SendLogView /></TabsContent>
        <TabsContent value="templates" className="m-0"><TemplatesView /></TabsContent>
        <TabsContent value="suppressed" className="m-0"><SuppressedView /></TabsContent>
      </Tabs>
    </div>
  );
}