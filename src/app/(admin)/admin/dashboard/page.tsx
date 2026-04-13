"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, Clock, CheckCircle, XCircle } from "lucide-react";

interface TimesheetData {
  id: string;
  status: string;
  month: number;
  year: number;
  carer: { name: string };
  client: { name: string };
}

export default function AdminDashboard() {
  const { data: timesheets, isLoading } = useQuery<TimesheetData[]>({
    queryKey: ["timesheets"],
    queryFn: () => fetch("/api/timesheets").then((r) => r.json()),
  });

  const counts = {
    pending: timesheets?.filter((t) => t.status === "SUBMITTED").length || 0,
    approved: timesheets?.filter((t) => t.status === "APPROVED").length || 0,
    rejected: timesheets?.filter((t) => t.status === "REJECTED").length || 0,
    draft: timesheets?.filter((t) => t.status === "DRAFT").length || 0,
  };

  const stats = [
    {
      label: "Pending Review",
      value: counts.pending,
      icon: Clock,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Approved",
      value: counts.approved,
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Rejected",
      value: counts.rejected,
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "In Progress",
      value: counts.draft,
      icon: ClipboardList,
      color: "text-muted-foreground",
      bg: "bg-muted",
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) =>
          isLoading ? (
            <Skeleton key={stat.label} className="h-24" />
          ) : (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Recent pending */}
      {counts.pending > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Awaiting Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {timesheets
              ?.filter((t) => t.status === "SUBMITTED")
              .slice(0, 5)
              .map((t) => (
                <a
                  key={t.id}
                  href={`/admin/timesheets/${t.id}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{t.carer.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.client.name}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {t.month}/{t.year}
                  </span>
                </a>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
