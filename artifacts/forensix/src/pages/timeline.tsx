import React from "react";
import { useRoute, Link } from "wouter";
import { useGetCase, useGetCaseTimeline, getGetCaseTimelineQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowLeft, Upload, Play, Eye, Database, Shield, Clock } from "lucide-react";
import { format } from "date-fns";

const EVENT_ICONS: Record<string, React.ReactNode> = {
  evidence_uploaded: <Upload className="h-4 w-4" />,
  evidence_analyzed: <Play className="h-4 w-4" />,
  case_created: <Shield className="h-4 w-4" />,
  custody: <Database className="h-4 w-4" />,
};

const EVENT_COLORS: Record<string, string> = {
  evidence_uploaded: "border-primary/50 bg-primary/10 text-primary",
  evidence_analyzed: "border-green-500/50 bg-green-500/10 text-green-400",
  case_created: "border-yellow-500/50 bg-yellow-500/10 text-yellow-400",
  custody: "border-purple-500/50 bg-purple-500/10 text-purple-400",
};

export default function Timeline() {
  const [, params] = useRoute("/timeline/:caseId");
  const caseId = parseInt(params?.caseId ?? "0", 10);

  const { data: caseData } = useGetCase(caseId, { query: { enabled: !!caseId, queryKey: ["cases", caseId] } });
  const { data: events, isLoading } = useGetCaseTimeline(caseId, {
    query: { enabled: !!caseId, queryKey: getGetCaseTimelineQueryKey(caseId) },
  });

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" />{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {caseId && (
          <Link href={`/cases/${caseId}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-mono text-primary uppercase">// TIMELINE</h1>
          {caseData && (
            <p className="text-muted-foreground text-sm font-mono mt-1 opacity-70">
              {caseData.caseNumber} — {caseData.name}
            </p>
          )}
        </div>
      </div>

      {!events || events.length === 0 ? (
        <div className="text-center p-16 border border-border border-dashed rounded-lg bg-card/20">
          <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-mono text-sm">NO TIMELINE EVENTS — UPLOAD AND ANALYZE EVIDENCE TO POPULATE</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-4 pl-12">
            {events.map((event, idx) => (
              <div key={event.id} className="relative">
                <div className={`absolute -left-[30px] w-8 h-8 rounded flex items-center justify-center border ${EVENT_COLORS[event.eventType] ?? "border-border bg-card text-muted-foreground"}`}>
                  {EVENT_ICONS[event.eventType] ?? <Clock className="h-4 w-4" />}
                </div>
                <Card className="bg-card/30 border-border hover:bg-card/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`font-mono text-xs uppercase ${EVENT_COLORS[event.eventType] ?? ""}`}>
                            {event.eventType.replace(/_/g, " ")}
                          </Badge>
                          {event.evidenceName && (
                            <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">{event.evidenceName}</span>
                          )}
                        </div>
                        <p className="text-sm mt-2 text-foreground/80">{event.description}</p>
                        <div className="text-xs text-muted-foreground font-mono mt-1">
                          Source: {event.source}
                          {event.evidenceId && (
                            <Link href={`/evidence/${event.evidenceId}`}>
                              <span className="ml-3 text-primary cursor-pointer hover:underline">
                                VIEW EVIDENCE
                              </span>
                            </Link>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-xs text-primary">{format(new Date(event.timestamp), "HH:mm:ss")}</div>
                        <div className="font-mono text-xs text-muted-foreground">{format(new Date(event.timestamp), "yyyy-MM-dd")}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
