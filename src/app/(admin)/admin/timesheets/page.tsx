"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

interface TimesheetData {
  id: string;
  month: number;
  year: number;
  status: string;
  submittedAt: string | null;
  carer: { name: string };
  client: { name: string };
}

const monthNames = [
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
  const { data: timesheets, isLoading } = useQuery<TimesheetData[]>({
    queryKey: ["timesheets"],
    queryFn: () => fetch("/api/timesheets").then((r) => r.json()),
  });

  return (
    <div className="space-y-4 max-w-4xl">
      <h1 className="text-2xl font-bold">All Timesheets</h1>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Carer</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timesheets?.map((ts) => (
                <TableRow key={ts.id}>
                  <TableCell className="font-medium">
                    {ts.carer.name}
                  </TableCell>
                  <TableCell>{ts.client.name}</TableCell>
                  <TableCell>
                    {monthNames[ts.month - 1]} {ts.year}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={statusColors[ts.status]}
                    >
                      {ts.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/timesheets/${ts.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
