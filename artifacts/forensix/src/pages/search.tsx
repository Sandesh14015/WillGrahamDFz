import React from "react";
import { Link } from "wouter";
import { useSearchForensic, getSearchForensicQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, FolderOpen, FileDigit, AlertTriangle, Clock } from "lucide-react";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-destructive/20 text-destructive border-destructive/50",
  high: "bg-orange-500/20 text-orange-500 border-orange-500/50",
  medium: "bg-yellow-500/20 text-yellow-500 border-yellow-500/50",
  low: "bg-primary/20 text-primary border-primary/50",
  info: "bg-muted text-muted-foreground border-border",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function SearchPage() {
  const [query, setQuery] = React.useState("");
  const [type, setType] = React.useState<"all" | "cases" | "evidence" | "findings">("all");
  const [submitted, setSubmitted] = React.useState(false);

  const { data: results, isLoading } = useSearchForensic(
    { q: query, type },
    {
      query: {
        enabled: submitted && query.trim().length >= 2,
        queryKey: getSearchForensicQueryKey({ q: query, type }),
      },
    }
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length >= 2) setSubmitted(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-mono text-primary uppercase">// SEARCH</h1>
        <p className="text-muted-foreground text-sm font-mono mt-1 opacity-70">FULL-SPECTRUM FORENSIC QUERY</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cases, evidence, findings..."
            className="pl-9 font-mono bg-card/50"
            value={query}
            onChange={e => { setQuery(e.target.value); setSubmitted(false); }}
          />
        </div>
        <Select value={type} onValueChange={v => setType(v as typeof type)}>
          <SelectTrigger className="w-36 font-mono bg-card/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ALL</SelectItem>
            <SelectItem value="cases">CASES</SelectItem>
            <SelectItem value="evidence">EVIDENCE</SelectItem>
            <SelectItem value="findings">FINDINGS</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" className="font-mono" disabled={query.trim().length < 2}>
          SEARCH
        </Button>
      </form>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      )}

      {results && (
        <div className="space-y-6">
          <div className="text-xs text-muted-foreground font-mono">
            {results.totalResults} RESULT{results.totalResults !== 1 ? "S" : ""} FOR "{results.query}"
          </div>

          {results.cases.length > 0 && (
            <div className="space-y-2">
              <h2 className="font-mono font-bold text-sm text-muted-foreground uppercase flex items-center gap-2">
                <FolderOpen className="h-4 w-4" /> Cases ({results.cases.length})
              </h2>
              {results.cases.map(c => (
                <Link key={c.id} href={`/cases/${c.id}`}>
                  <Card className="bg-card/30 border-border hover:bg-card/50 transition-colors cursor-pointer">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-primary text-sm">{c.caseNumber}</span>
                          <Badge variant="outline" className="font-mono text-xs uppercase">{c.status}</Badge>
                        </div>
                        <div className="font-medium mt-1">{c.name}</div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground font-mono">
                        <div>{c.investigator}</div>
                        <div>{c.evidenceCount} evidence</div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {results.evidence.length > 0 && (
            <div className="space-y-2">
              <h2 className="font-mono font-bold text-sm text-muted-foreground uppercase flex items-center gap-2">
                <FileDigit className="h-4 w-4" /> Evidence ({results.evidence.length})
              </h2>
              {results.evidence.map(e => (
                <Link key={e.id} href={`/evidence/${e.id}`}>
                  <Card className="bg-card/30 border-border hover:bg-card/50 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="font-medium">{e.originalName}</div>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground font-mono">
                        <span>{e.mimeType}</span>
                        <span>{formatBytes(e.fileSize)}</span>
                        <Badge variant="outline" className="font-mono text-xs uppercase">{e.analysisStatus}</Badge>
                      </div>
                      <div className="font-mono text-xs text-muted-foreground mt-1 truncate" title={e.sha256}>
                        SHA256: {e.sha256.substring(0, 20)}...
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {results.findings.length > 0 && (
            <div className="space-y-2">
              <h2 className="font-mono font-bold text-sm text-muted-foreground uppercase flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Findings ({results.findings.length})
              </h2>
              {results.findings.map(f => (
                <Link key={f.id} href={`/evidence/${f.evidenceId}`}>
                  <Card className="bg-card/30 border-border hover:bg-card/50 transition-colors cursor-pointer">
                    <CardContent className="p-4 flex items-start gap-3">
                      <Badge variant="outline" className={`font-mono text-xs uppercase shrink-0 ${SEVERITY_COLORS[f.severity] ?? ""}`}>
                        {f.severity}
                      </Badge>
                      <div>
                        <div className="font-medium text-sm">{f.description}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-1">{f.indicatorType} — {f.value.substring(0, 60)}</div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {results.totalResults === 0 && (
            <div className="text-center p-12 border border-border border-dashed rounded-lg bg-card/20">
              <p className="text-muted-foreground font-mono text-sm">NO RESULTS FOUND FOR "{query}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
