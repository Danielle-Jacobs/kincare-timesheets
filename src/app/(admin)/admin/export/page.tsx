"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface TimesheetData {
  id: string;
  month: number;
  year: number;
  status: string;
  carer: { name: string };
  client: { name: string };
  entries: {
    day: number;
    clockIn: string | null;
    clockOut: string | null;
  }[];
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function ExportPage() {
  const [selectedId, setSelectedId] = useState("");

  const { data: timesheets } = useQuery<TimesheetData[]>({
    queryKey: ["timesheets"],
    queryFn: () => fetch("/api/timesheets").then((r) => r.json()),
  });

  const approved = timesheets?.filter(
    (t) => t.status === "APPROVED" || t.status === "SUBMITTED"
  );

  async function exportCSV() {
    if (!selectedId) {
      toast.error("Select a timesheet first");
      return;
    }

    const res = await fetch(`/api/timesheets/${selectedId}`);
    const ts = await res.json();

    const rows = [
      ["Day", "Clock In", "Clock Out", "Hours"],
      ...ts.entries
        .filter(
          (e: { clockIn: string | null; clockOut: string | null }) =>
            e.clockIn && e.clockOut
        )
        .map(
          (e: {
            day: number;
            clockIn: string;
            clockOut: string;
          }) => {
            const [inH, inM] = e.clockIn.split(":").map(Number);
            const [outH, outM] = e.clockOut.split(":").map(Number);
            const hours = ((outH * 60 + outM - (inH * 60 + inM)) / 60).toFixed(
              1
            );
            return [e.day, e.clockIn, e.clockOut, hours];
          }
        ),
    ];

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timesheet-${ts.carer.name}-${monthNames[ts.month - 1]}-${ts.year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  }

  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-2xl font-bold">Export</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Timesheet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select Timesheet</Label>
            <Select value={selectedId} onValueChange={(v) => setSelectedId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a timesheet" />
              </SelectTrigger>
              <SelectContent>
                {approved?.map((ts) => (
                  <SelectItem key={ts.id} value={ts.id}>
                    {ts.carer.name} — {ts.client.name} ({monthNames[ts.month - 1]}{" "}
                    {ts.year})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full h-12" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
