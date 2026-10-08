import * as React from "react";
import {
  MessageSquare,
  FileText,
  Radio,
  Settings,
  Sparkles,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TemplatesManager } from "@/components/admin/templates-manager";
import { BroadcastCampaigns } from "@/components/admin/broadcast-campaigns";
import { MessagingSettingsLogs } from "@/components/admin/messaging-settings-logs";
import type { Lead } from "@/lib/db";

interface MessagingTabProps {
  leads: Lead[];
  authKey: string;
}

export function MessagingTab({ leads, authKey }: MessagingTabProps) {
  const [subTab, setSubTab] = React.useState<"templates" | "broadcast" | "settings">("templates");

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Aba */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#eeeeee] flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#76abae]" />
              Central de Mensageria & Disparos
            </h2>
            <Badge className="bg-[#76abae]/10 text-[#76abae] border border-[#76abae]/30 text-[10px] uppercase font-mono tracking-wider rounded-none">
              Evolution v2 + SMTP
            </Badge>
          </div>
          <p className="text-xs text-[#9da5b4] mt-1">
            Gestão visual de templates, automação de avisos e campanhas segmentadas para clientes
          </p>
        </div>
      </div>

      {/* Navegação por Sub-Abas com Tabs do shadcn */}
      <Tabs
        value={subTab}
        onValueChange={(val) => setSubTab(val as "templates" | "broadcast" | "settings")}
        className="w-full space-y-6"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <TabsList className="bg-[#222831] border border-white/10 p-1 rounded-none h-auto gap-1">
            <TabsTrigger
              value="templates"
              className="data-[state=active]:bg-[#76abae] data-[state=active]:text-[#222831] text-[#9da5b4] text-xs uppercase font-extrabold tracking-wider rounded-none px-4 py-2 cursor-pointer flex items-center gap-2"
            >
              <FileText className="w-3.5 h-3.5" />
              Gestor de Templates
            </TabsTrigger>

            <TabsTrigger
              value="broadcast"
              className="data-[state=active]:bg-[#76abae] data-[state=active]:text-[#222831] text-[#9da5b4] text-xs uppercase font-extrabold tracking-wider rounded-none px-4 py-2 cursor-pointer flex items-center gap-2"
            >
              <Radio className="w-3.5 h-3.5" />
              Disparo em Massa
            </TabsTrigger>

            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-[#76abae] data-[state=active]:text-[#222831] text-[#9da5b4] text-xs uppercase font-extrabold tracking-wider rounded-none px-4 py-2 cursor-pointer flex items-center gap-2"
            >
              <Settings className="w-3.5 h-3.5" />
              Conexões & Logs
            </TabsTrigger>
          </TabsList>

          <span className="text-[11px] font-mono text-[#9da5b4] hidden sm:inline-block">
            {leads.length} leads na base
          </span>
        </div>

        {/* Sub-Aba 1: Gestor de Templates */}
        <TabsContent value="templates" className="mt-0 outline-none">
          <TemplatesManager authKey={authKey} />
        </TabsContent>

        {/* Sub-Aba 2: Disparo em Massa */}
        <TabsContent value="broadcast" className="mt-0 outline-none">
          <BroadcastCampaigns leads={leads} authKey={authKey} />
        </TabsContent>

        {/* Sub-Aba 3: Configurações e Logs */}
        <TabsContent value="settings" className="mt-0 outline-none">
          <MessagingSettingsLogs authKey={authKey} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
