"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, Eye, ImageOff } from "lucide-react";

interface TimesheetPhoto {
  id: string;
  path: string;
  createdAt: string;
}

interface TimesheetData {
  id: string;
  month: number;
  year: number;
  status: string;
  submittedAt: string | null;
  createdAt: string;
  carer: { name: string };
  client: { name: string };
  photos: TimesheetPhoto[];
  _count: { photos: number; entries: number };
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const shortMonths = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const statusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function AdminTimesheetsPage() {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterCarer, setFilterCarer] = useState<string>("ALL");

  const { data: timesheets, isLoading } = useQuery<TimesheetData[]>({
    queryKey: ["timesheets"],
    queryFn: () => fetch("/api/timesheets").then((r) => r.json()),
  });

  // Unique carers for filter
  const carers = [...new Set(timesheets?.map((t) => t.carer.name) || [])].sort();

  const filtered = timesheets?.filter((t) => {
    if (filterStatus !== "ALL" && t.status !== filterStatus) return false;
    if (filterCarer !== "ALL" && t.carer.name !== filterCarer) return false;
    return true;
  });

  // Group by carer
  const grouped = filtered?.reduce<Record<string, TimesheetData[]>>(
    (acc, t) => {
      const key = t.carer.name;
      if (!acc[key]) acc[key] = [];
      acc[key].push(t);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Timesheets</h1>
        <div className="flex gap-2">
          <Select
            value={filterStatus}
            onValueChange={(v) => setFilterStatus(v ?? "ALL")}
          >
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SUBMITTED">Submitted</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filterCarer}
            onValueChange={(v) => setFilterCarer(v ?? "ALL")}
          >
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue placeholder="Carer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Carers</SelectItem>
              {carers.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filtered?.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No timesheets match your filters.
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped || {}).map(([carerName, sheets]) => (
          <div key={carerName} className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide px-1">
              {carerName}
            </h2>
            {sheets.map((ts) => (
              <Link key={ts.id} href={`/admin/timesheets/${ts.id}`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer mb-2">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Photo thumbnail or placeholder */}
                      <div className="shrink-0 w-14 h-14 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                        {ts.photos.length > 0 ? (
                          <img
                            src={`/api/uploads/${ts.photos[0].path}`}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageOff className="h-5 w-5 text-muted-foreground/50" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">
                            {ts.client.name}
                          </p>
                          <Badge
                            variant="secondary"
                            className={`shrink-0 text-xs ${statusColors[ts.status]}`}
                          >
                            {ts.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {monthNames[ts.month - 1]} {ts.year}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          {ts._count.photos > 0 && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Camera className="h-3 w-3" />
                              {ts._count.photos} photo{ts._count.photos !== 1 ? "s" : ""}
                            </span>
                          )}
                          {ts._count.photos === 0 && (
                            <span className="text-xs text-amber-600">
                              No photos uploaded
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
