"use client";

import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface SidebarAccordionItem {
  id: string;
  title: string;
  icon: LucideIcon;
  content: ReactNode;
}

interface SidebarAccordionProps {
  items: SidebarAccordionItem[];
}

export function SidebarAccordion({ items }: SidebarAccordionProps) {
  return (
    <div className="lg:hidden mb-6 border rounded-lg">
      <Accordion type="multiple" className="w-full">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <AccordionItem key={item.id} value={item.id} className="border-b-0">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-un-blue" />
                  <span className="font-semibold">{item.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {item.content}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
