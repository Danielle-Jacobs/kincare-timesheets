"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight } from "lucide-react";

interface TimesheetData {
  id: string;
  month: number;
  year: number;
  status: string;
  client: { name: string };
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const statusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function TimesheetsListPage() {
  const { data: timesheets, isLoading } = useQuery<TimesheetData[]>({
    queryKey: ["timesheets"],
    queryFn: () => fetch("/api/timesheets").then((r) => r.json()),
  });

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-bold">My Timesheets</h1>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : timesheets?.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No timesheets yet. Start one from the dashboard.
        </p>
      ) : (
        timesheets?.map((ts) => (
          <Link key={ts.id} href={`/timesheet/${ts.id}`}>
            <Card className="hover:bg-accent/50 transition-colors mb-2">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{ts.client.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {monthNames[ts.month - 1]} {ts.year}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className={statusColors[ts.status]}>
                    {ts.status}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))
      )}
    </div>
  );
}
