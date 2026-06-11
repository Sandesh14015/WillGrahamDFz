import React from "react";
import { useRoute, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetEvidence,
  useGetEvidenceAnalysis,
  useGetChainOfCustody,
  useAnalyzeEvidence,
  getGetEvidenceAnalysisQueryKey,
  getGetEvidenceQueryKey,
  getListCaseEvidenceQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, ArrowLeft, Play, Hash, Globe, Mail, Database, Shield, Clock } from "lucide-react";
import { format } from "date-fns";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-destructive/20 text-destructive border-destructive/50",
  high: "bg-orange-500/20 text-orange-500 border-orange-500/50",
  medium: "bg-yellow-500/20 text-yellow-500 border-yellow-500/50",
  low: "bg-primary/20 text-primary border-primary/50",
  info: "bg-muted text-muted-foreground border-border",
};

const ANALYSIS_COLORS: Record<string, string> = {
  complete: "bg-green-500/20 text-green-500 border-green-500/50",
  analyzing: "bg-yellow-500/20 text-yellow-500 border-yellow-500/50",
  pending: "bg-muted text-muted-foreground border-border",
  failed: "bg-destructive/20 text-destructive border-destructive/50",
};

export default function EvidenceDetail() {
  const [, params] = useRoute("/evidence/:id");
  const evidenceId = parseInt(params?.id ?? "0", 10);
  const queryClient = useQueryClient();

  const { data: evidence, isLoading: evLoading } = useGetEvidence(evidenceId, {
    query: { enabled: !!evidenceId, queryKey: getGetEvidenceQueryKey(evidenceId) },
  });

  const { data: analysis, isLoading: analysisLoading } = useGetEvidenceAnalysis(evidenceId, {
    query: { enabled: !!evidenceId, queryKey: getGetEvidenceAnalysisQueryKey(evidenceId) },
  });

  const { data: custody } = useGetChainOfCustody(evidenceId, {
    query: { enabled: !!evidenceId, queryKey: ["evidence", evidenceId, "custody"] },
  });

  const analyzeEvidence = useAnalyzeEvidence({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetEvidenceAnalysisQueryKey(evidenceId) });
        queryClient.invalidateQueries({ queryKey: getGetEvidenceQueryKey(evidenceId) });
        if (evidence) {
          queryClient.invalidateQueries({ queryKey: getListCaseEvidenceQueryKey(evidence.caseId) });
        }
      },
    },
  });

  if (evLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-48 w-full" /></div>;
  }

  if (!evidence) {
    return (
      <div className="p-6 border border-destructive bg-destructive/10 text-destructive rounded-md font-mono flex items-center">
        <AlertCircle className="mr-2 h-5 w-5" /> EVIDENCE NOT FOUND
      </div>
    );
  }

  const strings = analysis?.strings as { urls?: string[]; ipAddresses?: string[]; emailAddresses?: string[]; domains?: string[]; printableStrings?: string[] } | null;
  const docMeta = analysis?.documentMeta as Record<string, string | number | null> | null;
  const imgMeta = analysis?.imageMeta as Record<string, string | number | null> | null;
  const emailMeta = analysis?.emailMeta as { from?: string; to?: string; subject?: string; date?: string; receivedChain?: string[]; hasAttachments?: boolean; attachmentNames?: string[] } | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {evidence && (
          <Link href={`/cases/${evidence.caseId}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold font-mono truncate">{evidence.originalName}</h1>
          <div className="flex gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className={`font-mono text-xs uppercase ${ANALYSIS_COLORS[evidence.analysisStatus] ?? ""}`}>
              {evidence.analysisStatus}
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">{evidence.mimeType}</span>
            <span className="text-xs text-muted-foreground font-mono">{formatBytes(evidence.fileSize)}</span>
          </div>
        </div>
        {evidence.analysisStatus === "pending" && (
          <Button
            size="sm"
            className="font-mono text-xs"
            onClick={() => analyzeEvidence.mutate({ evidenceId })}
            disabled={analyzeEvidence.isPending}
          >
            <Play className="mr-1 h-3 w-3" /> {analyzeEvidence.isPending ? "ANALYZING..." : "RUN ANALYSIS"}
          </Button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { label: "SHA256", value: evidence.sha256, mono: true },
          { label: "MD5", value: evidence.md5, mono: true },
          { label: "SHA1", value: evidence.sha1, mono: true },
        ].map(h => (
          <Card key={h.label} className="bg-card/30 border-border">
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground font-mono uppercase mb-1 flex items-center gap-1">
                <Hash className="h-3 w-3" /> {h.label}
              </div>
              <div className="font-mono text-xs break-all text-primary">{h.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="font-mono text-xs">
          <TabsTrigger value="overview">OVERVIEW</TabsTrigger>
          <TabsTrigger value="strings">STRINGS</TabsTrigger>
          {(docMeta || imgMeta || emailMeta) && <TabsTrigger value="metadata">METADATA</TabsTrigger>}
          <TabsTrigger value="findings">FINDINGS ({analysis?.findings?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="custody">CUSTODY</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card className="bg-card/30 border-border">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-mono uppercase text-muted-foreground">File Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Original Name", value: evidence.originalName },
                { label: "MIME Type", value: evidence.mimeType },
                { label: "File Size", value: formatBytes(evidence.fileSize) },
                { label: "Uploaded", value: format(new Date(evidence.uploadedAt), "yyyy-MM-dd HH:mm:ss") },
              ].map(row => (
                <div key={row.label}>
                  <div className="text-xs text-muted-foreground font-mono uppercase">{row.label}</div>
                  <div className="font-mono mt-1">{row.value}</div>
                </div>
              ))}
            </CardContent>
          </Card>
          {analysisLoading && <Skeleton className="h-24 w-full" />}
          {analysis?.status === "pending" && (
            <div className="p-4 border border-border border-dashed rounded text-center text-muted-foreground font-mono text-sm">
              ANALYSIS NOT YET RUN — CLICK "RUN ANALYSIS" TO BEGIN
            </div>
          )}
        </TabsContent>

        <TabsContent value="strings" className="mt-4 space-y-4">
          {!strings ? (
            <div className="text-muted-foreground font-mono text-sm p-4">No string data available. Run analysis first.</div>
          ) : (
            <>
              {[
                { icon: Globe, label: "URLs", data: strings.urls },
                { icon: Database, label: "IP Addresses", data: strings.ipAddresses },
                { icon: Mail, label: "Email Addresses", data: strings.emailAddresses },
                { icon: Globe, label: "Domains", data: strings.domains },
              ].map(section => (section.data?.length ?? 0) > 0 && (
                <Card key={section.label} className="bg-card/30 border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-mono uppercase text-muted-foreground flex items-center gap-1">
                      <section.icon className="h-3 w-3" /> {section.label} ({section.data?.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {section.data?.map((item, i) => (
                        <div key={i} className="font-mono text-xs text-primary p-1 bg-primary/5 rounded break-all">{item}</div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>

        {(docMeta || imgMeta || emailMeta) && (
          <TabsContent value="metadata" className="mt-4 space-y-4">
            {docMeta && (
              <Card className="bg-card/30 border-border">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-mono uppercase text-muted-foreground">Document Metadata</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  {Object.entries(docMeta).filter(([, v]) => v != null).map(([k, v]) => (
                    <div key={k}>
                      <div className="text-xs text-muted-foreground font-mono uppercase">{k}</div>
                      <div className="font-mono mt-1 text-sm">{String(v)}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            {imgMeta && (
              <Card className="bg-card/30 border-border">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-mono uppercase text-muted-foreground">Image / EXIF Metadata</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  {Object.entries(imgMeta).filter(([, v]) => v != null).map(([k, v]) => (
                    <div key={k}>
                      <div className="text-xs text-muted-foreground font-mono uppercase">{k}</div>
                      <div className="font-mono mt-1 text-sm">{String(v)}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            {emailMeta && (
              <Card className="bg-card/30 border-border">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-mono uppercase text-muted-foreground">Email Headers</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {[
                    { label: "From", value: emailMeta.from },
                    { label: "To", value: emailMeta.to },
                    { label: "Subject", value: emailMeta.subject },
                    { label: "Date", value: emailMeta.date },
                  ].filter(r => r.value).map(r => (
                    <div key={r.label} className="flex gap-3">
                      <span className="text-xs text-muted-foreground font-mono uppercase w-16 shrink-0">{r.label}</span>
                      <span className="font-mono text-sm break-all">{r.value}</span>
                    </div>
                  ))}
                  {emailMeta.hasAttachments && (
                    <div>
                      <div className="text-xs text-muted-foreground font-mono uppercase">Attachments</div>
                      <div className="mt-1 space-y-1">
                        {emailMeta.attachmentNames?.map((n, i) => (
                          <div key={i} className="font-mono text-xs text-primary">{n}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        <TabsContent value="findings" className="mt-4 space-y-3">
          {!analysis?.findings || analysis.findings.length === 0 ? (
            <div className="text-center p-8 border border-border border-dashed rounded text-muted-foreground font-mono text-sm">
              NO FINDINGS DETECTED
            </div>
          ) : (
            analysis.findings.map(f => (
              <Card key={f.id} className="bg-card/30 border-border">
                <CardContent className="p-4 flex items-start gap-3">
                  <Badge variant="outline" className={`font-mono text-xs uppercase shrink-0 ${SEVERITY_COLORS[f.severity] ?? ""}`}>
                    {f.severity}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{f.description}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-1 uppercase">{f.indicatorType}</div>
                    <div className="font-mono text-xs text-primary mt-1 break-all">{f.value}</div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="custody" className="mt-4">
          {!custody || custody.length === 0 ? (
            <div className="text-center p-8 border border-border border-dashed rounded text-muted-foreground font-mono text-sm">
              NO CUSTODY RECORDS
            </div>
          ) : (
            <div className="space-y-2">
              {custody.map(r => (
                <Card key={r.id} className="bg-card/30 border-border">
                  <CardContent className="p-4 flex items-start gap-3">
                    <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono font-bold text-sm uppercase text-primary">{r.action}</span>
                        <span className="text-sm text-muted-foreground">by {r.actor}</span>
                        <span className="text-xs text-muted-foreground font-mono">{format(new Date(r.timestamp), "yyyy-MM-dd HH:mm:ss")}</span>
                      </div>
                      {r.notes && <div className="text-xs text-muted-foreground mt-1 font-mono break-all">{r.notes}</div>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
