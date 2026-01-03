/**
 * WorkOrderCard Component
 *
 * Displays a comprehensive work order card in the chat interface when a contractor
 * is booked. Shows all relevant information including priority, contractor details,
 * scheduled time, and attached photos.
 *
 * Features:
 * - Priority-based color coding for urgency levels
 * - Photo attachment gallery with modal viewer
 * - Responsive layout and accessibility support
 */

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardListIcon,
  UserIcon,
  CalendarIcon,
  WrenchIcon,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface WorkOrderAttachment {
  id: string;
  url: string;
  filename: string;
  mediaType: string;
}

interface WorkOrder {
  id: string;
  tenant_id: string;
  contractor_id: string;
  contractor_name: string;
  trade: string;
  created_at: string;
  scheduledDate?: string;
  scheduledTime?: string;
  priority: string;
  issue_summary: string;
  status: string;
  attachments?: WorkOrderAttachment[];
}

interface WorkOrderCardProps {
  workOrder: WorkOrder;
}

const priorityVariants: Record<
  string,
  {
    variant: "default" | "secondary" | "destructive" | "outline";
    className: string;
  }
> = {
  emergency: { variant: "destructive", className: "" },
  urgent: { variant: "destructive", className: "" },
  high: { variant: "default", className: "bg-amber-500 hover:bg-amber-600" },
  standard: { variant: "secondary", className: "" },
  low: { variant: "outline", className: "" },
};

export const WorkOrderCard = ({ workOrder }: WorkOrderCardProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const priorityConfig =
    priorityVariants[workOrder.priority.toLowerCase()] ||
    priorityVariants.standard;

  const hasAttachments =
    workOrder.attachments && workOrder.attachments.length > 0;

  return (
    <Card className="mt-3 border-primary/20 bg-primary/5">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardListIcon className="size-4 text-primary" />
            <CardTitle className="text-sm font-semibold">
              Work Order Created
            </CardTitle>
          </div>
          <Badge
            variant={priorityConfig.variant}
            className={cn("text-xs uppercase", priorityConfig.className)}>
            {workOrder.priority}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="grid gap-2 text-sm">
          {/* Work Order ID */}
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground min-w-[70px]">ID:</span>
            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
              {workOrder.id}
            </span>
          </div>

          {/* Issue Summary */}
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground min-w-[70px]">Issue:</span>
            <span className="font-medium">{workOrder.issue_summary}</span>
          </div>

          {/* Contractor */}
          <div className="flex items-center gap-2">
            <UserIcon className="size-3.5 text-muted-foreground" />
            <span className="text-muted-foreground min-w-[55px]">
              Contractor:
            </span>
            <span className="font-medium">
              {workOrder.contractor_name}
              <span className="text-muted-foreground font-normal ml-1">
                ({workOrder.trade})
              </span>
            </span>
          </div>

          {/* Scheduled Date */}
          {workOrder.scheduledDate && (
            <div className="flex items-center gap-2">
              <CalendarIcon className="size-3.5 text-muted-foreground" />
              <span className="text-muted-foreground min-w-[55px]">
                Scheduled:
              </span>
              <span className="font-medium">
                {workOrder.scheduledDate}
                {workOrder.scheduledTime && ` at ${workOrder.scheduledTime}`}
              </span>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center gap-2">
            <WrenchIcon className="size-3.5 text-muted-foreground" />
            <span className="text-muted-foreground min-w-[55px]">Status:</span>
            <Badge
              variant="outline"
              className="text-xs capitalize">
              {workOrder.status}
            </Badge>
          </div>

          {/* Photo Attachments */}
          {hasAttachments && (
            <div className="mt-2 pt-2 border-t">
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="size-3.5 text-muted-foreground" />
                <span className="text-muted-foreground text-xs">
                  Attached Photos ({workOrder.attachments!.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {workOrder.attachments!.map((attachment) => (
                  <button
                    key={attachment.id}
                    onClick={() => setSelectedImage(attachment.url)}
                    className="relative w-20 h-20 rounded-md overflow-hidden border border-border hover:border-primary transition-colors cursor-pointer group">
                    <img
                      src={attachment.url}
                      alt={attachment.filename}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={selectedImage}
              alt="Full size"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <line
                  x1="18"
                  y1="6"
                  x2="6"
                  y2="18"></line>
                <line
                  x1="6"
                  y1="6"
                  x2="18"
                  y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};
