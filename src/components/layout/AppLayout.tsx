import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Home, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground">
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            </div>
            <Link
              to="/"
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <Home className="h-4 w-4" />
              Home
            </Link>
          </header>
          <main className="flex-1 p-6 bg-background">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
