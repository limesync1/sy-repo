import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/admin/shared/AdminUI";
import { BusinessPlansView } from "./subscriptions/BusinessPlansView";
import { CustomerSubscriptionsView } from "./subscriptions/CustomerSubscriptionsView";

const PlatformSubscriptionsTab = () => {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Abonnementer"
        description="Platform-planer (SaaS) og tilbagevendende kunde-services."
      />
      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans">Platform-planer</TabsTrigger>
          <TabsTrigger value="customer">Kunde-abonnementer</TabsTrigger>
        </TabsList>
        <TabsContent value="plans" className="space-y-4"><BusinessPlansView /></TabsContent>
        <TabsContent value="customer" className="space-y-4"><CustomerSubscriptionsView /></TabsContent>
      </Tabs>
    </div>
  );
};

export default PlatformSubscriptionsTab;