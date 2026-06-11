import React from "react";
import { useListCases, useListCaseEvidence, useYaraPatternScan } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Play, Shield, AlertTriangle } from "lucide-react";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-destructive/20 text-destructive border-destructive/50",
  high: "bg-orange-500/20 text-orange-500 border-orange-500/50",
  medium: "bg-yellow-500/20 text-yellow-500 border-yellow-500/50",
  low: "bg-primary/20 text-primary border-primary/50",
  info: "bg-muted text-muted-foreground border-border",
};

export default function YaraScanner() {
  const [selectedCaseId, setSelectedCaseId] = React.useState<string>("");
  const [selectedEvidenceId, setSelectedEvidenceId] = React.useState<string>("");
  const [customRules, setCustomRules] = React.useState("");
  const [useBuiltinRules, setUseBuiltinRules] = React.useState(true);

  const { data: cases } = useListCases();
  const caseIdNum = selectedCaseId ? parseInt(selectedCaseId) : 0;
  const { data: evidence } = useListCaseEvidence(caseIdNum, {
    query: { enabled: !!caseIdNum, queryKey: ["cases", caseIdNum, "evidence"] },
  });

  const scan = useYaraPatternScan();

  function handleScan() {
    if (!selectedEvidenceId) return;
    scan.mutate({
      data: {
        evidenceId: parseInt(selectedEvidenceId),
        rules: customRules || undefined,
        useBuiltinRules,
      },
    });
  }

  const result = scan.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-mono text-primary uppercase">// YARA SCANNER</h1>
        <p className="text-muted-foreground text-sm font-mono mt-1 opacity-70">PATTERN DETECTION ENGINE</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <Card className="bg-card/30 border-border">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-mono uppercase text-muted-foreground">Select Target</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase text-muted-foreground">Case</Label>
                <Select value={selectedCaseId} onValueChange={v => { setSelectedCaseId(v); setSelectedEvidenceId(""); }}>
                  <SelectTrigger className="font-mono bg-card/50">
                    <SelectValue placeholder="Select case..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cases?.map(c => (
                      <SelectItem key={c.id} value={String(c.id)} className="font-mono">
                        {c.caseNumber} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase text-muted-foreground">Evidence File</Label>
                <Select value={selectedEvidenceId} onValueChange={setSelectedEvidenceId} disabled={!selectedCaseId}>
                  <SelectTrigger className="font-mono bg-card/50">
                    <SelectValue placeholder="Select evidence..." />
                  </SelectTrigger>
                  <SelectContent>
                    {evidence?.map(e => (
                      <SelectItem key={e.id} value={String(e.id)} className="font-mono text-sm">
                        {e.originalName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/30 border-border">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-mono uppercase text-muted-foreground">Rule Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-mono text-xs uppercase text-muted-foreground">Built-in Detection Rules</Label>
                  <p className="text-xs text-muted-foreground mt-1">10 rules: URLs with IPs, credentials, keys, IOCs</p>
                </div>
                <Switch checked={useBuiltinRules} onCheckedChange={setUseBuiltinRules} />
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase text-muted-foreground">Custom Patterns (one regex per line)</Label>
                <Textarea
                  placeholder="# Custom regex patterns&#10;password\s*[:=]\s*\S+&#10;api_key[^a-z]&#10;Bearer\s+[A-Za-z0-9._-]{20,}"
                  className="font-mono text-xs bg-card/50 min-h-[120px]"
                  value={customRules}
                  onChange={e => setCustomRules(e.target.value)}
                />
              </div>
              <Button
                className="w-full font-mono"
                onClick={handleScan}
                disabled={!selectedEvidenceId || scan.isPending}
              >
                <Play className="mr-2 h-4 w-4" />
                {scan.isPending ? "SCANNING..." : "RUN SCAN"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {scan.error && (
            <div className="p-4 border border-destructive bg-destructive/10 text-destructive rounded font-mono text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Scan failed. Please try again.
            </div>
          )}

          {!result && !scan.isPending && (
            <div className="text-center p-16 border border-border border-dashed rounded-lg bg-card/20 h-full">
              <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-mono text-sm">SELECT EVIDENCE AND RUN SCAN</p>
            </div>
          )}

          {scan.isPending && (
            <div className="text-center p-16 border border-border border-dashed rounded-lg bg-card/20">
              <div className="font-mono text-primary animate-pulse">SCANNING...</div>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-mono font-bold text-primary uppercase">// Scan Results</h2>
                <div className="text-xs text-muted-foreground font-mono">
                  {result.rulesUsed} RULES • {result.matches.length} MATCHES
                </div>
              </div>

              {result.matches.length === 0 ? (
                <div className="text-center p-8 border border-green-500/30 bg-green-500/5 rounded">
                  <p className="text-green-400 font-mono text-sm">CLEAN — NO PATTERNS DETECTED</p>
                </div>
              ) : (
                result.matches.map((match, i) => (
                  <Card key={i} className="bg-card/30 border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-sm">{match.ruleName}</span>
                            <Badge variant="outline" className={`font-mono text-xs uppercase ${SEVERITY_COLORS[match.severity] ?? ""}`}>
                              {match.severity}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{match.description}</p>
                          <div className="mt-2 space-y-1">
                            {match.matchedStrings.map((s, j) => (
                              <div key={j} className="font-mono text-xs text-primary p-1 bg-primary/5 rounded break-all">{s}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
