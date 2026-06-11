import React, { useRef } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCase,
  useListCaseEvidence,
  useDeleteCase,
  useUploadEvidence,
  useAnalyzeEvidence,
  useDeleteEvidence,
  getGetCaseQueryKey,
  getListCaseEvidenceQueryKey,
  getGetDashboardStatsQueryKey,
  getListCasesQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle, ArrowLeft, Upload, Play, Trash2, Clock, FileDigit,
  Shield, Eye, ChevronRight, AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-500 border-green-500/50",
  open: "bg-blue-500/20 text-blue-500 border-blue-500/50",
  closed: "bg-muted text-muted-foreground border-border",
  archived: "bg-muted/50 text-muted-foreground border-transparent opacity-50",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-destructive/20 text-destructive border-destructive/50",
  high: "bg-orange-500/20 text-orange-500 border-orange-500/50",
  medium: "bg-yellow-500/20 text-yellow-500 border-yellow-500/50",
  low: "bg-primary/20 text-primary border-primary/50",
};

const ANALYSIS_COLORS: Record<string, string> = {
  complete: "bg-green-500/20 text-green-500 border-green-500/50",
  analyzing: "bg-yellow-500/20 text-yellow-500 border-yellow-500/50",
  pending: "bg-muted text-muted-foreground border-border",
  failed: "bg-destructive/20 text-destructive border-destructive/50",
};

export default function CaseDetail() {
  const [, params] = useRoute("/cases/:id");
  const caseId = parseInt(params?.id ?? "0", 10);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  const { data: caseData, isLoading: caseLoading, error: caseError } = useGetCase(caseId, {
    query: { enabled: !!caseId, queryKey: getGetCaseQueryKey(caseId) },
  });

  const { data: evidence, isLoading: evidenceLoading } = useListCaseEvidence(caseId, {
    query: { enabled: !!caseId, queryKey: getListCaseEvidenceQueryKey(caseId) },
  });

  const deleteCase = useDeleteCase({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCasesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        navigate("/cases");
      },
    },
  });

  const analyzeEvidence = useAnalyzeEvidence({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCaseEvidenceQueryKey(caseId) });
        queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(caseId) });
      },
    },
  });

  const deleteEvidence = useDeleteEvidence({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCaseEvidenceQueryKey(caseId) });
        queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(caseId) });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
      },
    },
  });

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadProgress(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/cases/${caseId}/evidence`, { method: "POST", body: formData });
      if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
      queryClient.invalidateQueries({ queryKey: getListCaseEvidenceQueryKey(caseId) });
      queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(caseId) });
      queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadProgress(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (caseLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (caseError || !caseData) {
    return (
      <div className="p-6 border border-destructive bg-destructive/10 text-destructive rounded-md font-mono flex items-center">
        <AlertCircle className="mr-2 h-5 w-5" /> CASE NOT FOUND
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/cases">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono font-bold text-primary text-lg">{caseData.caseNumber}</span>
            <Badge variant="outline" className={`font-mono text-xs uppercase ${STATUS_COLORS[caseData.status] ?? ""}`}>{caseData.status}</Badge>
            {caseData.priority && (
              <Badge variant="outline" className={`font-mono text-xs uppercase ${PRIORITY_COLORS[caseData.priority] ?? ""}`}>{caseData.priority}</Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight font-mono text-foreground mt-1">{caseData.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/timeline/${caseId}`}>
            <Button variant="outline" size="sm" className="font-mono text-xs">
              <Clock className="mr-1 h-3 w-3" /> TIMELINE
            </Button>
          </Link>
          <Link href={`/reports/${caseId}`}>
            <Button variant="outline" size="sm" className="font-mono text-xs">
              <Shield className="mr-1 h-3 w-3" /> REPORT
            </Button>
          </Link>
          <Button
            variant="destructive"
            size="sm"
            className="font-mono text-xs"
            onClick={() => {
              if (confirm("Delete this case and all its evidence? This cannot be undone.")) {
                deleteCase.mutate({ caseId });
              }
            }}
          >
            <Trash2 className="mr-1 h-3 w-3" /> DELETE
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/30 border-border">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground font-mono uppercase mb-1">Investigator</div>
            <div className="font-medium">{caseData.investigator}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/30 border-border">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground font-mono uppercase mb-1">Evidence Count</div>
            <div className="font-mono font-bold text-primary text-xl">{caseData.evidenceCount}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/30 border-border">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground font-mono uppercase mb-1">Last Updated</div>
            <div className="font-mono text-sm">{format(new Date(caseData.updatedAt), "yyyy-MM-dd HH:mm")}</div>
          </CardContent>
        </Card>
      </div>

      {caseData.description && (
        <Card className="bg-card/30 border-border">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground font-mono uppercase mb-2">Description</div>
            <p className="text-sm text-foreground/80">{caseData.description}</p>
          </CardContent>
        </Card>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-mono font-bold text-lg text-primary uppercase">// Evidence</h2>
          <div className="flex gap-2">
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
            <Button
              size="sm"
              className="font-mono text-xs"
              disabled={uploadProgress}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-1 h-3 w-3" />
              {uploadProgress ? "UPLOADING..." : "UPLOAD FILE"}
            </Button>
          </div>
        </div>

        {uploadError && (
          <div className="p-3 mb-4 border border-destructive/50 bg-destructive/10 text-destructive text-sm font-mono rounded flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {uploadError}
          </div>
        )}

        {evidenceLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : evidence && evidence.length > 0 ? (
          <div className="space-y-2">
            {evidence.map(ev => (
              <Card key={ev.id} className="bg-card/30 border-border hover:bg-card/50 transition-colors group">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{ev.originalName}</span>
                      <Badge variant="outline" className={`font-mono text-xs uppercase ${ANALYSIS_COLORS[ev.analysisStatus] ?? ""}`}>
                        {ev.analysisStatus}
                      </Badge>
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground font-mono">
                      <span>{ev.mimeType}</span>
                      <span>{formatBytes(ev.fileSize)}</span>
                      <span className="truncate max-w-[200px]" title={ev.sha256}>SHA256: {ev.sha256.substring(0, 12)}...</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {ev.analysisStatus === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-mono text-xs"
                        onClick={() => analyzeEvidence.mutate({ evidenceId: ev.id })}
                        disabled={analyzeEvidence.isPending}
                      >
                        <Play className="mr-1 h-3 w-3" /> ANALYZE
                      </Button>
                    )}
                    <Link href={`/evidence/${ev.id}`}>
                      <Button variant="outline" size="icon" className="h-8 w-8">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (confirm("Delete this evidence file?")) {
                          deleteEvidence.mutate({ evidenceId: ev.id });
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center p-12 border border-border border-dashed rounded-lg bg-card/20">
            <FileDigit className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-mono text-sm">NO EVIDENCE FILES — UPLOAD TO BEGIN</p>
          </div>
        )}
      </div>
    </div>
  );
}
