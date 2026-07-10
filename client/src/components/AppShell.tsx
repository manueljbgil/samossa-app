import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Map, User, LogOut, LogIn, Moon, Sun } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Logo } from "./Logo";

type AppShellContextValue = {
  headerAction: ReactNode;
  setHeaderAction: (action: ReactNode) => void;
};

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function useAppShell() {
  const context = useContext(AppShellContext);

  if (!context) {
    throw new Error("useAppShell must be used within AppShell");
  }

  return context;
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [dark]);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
  }, []);
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={() => setDark((d) => !d)}
      aria-label="Toggle dark mode"
      data-testid="button-theme-toggle"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [headerAction, setHeaderAction] = useState<ReactNode>(null);

  const contextValue = useMemo(
    () => ({ headerAction, setHeaderAction }),
    [headerAction],
  );

  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;

    const updateHeaderHeight = () => {
      document.documentElement.style.setProperty(
        "--app-header-height",
        `${header.offsetHeight}px`,
      );
    };

    updateHeaderHeight();
    window.addEventListener("resize", updateHeaderHeight);
    return () => window.removeEventListener("resize", updateHeaderHeight);
  }, []);

  return (
    <AppShellContext.Provider value={contextValue}>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <header className="sticky top-0 z-30 border-b border-card-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-primary"
              data-testid="link-home"
            >
              <Logo size={28} />
              <div className="leading-tight">
                <div className="font-display text-lg font-semibold tracking-tight text-foreground">
                  Samosa Map
                </div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Rate your samosas
                </div>
              </div>
            </Link>
            <div className="flex items-center gap-1">
              {headerAction}
              <ThemeToggle />
              {user ? (
                <>
                  <Link href="/profile">
                    <Button
                      type="button"
                      variant={
                        location.startsWith("/profile") ? "secondary" : "ghost"
                      }
                      size="sm"
                      className="gap-1.5"
                      data-testid="link-profile"
                    >
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {user.displayName}
                      </span>
                    </Button>
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => logout()}
                    aria-label="Log out"
                    data-testid="button-logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Link href="/auth">
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5"
                    data-testid="link-auth"
                  >
                    <LogIn className="h-4 w-4" />
                    Sign in
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 sm:pb-0">
          {children}
        </main>

        {/* Mobile bottom nav for quick reach */}
        <nav className="fixed bottom-[1.75rem] left-1/2 z-40 w-[calc(100%-1rem)] max-w-[20rem] -translate-x-1/2 rounded-full border border-border/50 bg-background/70 px-1.5 py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.10)] backdrop-blur-2xl sm:hidden">
          <div className="flex items-stretch">
            <Link href="/" className="flex-1">
              <div
                className={`flex flex-col items-center justify-center gap-0.5 rounded-full px-2.5 py-1.5 text-[10px] font-medium transition-all ${
                  location === "/"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                }`}
                data-testid="nav-map"
              >
                <Map className="h-4 w-4" />
                Map
              </div>
            </Link>
            <Link href={user ? "/profile" : "/auth"} className="flex-1">
              <div
                className={`flex flex-col items-center justify-center gap-0.5 rounded-full px-2.5 py-1.5 text-[10px] font-medium transition-all ${
                  location.startsWith("/profile") || location === "/auth"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                }`}
                data-testid="nav-profile"
              >
                <User className="h-4 w-4" />
                {user ? "Profile" : "Sign in"}
              </div>
            </Link>
          </div>
        </nav>
      </div>
    </AppShellContext.Provider>
  );
}
