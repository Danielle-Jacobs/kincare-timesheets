"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Clock, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface ClientData {
  id: string;
  name: string;
}

interface TimesheetData {
  id: string;
  month: number;
  year: number;
  status: string;
  client: { name: string };
  updatedAt: string;
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function CarerDashboard() {
  const { data: session } = useSession();
  const now = new Date();

  const { data: clients, isLoading: loadingClients } = useQuery<ClientData[]>({
    queryKey: ["clients"],
    queryFn: () => fetch("/api/clients").then((r) => r.json()),
  });

  const { data: timesheets, isLoading: loadingTimesheets } = useQuery<
    TimesheetData[]
  >({
    queryKey: ["timesheets"],
    queryFn: () => fetch("/api/timesheets").then((r) => r.json()),
  });

  const currentMonthSheets =
    timesheets?.filter(
      (t) => t.month === now.getMonth() + 1 && t.year === now.getFullYear()
    ) || [];

  const recentSheets =
    timesheets
      ?.filter(
        (t) =>
          !(t.month === now.getMonth() + 1 && t.year === now.getFullYear())
      )
      .slice(0, 5) || [];

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-bold">
          Hello, {session?.user?.name?.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground">
          {monthNames[now.getMonth()]} {now.getFullYear()}
        </p>
      </div>

      {/* Current Month */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          This Month
        </h2>
        {loadingClients ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          clients?.map((client) => {
            const existing = currentMonthSheets.find(
              (t) => t.client.name === client.name
            );
            return (
              <Card key={client.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{client.name}</p>
                      {existing ? (
                        <Badge
                          variant="secondary"
                          className={statusColors[existing.status]}
                        >
                          {existing.status}
                        </Badge>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No timesheet yet
                        </p>
                      )}
                    </div>
                    {existing ? (
                      <Link href={`/timesheet/${existing.id}`}>
                        <Button variant="outline" size="sm" className="h-10">
                          <Clock className="h-4 w-4 mr-1" />
                          Continue
                        </Button>
                      </Link>
                    ) : (
                      <Link
                        href={`/timesheet/new?clientId=${client.id}&month=${now.getMonth() + 1}&year=${now.getFullYear()}`}
                      >
                        <Button size="sm" className="h-10">
                          <Plus className="h-4 w-4 mr-1" />
                          Start
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </section>

      {/* Recent Timesheets */}
      {recentSheets.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Recent Timesheets
          </h2>
          {loadingTimesheets ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            recentSheets.map((ts) => (
              <Link key={ts.id} href={`/timesheet/${ts.id}`}>
                <Card className="hover:bg-accent/50 transition-colors mb-2">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{ts.client.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {monthNames[ts.month - 1]} {ts.year}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={statusColors[ts.status]}
                      >
                        {ts.status}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </section>
      )}

      {/* New Timesheet */}
      <Link href="/timesheet/new">
        <Button variant="outline" className="w-full h-12 mt-4">
          <Plus className="h-4 w-4 mr-2" />
          New Timesheet
        </Button>
      </Link>
    </div>
  );
}
