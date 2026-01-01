import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Bell, User } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          {/* Header */}
          <header className="flex h-16 items-center justify-between border-b border-border/60 bg-card px-8 sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors" />
              <div className="h-6 w-px bg-border/60" />
              <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                <Bell className="h-5 w-5" strokeWidth={1.5} />
              </Button>
              <Link to="/profile">
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                  <User className="h-5 w-5" strokeWidth={1.5} />
                </Button>
              </Link>
            </div>
          </header>
          
          {/* Main Content */}
          <main className="flex-1 p-8">
            {children}
          </main>

          {/* Footer */}
          <footer className="py-4 px-8 text-center border-t border-border/40 bg-card/50">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} MedPrep. All rights reserved.
            </p>
          </footer>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
