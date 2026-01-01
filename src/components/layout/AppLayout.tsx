import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Bell, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const location = useLocation();
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayedChildren, setDisplayedChildren] = useState(children);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => {
      setDisplayedChildren(children);
      setIsAnimating(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Update children without animation when they change but route stays same
  useEffect(() => {
    if (!isAnimating) {
      setDisplayedChildren(children);
    }
  }, [children, isAnimating]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          {/* Header */}
          <header className="flex h-16 items-center justify-between border-b border-border/60 bg-card px-8 sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 hover:scale-105 active:scale-95" />
              <div className="h-6 w-px bg-border/60" />
              <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <Bell className="h-5 w-5" strokeWidth={1.5} />
              </Button>
              <Link to="/profile">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <User className="h-5 w-5" strokeWidth={1.5} />
                </Button>
              </Link>
            </div>
          </header>
          
          {/* Main Content with Page Transition */}
          <main className="flex-1 p-8">
            <div
              className={cn(
                "transition-all duration-300 ease-out",
                isAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
              )}
            >
              {displayedChildren}
            </div>
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
