import { useMemo } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { useAdvancedMode } from "@/hooks/useAdvancedMode";
import {
  Bot,
  Settings,
  Play,
  BarChart3,
  FlaskConical,
  Trophy,
  Bell,
  Shield,
  Braces,
  Terminal,
  Target,
  BookOpen,
  FileText,
  ClipboardCheck,
} from "lucide-react";

const evaluationItems = [
  { to: "/configs", label: "Configurations", icon: Settings },
  { to: "/runs", label: "Runs", icon: Play },
  { to: "/results", label: "Results", icon: BarChart3 },
  { to: "/quick-test", label: "Quick Test", icon: FlaskConical },
];

const docsItems = [
  { to: "/schemas", label: "Schemas", icon: Braces },
  { to: "/runners", label: "Runners", icon: Terminal },
  { to: "/scorers", label: "Scorers", icon: Target },
  { to: "/config-reference", label: "Config Reference", icon: BookOpen },
];

const navOrder = [
  { type: "link" as const, to: "/agents", label: "Agents", icon: Bot },
  {
    type: "dropdown" as const,
    label: "Evaluation",
    icon: ClipboardCheck,
    items: evaluationItems,
  },
  {
    type: "link" as const,
    to: "/leaderboard",
    label: "Leaderboard",
    icon: Trophy,
  },
  { type: "link" as const, to: "/triggers", label: "Triggers", icon: Bell },
  { type: "link" as const, to: "/admin", label: "Admin", icon: Shield },
  {
    type: "dropdown" as const,
    label: "Docs",
    icon: FileText,
    items: docsItems,
  },
];

export function Layout() {
  const location = useLocation();
  const [advancedMode] = useAdvancedMode();

  const visibleNavOrder = useMemo(() => {
    if (advancedMode) return navOrder;
    return navOrder.map((entry) => {
      if (entry.type !== "dropdown" || entry.label !== "Evaluation")
        return entry;
      return {
        ...entry,
        items: entry.items.filter((item) => item.to !== "/quick-test"),
      };
    });
  }, [advancedMode]);

  return (
    <div className="min-h-full">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="group shrink-0">
              <h1 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">
                Renisa Benchmark Console
              </h1>
              <p className="text-xs text-gray-500">
                AI Agent Performance Tracking
              </p>
            </Link>
            <NavigationMenu
              viewport={false}
              className="max-w-full justify-start"
            >
              <NavigationMenuList className="flex-wrap">
                {visibleNavOrder.map((entry) => {
                  if (entry.type === "link") {
                    const Icon = entry.icon;
                    const isActive = location.pathname.startsWith(entry.to);
                    return (
                      <NavigationMenuItem key={entry.to}>
                        <NavigationMenuLink
                          asChild
                          active={isActive}
                          className={navigationMenuTriggerStyle()}
                        >
                          <Link
                            to={entry.to}
                            className="flex! flex-row! items-center! gap-1.5!"
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            {entry.label}
                          </Link>
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                    );
                  }

                  const TriggerIcon = entry.icon;
                  return (
                    <NavigationMenuItem key={entry.label}>
                      <NavigationMenuTrigger
                        onPointerMove={(e) => e.preventDefault()}
                        onPointerLeave={(e) => e.preventDefault()}
                        className={`cursor-pointer ${
                          entry.items.some((item) =>
                            location.pathname.startsWith(item.to)
                          )
                            ? "bg-accent/50 text-accent-foreground"
                            : ""
                        }`}
                      >
                        <TriggerIcon className="w-4 h-4 shrink-0" />
                        {entry.label}
                      </NavigationMenuTrigger>
                      <NavigationMenuContent
                        onPointerMove={(e) => e.preventDefault()}
                        onPointerLeave={(e) => e.preventDefault()}
                      >
                        <ul className="grid w-[200px] gap-1">
                          {entry.items.map((item) => {
                            const Icon = item.icon;
                            return (
                              <li key={item.to}>
                                <NavigationMenuLink
                                  asChild
                                  active={location.pathname.startsWith(item.to)}
                                >
                                  <Link
                                    to={item.to}
                                    className="flex! flex-row! items-center! gap-2!"
                                  >
                                    <Icon className="w-4 h-4 shrink-0" />
                                    {item.label}
                                  </Link>
                                </NavigationMenuLink>
                              </li>
                            );
                          })}
                        </ul>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  );
                })}
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
