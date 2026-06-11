import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Briefcase, 
  Search, 
  Activity, 
  FileText,
  Shield,
  Terminal,
  Settings
} from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/cases", label: "Cases", icon: Briefcase },
    { href: "/search", label: "Global Search", icon: Search },
    { href: "/yara", label: "YARA Scanner", icon: Terminal },
  ];

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans">
      <aside className="w-64 border-r border-border bg-card/30 backdrop-blur-xl flex flex-col">
        <div className="h-14 flex items-center px-4 border-b border-border">
          <Shield className="h-6 w-6 text-primary mr-2" />
          <span className="font-mono font-bold tracking-wider text-lg">FORENSIX</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = location === item.href || location.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link href={item.href}>
                    <div
                      className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors cursor-pointer ${
                        isActive 
                          ? "bg-primary/10 text-primary font-medium border border-primary/20" 
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent"
                      }`}
                    >
                      <item.icon className="h-4 w-4 mr-3" />
                      {item.label}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4 border-t border-border">
          <div className="flex items-center text-xs text-muted-foreground font-mono">
            <Activity className="h-3 w-3 mr-2 text-primary animate-pulse" />
            SYS.OP. NORMAL
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="mx-auto max-w-[1400px] h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}