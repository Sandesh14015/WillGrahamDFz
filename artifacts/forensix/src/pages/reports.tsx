import React from "react";
import { useRoute, Link } from "wouter";
import { useGetCase, useGenerateReport } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Download, Shield, AlertCircle, FileText } from "lucide-react";

export default function Reports() {
  const [, params] = useRoute("/reports/:caseId");
  const caseId = parseInt(params?.caseId ?? "0", 10);

  const { data: caseData, isLoading: caseLoading } = useGetCase(caseId, {
    query: { enabled: !!caseId, queryKey: ["cases", caseId] },
  });

  const [options, setOptions] = React.useState({
    format: "html" as "html" | "json",
    title: "",
    includeTimeline: true,
    includeFindings: true,
    includeHashes: true,
    includeCustody: true,
  });

  const generateReport = useGenerateReport();
  const [reportContent, setReportContent] = React.useState<string | null>(null);
  const [reportFormat, setReportFormat] = React.useState<string | null>(null);

  function handleGenerate() {
    generateReport.mutate(
      {
        caseId,
        data: {
          format: options.format,
          title: options.title || undefined,
          includeTimeline: options.includeTimeline,
          includeFindings: options.includeFindings,
          includeHashes: options.includeHashes,
          includeCustody: options.includeCustody,
        },
      },
      {
        onSuccess: (data) => {
          setReportContent(data.content);
          setReportFormat(data.format);
        },
      }
    );
  }

  function handleDownload() {
    if (!reportContent) return;
    const blob = new Blob([reportContent], {
      type: reportFormat === "html" ? "text/html" : "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `forensix-report-${caseId}.${reportFormat}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (caseLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-48 w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/cases/${caseId}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-mono text-primary uppercase">// REPORT GENERATOR</h1>
          {caseData && (
            <p className="text-muted-foreground text-sm font-mono mt-1 opacity-70">
              {caseData.caseNumber} — {caseData.name}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card/30 border-border">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-mono uppercase text-muted-foreground">Report Options</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase text-muted-foreground">Report Title (optional)</Label>
              <Input
                placeholder="Forensic Investigation Report"
                className="font-mono bg-card/50"
                value={options.title}
                onChange={e => setOptions(o => ({ ...o, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase text-muted-foreground">Output Format</Label>
              <Select value={options.format} onValueChange={v => setOptions(o => ({ ...o, format: v as "html" | "json" }))}>
                <SelectTrigger className="font-mono bg-card/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="html">HTML (readable)</SelectItem>
                  <SelectItem value="json">JSON (machine-readable)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {[
                { key: "includeTimeline", label: "Include Timeline" },
                { key: "includeFindings", label: "Include Findings" },
                { key: "includeHashes", label: "Include File Hashes" },
                { key: "includeCustody", label: "Include Chain of Custody" },
              ].map(opt => (
                <div key={opt.key} className="flex items-center justify-between">
                  <Label className="font-mono text-xs uppercase text-muted-foreground cursor-pointer">{opt.label}</Label>
                  <Switch
                    checked={options[opt.key as keyof typeof options] as boolean}
                    onCheckedChange={v => setOptions(o => ({ ...o, [opt.key]: v }))}
                  />
                </div>
              ))}
            </div>

            {generateReport.error && (
              <div className="p-3 border border-destructive/50 bg-destructive/10 text-destructive text-sm font-mono rounded flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Failed to generate report.
              </div>
            )}

            <div className="flex gap-3">
              <Button className="flex-1 font-mono" onClick={handleGenerate} disabled={generateReport.isPending}>
                <Shield className="mr-2 h-4 w-4" />
                {generateReport.isPending ? "GENERATING..." : "GENERATE REPORT"}
              </Button>
              {reportContent && (
                <Button variant="outline" className="font-mono" onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" /> DOWNLOAD
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div>
          {!reportContent ? (
            <div className="text-center p-16 border border-border border-dashed rounded-lg bg-card/20 h-full">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-mono text-sm">CONFIGURE AND GENERATE A REPORT</p>
            </div>
          ) : reportFormat === "html" ? (
            <Card className="bg-card/30 border-border h-full">
              <CardHeader className="pb-2 flex-row items-center justify-between">
                <CardTitle className="text-sm font-mono uppercase text-muted-foreground">Preview</CardTitle>
                <Button variant="ghost" size="sm" className="font-mono text-xs" onClick={handleDownload}>
                  <Download className="mr-1 h-3 w-3" /> DOWNLOAD
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <iframe
                  srcDoc={reportContent}
                  className="w-full rounded-b-lg"
                  style={{ height: "600px", border: "none" }}
                  sandbox="allow-same-origin"
                  title="Report Preview"
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card/30 border-border h-full">
              <CardHeader className="pb-2 flex-row items-center justify-between">
                <CardTitle className="text-sm font-mono uppercase text-muted-foreground">JSON Output</CardTitle>
                <Button variant="ghost" size="sm" className="font-mono text-xs" onClick={handleDownload}>
                  <Download className="mr-1 h-3 w-3" /> DOWNLOAD
                </Button>
              </CardHeader>
              <CardContent>
                <pre className="font-mono text-xs text-primary overflow-auto max-h-[500px] p-3 bg-black/30 rounded">{reportContent}</pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
