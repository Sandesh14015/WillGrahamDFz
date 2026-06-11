import React from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateCase, getListCasesQueryKey, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function CaseNew() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [form, setForm] = React.useState({
    name: "",
    investigator: "",
    description: "",
    priority: "medium",
    tags: "",
  });

  const createCase = useCreateCase({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListCasesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        navigate(`/cases/${data.id}`);
      },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.investigator) return;
    createCase.mutate({
      data: {
        name: form.name,
        investigator: form.investigator,
        description: form.description || undefined,
        priority: form.priority as "low" | "medium" | "high" | "critical",
        tags: form.tags || undefined,
      },
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/cases">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-mono text-primary uppercase">// NEW INVESTIGATION</h1>
          <p className="text-muted-foreground text-sm font-mono mt-1 opacity-70">INITIALIZE CASE FILE</p>
        </div>
      </div>

      <Card className="bg-card/30 border-border">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase text-muted-foreground">Case Name *</Label>
              <Input
                placeholder="Operation Nightfall"
                className="font-mono bg-card/50"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase text-muted-foreground">Lead Investigator *</Label>
              <Input
                placeholder="Jane Smith"
                className="font-mono bg-card/50"
                value={form.investigator}
                onChange={e => setForm(f => ({ ...f, investigator: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase text-muted-foreground">Description</Label>
              <Textarea
                placeholder="Brief description of the investigation..."
                className="font-mono bg-card/50 min-h-[100px]"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase text-muted-foreground">Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="font-mono bg-card/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">LOW</SelectItem>
                    <SelectItem value="medium">MEDIUM</SelectItem>
                    <SelectItem value="high">HIGH</SelectItem>
                    <SelectItem value="critical">CRITICAL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase text-muted-foreground">Tags</Label>
                <Input
                  placeholder="malware, phishing, ..."
                  className="font-mono bg-card/50"
                  value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                />
              </div>
            </div>

            {createCase.error && (
              <div className="p-3 border border-destructive/50 bg-destructive/10 text-destructive text-sm font-mono rounded flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Failed to create case. Please try again.
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="font-mono" disabled={createCase.isPending || !form.name || !form.investigator}>
                {createCase.isPending ? "CREATING..." : "INITIALIZE CASE"}
              </Button>
              <Link href="/cases">
                <Button type="button" variant="outline" className="font-mono">CANCEL</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
