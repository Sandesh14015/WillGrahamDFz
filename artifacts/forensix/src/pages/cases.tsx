import React from "react";
import { useListCases } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, AlertCircle, FileDigit, Clock } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Cases() {
  const { data: cases, isLoading, error } = useListCases();
  const [search, setSearch] = React.useState("");

  const filteredCases = cases?.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.caseNumber.toLowerCase().includes(search.toLowerCase())
  );

  const getPriorityColor = (priority?: string | null) => {
    switch(priority) {
      case 'critical': return 'bg-destructive/20 text-destructive border-destructive/50';
      case 'high': return 'bg-orange-500/20 text-orange-500 border-orange-500/50';
      case 'medium': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50';
      case 'low': return 'bg-primary/20 text-primary border-primary/50';
      default: return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-green-500/20 text-green-500 border-green-500/50';
      case 'open': return 'bg-blue-500/20 text-blue-500 border-blue-500/50';
      case 'closed': return 'bg-muted text-muted-foreground border-border';
      case 'archived': return 'bg-muted/50 text-muted-foreground border-transparent opacity-50';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border border-destructive bg-destructive/10 text-destructive rounded-md font-mono flex items-center">
        <AlertCircle className="mr-2 h-5 w-5" />
        ERR_FETCH_CASES: Failed to load investigation records.
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono text-primary uppercase">// INVESTIGATIONS</h1>
          <p className="text-muted-foreground text-sm font-mono mt-1 opacity-70">CASE DIRECTORY • {cases?.length || 0} TOTAL</p>
        </div>
        <Link href="/cases/new">
          <Button className="font-mono tracking-wider">
            <Plus className="mr-2 h-4 w-4" /> NEW CASE
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search by case name or number..." 
          className="pl-9 font-mono bg-card/50"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {filteredCases?.map((c) => (
          <Link key={c.id} href={`/cases/${c.id}`}>
            <Card className="border-border bg-card/30 hover:bg-card/60 transition-colors cursor-pointer backdrop-blur-sm group">
              <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-lg text-primary">{c.caseNumber}</span>
                    <Badge variant="outline" className={`font-mono text-xs uppercase ${getStatusColor(c.status)}`}>
                      {c.status}
                    </Badge>
                    {c.priority && (
                      <Badge variant="outline" className={`font-mono text-xs uppercase ${getPriorityColor(c.priority)}`}>
                        {c.priority}
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-xl">{c.name}</h3>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                    <span className="flex items-center"><FileDigit className="mr-1 h-3 w-3" /> {c.evidenceCount} EVID.</span>
                    <span className="flex items-center"><Clock className="mr-1 h-3 w-3" /> {format(new Date(c.updatedAt), 'yyyy-MM-dd HH:mm:ss')}</span>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-muted-foreground font-mono uppercase text-xs">INVESTIGATOR</div>
                  <div className="font-medium">{c.investigator}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {filteredCases?.length === 0 && (
          <div className="text-center p-12 border border-border border-dashed rounded-lg bg-card/20">
            <p className="text-muted-foreground font-mono">NO CASES MATCHING QUERY</p>
          </div>
        )}
      </div>
    </div>
  );
}