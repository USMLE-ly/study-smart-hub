import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Home } from "lucide-react";
import { Link } from "react-router-dom";

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <AppSidebar />
        <SidebarInset className="flex-1">
          {/* Header */}
          <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="h-8 w-8 flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors" />
              <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            </div>
            <Link
              to="/"
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
            >
              <Home className="h-4 w-4" />
              Home
            </Link>
          </header>
          
          {/* Main Content */}
          <main className="flex-1 p-6">
            {children}
          </main>

          {/* Footer */}
          <footer className="py-4 text-center border-t border-border bg-card">
            <p className="text-sm text-muted-foreground">
              Copyright © MedPrep. All rights reserved.
            </p>
          </footer>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}