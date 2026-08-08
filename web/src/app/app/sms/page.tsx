"use client";

import { SmsStatus } from "@/components/sms/SmsStatus";
import { SmsSend } from "@/components/sms/SmsSend";
import { SmsHistory } from "@/components/sms/SmsHistory";
import { SmsTemplates } from "@/components/sms/SmsTemplates";
import { PageHeader } from "@/components/ui/Surface";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";

export default function SmsPage() {
  return (
    <main className="space-y-6">
      <PageHeader
        title="Дугаарлуу мессеж"
        description="SMS явуулалтыг удирдах, түүхийг харах, загварыг хөгжүүлэх."
      />
      <Tabs defaultValue="status">
        <TabsList className="bg-surface border-b border-line">
          <TabsTrigger value="status">Төлөв</TabsTrigger>
          <TabsTrigger value="send">Илгээх</TabsTrigger>
          <TabsTrigger value="history">Түүх</TabsTrigger>
          <TabsTrigger value="templates">Загварууд</TabsTrigger>
        </TabsList>
        <TabsContent value="status" className="mt-6">
          <SmsStatus />
        </TabsContent>
        <TabsContent value="send" className="mt-6">
          <SmsSend />
        </TabsContent>
        <TabsContent value="history" className="mt-6">
          <SmsHistory />
        </TabsContent>
        <TabsContent value="templates" className="mt-6">
          <SmsTemplates />
        </TabsContent>
      </Tabs>
    </main>
  );
}
