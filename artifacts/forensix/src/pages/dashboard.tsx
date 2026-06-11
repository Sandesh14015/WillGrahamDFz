import React from "react";
import { useGetDashboardStats } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, HardDrive, ShieldAlert, FolderOpen, Clock, AlertTriangle, CheckCircle2, Search } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

function StatCard({ title, value, sub, icon: Icon, accent }: {
  title: string; value: number | string; sub: string;
  icon: React.ElementType; accent?: string;
}) {
  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold font-mono ${accent ?? "text-primary"}`}>{value}</div>
        <p className="text-xs text-muted-foreground font-mono mt-1 uppercase">{sub}</p>
      </CardContent>
    </Card>
  );
}

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  evidence: HardDrive,
  case: FolderOpen,
  finding: AlertTriangle,
  analysis: Activity,
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/20 text-blue-500 border-blue-500/50",
  active: "bg-green-500/20 text-green-500 border-green-500/50",
  closed: "bg-muted text-muted-foreground border-border",
  archived: "bg-muted/50 text-muted-foreground border-transparent",
};

export default function Dashboard() {
  const { data: stats, isLoading, error } = useGetDashboardStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 border border-destructive bg-destructive/10 text-destructive rounded-md font-mono">
        ERR_FETCH_STATS: Failed to load dashboard statistics.
      </div>
    );
  }

  const analyzedPct = stats.totalEvidence > 0
    ? Math.round((stats.analyzedEvidence / stats.totalEvidence) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-mono text-primary uppercase">// CMD_CENTER</h1>
        <p className="text-muted-foreground text-sm font-mono mt-1 opacity-70">
          SYSTEM STATUS: NOMINAL • {new Date().toISOString().substring(0, 19).replace("T", " ")} UTC
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Cases" value={stats.totalCases} sub={`${stats.activeCases} ACTIVE`} icon={FolderOpen} />
        <StatCard title="Evidence Files" value={stats.totalEvidence} sub={`${stats.analyzedEvidence} ANALYZED`} icon={HardDrive} />
        <StatCard title="Analysis Coverage" value={`${analyzedPct}%`} sub="FILES PROCESSED" icon={CheckCircle2} accent={analyzedPct === 100 ? "text-green-400" : analyzedPct > 50 ? "text-yellow-400" : "text-primary"} />
        <StatCard title="Active Cases" value={stats.activeCases} sub={`${stats.totalCases - stats.activeCases} IDLE`} icon={ShieldAlert} accent={stats.activeCases > 3 ? "text-orange-400" : "text-primary"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card/30 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentActivity.length === 0 ? (
              <p className="text-muted-foreground font-mono text-sm p-4 text-center">NO ACTIVITY — UPLOAD EVIDENCE TO BEGIN</p>
            ) : (
              <div className="space-y-3">
                {stats.recentActivity.map((event) => {
                  const Icon = ACTIVITY_ICONS[event.type] ?? Activity;
                  return (
                    <div key={event.id} className="flex items-start gap-3 p-2 rounded hover:bg-accent/30 transition-colors">
                      <div className="w-6 h-6 rounded flex items-center justify-center bg-primary/10 border border-primary/20 shrink-0 mt-0.5">
                        <Icon className="h-3 w-3 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground/80 truncate">{event.description}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {format(new Date(event.timestamp), "yyyy-MM-dd HH:mm")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-card/30 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono uppercase text-muted-foreground flex items-center gap-2">
                <FolderOpen className="h-4 w-4" /> Cases by Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.casesByStatus.length === 0 ? (
                <p className="text-muted-foreground font-mono text-sm text-center py-2">No cases yet</p>
              ) : (
                <div className="space-y-2">
                  {stats.casesByStatus.map((s) => (
                    <div key={s.status} className="flex items-center justify-between">
                      <Badge variant="outline" className={`font-mono text-xs uppercase ${STATUS_COLORS[s.status] ?? "bg-muted text-muted-foreground border-border"}`}>
                        {s.status}
                      </Badge>
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 rounded-full bg-primary/20 overflow-hidden w-32">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: stats.totalCases > 0 ? `${(s.count / stats.totalCases) * 100}%` : "0%" }}
                          />
                        </div>
                        <span className="font-mono text-sm text-primary w-6 text-right">{s.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {stats.evidenceByType.length > 0 && (
            <Card className="bg-card/30 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono uppercase text-muted-foreground flex items-center gap-2">
                  <HardDrive className="h-4 w-4" /> Evidence by Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.evidenceByType.slice(0, 5).map((e) => (
                    <div key={e.type} className="flex items-center justify-between">
                      <span className="text-sm font-mono text-muted-foreground">{e.type}</span>
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 rounded-full bg-primary/20 overflow-hidden w-24">
                          <div
                            className="h-full bg-primary/70 rounded-full"
                            style={{ width: stats.totalEvidence > 0 ? `${(e.count / stats.totalEvidence) * 100}%` : "0%" }}
                          />
                        </div>
                        <span className="font-mono text-sm text-primary w-6 text-right">{e.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-card/30 border-border border-primary/20 hover:bg-card/50 transition-colors">
            <Link href="/cases">
              <CardContent className="p-4 flex items-center gap-3 cursor-pointer">
                <Search className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-mono text-sm font-bold text-primary uppercase">Open Investigations</div>
                  <div className="text-xs text-muted-foreground font-mono">{stats.activeCases} case{stats.activeCases !== 1 ? "s" : ""} require attention</div>
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
