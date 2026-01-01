import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  GraduationCap,
  Zap,
  Notebook,
  HelpCircle,
  ChevronRight,
  Home,
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

const mainNavItems = [
  { title: "Dashboard", icon: Home, href: "/" },
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
  { title: "Ready Decks", href: "/flashcards/study" },
];

export function AppSidebar() {
  const location = useLocation();
  const [qbankOpen, setQbankOpen] = useState(
    location.pathname.startsWith("/qbank")
  );
  const [flashcardsOpen, setFlashcardsOpen] = useState(
    location.pathname.startsWith("/flashcards")
  );

  return (
    <Sidebar className="border-r-0 bg-sidebar">
      {/* Logo Section */}
      <SidebarHeader className="px-6 py-8 border-b border-sidebar-border">
        <div className="flex flex-col items-center gap-3">
          {/* Spiral Logo */}
          <div className="relative w-14 h-14">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <defs>
                <linearGradient
                  id="spiralGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="hsl(var(--sidebar-foreground))" />
                  <stop
                    offset="100%"
                    stopColor="hsl(var(--sidebar-foreground))"
                    stopOpacity="0.7"
                  />
                </linearGradient>
              </defs>
              <path
                d="M50 10 C70 10, 85 25, 85 45 C85 65, 70 80, 50 80 C35 80, 25 70, 25 55 C25 42, 35 33, 48 33 C58 33, 65 40, 65 50 C65 58, 58 65, 50 65"
                fill="none"
                stroke="url(#spiralGradient)"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-sidebar-foreground tracking-wide">
              MedPrep
            </h1>
            <p className="text-sm text-sidebar-foreground/60 font-medium">
              STEP1 QBank
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.href}
                    className={cn(
                      "h-11 px-4 rounded-lg transition-all duration-200",
                      "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                      "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground data-[active=true]:font-medium"
                    )}
                  >
                    <Link to={item.href} className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      <span className="text-[15px]">{item.title}</span>
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
                        "h-11 px-4 rounded-lg transition-all duration-200 w-full",
                        "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                        qbankOpen && "bg-sidebar-accent/50"
                      )}
                    >
                      <GraduationCap className="h-5 w-5" />
                      <span className="text-[15px]">QBank</span>
                      <ChevronRight
                        className={cn(
                          "ml-auto h-4 w-4 transition-transform duration-200",
                          qbankOpen && "rotate-90"
                        )}
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="animate-accordion-down">
                    <SidebarMenuSub className="ml-5 pl-4 border-l border-sidebar-border/40 mt-1 space-y-0.5">
                      {qbankItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location.pathname === item.href}
                            className={cn(
                              "h-9 px-3 rounded-md text-[14px]",
                              "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
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
                        "h-11 px-4 rounded-lg transition-all duration-200 w-full",
                        "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                        flashcardsOpen && "bg-sidebar-accent/50"
                      )}
                    >
                      <Zap className="h-5 w-5" />
                      <span className="text-[15px]">Flashcards</span>
                      <ChevronRight
                        className={cn(
                          "ml-auto h-4 w-4 transition-transform duration-200",
                          flashcardsOpen && "rotate-90"
                        )}
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="animate-accordion-down">
                    <SidebarMenuSub className="ml-5 pl-4 border-l border-sidebar-border/40 mt-1 space-y-0.5">
                      {flashcardItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location.pathname === item.href}
                            className={cn(
                              "h-9 px-3 rounded-md text-[14px]",
                              "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
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
                    "h-11 px-4 rounded-lg transition-all duration-200",
                    "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                    "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground data-[active=true]:font-medium"
                  )}
                >
                  <Link to="/notebook" className="flex items-center gap-3">
                    <Notebook className="h-5 w-5" />
                    <span className="text-[15px]">My Notebook</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === "/help"}
                  className={cn(
                    "h-11 px-4 rounded-lg transition-all duration-200",
                    "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                    "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground data-[active=true]:font-medium"
                  )}
                >
                  <Link to="/help" className="flex items-center gap-3">
                    <HelpCircle className="h-5 w-5" />
                    <span className="text-[15px]">Help</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-6 py-5 border-t border-sidebar-border">
        <div className="text-center">
          <p className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wide">
            Expiration Date
          </p>
          <p className="text-xs text-sidebar-foreground/50 mt-1">
            May 07, 2026 12:00 PM EDT
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}