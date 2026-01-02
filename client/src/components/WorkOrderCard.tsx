import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardListIcon,
  UserIcon,
  CalendarIcon,
  WrenchIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  const priorityConfig =
    priorityVariants[workOrder.priority.toLowerCase()] ||
    priorityVariants.standard;

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
        </div>
      </CardContent>
    </Card>
  );
};
