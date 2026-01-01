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
  Menu,
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
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

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
  { title: "Ready Decks", href: "/flashcards/study" },
];

export function AppSidebar() {
  const location = useLocation();
  const { toggleSidebar } = useSidebar();
  const [qbankOpen, setQbankOpen] = useState(location.pathname.startsWith("/qbank"));
  const [flashcardsOpen, setFlashcardsOpen] = useState(location.pathname.startsWith("/flashcards"));

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">MedPrep</h1>
            <p className="text-xs text-sidebar-foreground/70">STEP1 QBank</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.href}
                    className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                  >
                    <Link to={item.href}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* QBank Collapsible */}
              <Collapsible open={qbankOpen} onOpenChange={setQbankOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full">
                      <GraduationCap className="h-5 w-5" />
                      <span>QBank</span>
                      <ChevronRight
                        className={cn(
                          "ml-auto h-4 w-4 transition-transform",
                          qbankOpen && "rotate-90"
                        )}
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {qbankItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location.pathname === item.href}
                            className="text-sidebar-foreground/80 hover:text-sidebar-foreground"
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
                    <SidebarMenuButton className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full">
                      <Zap className="h-5 w-5" />
                      <span>Flashcards</span>
                      <ChevronRight
                        className={cn(
                          "ml-auto h-4 w-4 transition-transform",
                          flashcardsOpen && "rotate-90"
                        )}
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {flashcardItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location.pathname === item.href}
                            className="text-sidebar-foreground/80 hover:text-sidebar-foreground"
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
                  className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                >
                  <Link to="/notebook">
                    <Notebook className="h-5 w-5" />
                    <span>My Notebook</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === "/help"}
                  className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                >
                  <Link to="/help">
                    <HelpCircle className="h-5 w-5" />
                    <span>Help</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <p className="text-xs text-sidebar-foreground/50 text-center">
          © 2026 MedPrep. All rights reserved.
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
