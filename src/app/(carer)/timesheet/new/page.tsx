"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function NewTimesheetPage() {
  return (
    <Suspense>
      <NewTimesheetForm />
    </Suspense>
  );
}

function NewTimesheetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = new Date();

  const [clientId, setClientId] = useState(searchParams.get("clientId") || "");
  const [month, setMonth] = useState(
    searchParams.get("month") || String(now.getMonth() + 1)
  );
  const [year, setYear] = useState(
    searchParams.get("year") || String(now.getFullYear())
  );

  const { data: clients } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["clients"],
    queryFn: () => fetch("/api/clients").then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          month: Number(month),
          year: Number(year),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create timesheet");
      }
      return res.json();
    },
    onSuccess: (data) => {
      router.push(`/timesheet/${data.id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // If clientId provided via URL params, auto-create
  const autoCreate = searchParams.get("clientId") && searchParams.get("month");

  return (
    <div className="p-4 max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>New Timesheet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Client</Label>
            <Select value={clientId} onValueChange={(v) => setClientId(v ?? "")}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={month} onValueChange={(v) => setMonth(v ?? "")}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((name, i) => (
                    <SelectItem key={i} value={String(i + 1)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={year} onValueChange={(v) => setYear(v ?? "")}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(
                    (y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            className="w-full h-12 text-base"
            onClick={() => createMutation.mutate()}
            disabled={!clientId || createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create Timesheet"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
