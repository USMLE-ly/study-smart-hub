import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  GraduationCap,
  Layers,
  Notebook,
  HelpCircle,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const mainNavItems = [
  { title: "Dashboard", icon: LayoutDashboard, href: "/" },
  { title: "Study Planner", icon: Calendar, href: "/study-planner" },
  { title: "Medical Library", icon: BookOpen, href: "/library" },
];

const qbankItems = [
  { title: "Create Test", href: "/qbank/create" },
  { title: "Previous Tests", href: "/qbank/history" },
  { title: "Performance", href: "/qbank/performance" },
  { title: "Search", href: "/qbank/search" },
  { title: "Notes", href: "/qbank/notes" },
];

const flashcardItems = [
  { title: "My Decks", href: "/flashcards/decks" },
  { title: "Study Mode", href: "/flashcards/study" },
];

export function AppSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();
  const [qbankOpen, setQbankOpen] = useState(
    location.pathname.startsWith("/qbank")
  );
  const [flashcardsOpen, setFlashcardsOpen] = useState(
    location.pathname.startsWith("/flashcards")
  );

  return (
    <Sidebar className="border-r-0 bg-sidebar">
      {/* Logo Section */}
      <SidebarHeader className="px-6 py-6 border-b border-sidebar-border/50">
        <Link to="/" className="flex items-center gap-3">
          {/* Simple Logo */}
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-6 h-6">
              <path
                d="M50 10 C70 10, 85 25, 85 45 C85 65, 70 80, 50 80 C35 80, 25 70, 25 55 C25 42, 35 33, 48 33 C58 33, 65 40, 65 50 C65 58, 58 65, 50 65"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="6"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground tracking-tight">
              MedPrep
            </h1>
            <p className="text-xs text-sidebar-foreground/50 font-medium uppercase tracking-wider">
              STEP 1 QBank
            </p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.href}
                    className={cn(
                      "h-10 px-3 rounded-lg transition-all duration-150",
                      "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60",
                      "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground data-[active=true]:font-medium"
                    )}
                  >
                    <Link to={item.href} className="flex items-center gap-3">
                      <item.icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
                      <span className="text-sm">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* QBank Collapsible */}
              <Collapsible open={qbankOpen} onOpenChange={setQbankOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={cn(
                        "h-10 px-3 rounded-lg transition-all duration-150 w-full",
                        "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60",
                        qbankOpen && "bg-sidebar-accent/40"
                      )}
                    >
                      <GraduationCap className="h-[18px] w-[18px]" strokeWidth={1.5} />
                      <span className="text-sm">QBank</span>
                      <ChevronRight
                        className={cn(
                          "ml-auto h-4 w-4 transition-transform duration-200",
                          qbankOpen && "rotate-90"
                        )}
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="ml-4 pl-4 border-l border-sidebar-border/30 mt-1 space-y-0.5">
                      {qbankItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location.pathname === item.href}
                            className={cn(
                              "h-8 px-3 rounded-md text-[13px]",
                              "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40",
                              "data-[active=true]:text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium"
                            )}
                          >
                            <Link to={item.href}>{item.title}</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Flashcards Collapsible */}
              <Collapsible open={flashcardsOpen} onOpenChange={setFlashcardsOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={cn(
                        "h-10 px-3 rounded-lg transition-all duration-150 w-full",
                        "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60",
                        flashcardsOpen && "bg-sidebar-accent/40"
                      )}
                    >
                      <Layers className="h-[18px] w-[18px]" strokeWidth={1.5} />
                      <span className="text-sm">Flashcards</span>
                      <ChevronRight
                        className={cn(
                          "ml-auto h-4 w-4 transition-transform duration-200",
                          flashcardsOpen && "rotate-90"
                        )}
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="ml-4 pl-4 border-l border-sidebar-border/30 mt-1 space-y-0.5">
                      {flashcardItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location.pathname === item.href}
                            className={cn(
                              "h-8 px-3 rounded-md text-[13px]",
                              "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40",
                              "data-[active=true]:text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium"
                            )}
                          >
                            <Link to={item.href}>{item.title}</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === "/notebook"}
                  className={cn(
                    "h-10 px-3 rounded-lg transition-all duration-150",
                    "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60",
                    "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground data-[active=true]:font-medium"
                  )}
                >
                  <Link to="/notebook" className="flex items-center gap-3">
                    <Notebook className="h-[18px] w-[18px]" strokeWidth={1.5} />
                    <span className="text-sm">My Notebook</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === "/help"}
                  className={cn(
                    "h-10 px-3 rounded-lg transition-all duration-150",
                    "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60",
                    "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground data-[active=true]:font-medium"
                  )}
                >
                  <Link to="/help" className="flex items-center gap-3">
                    <HelpCircle className="h-[18px] w-[18px]" strokeWidth={1.5} />
                    <span className="text-sm">Help</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-3 py-4 border-t border-sidebar-border/50">
        <div className="px-3 py-3 rounded-lg bg-sidebar-accent/30 mb-3">
          <p className="text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wider mb-1">
            Subscription
          </p>
          <p className="text-xs text-sidebar-foreground/80">
            Expires May 07, 2026
          </p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start h-10 px-3 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
          onClick={() => signOut()}
        >
          <LogOut className="h-[18px] w-[18px] mr-3" strokeWidth={1.5} />
          <span className="text-sm">Sign Out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
