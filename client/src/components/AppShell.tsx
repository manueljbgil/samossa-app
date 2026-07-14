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
      className="h-9 w-9 xs:h-10 xs:w-10"
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
          <div className="mx-auto flex w-full max-w-[var(--app-shell-max-width)] items-center justify-between px-[var(--app-header-pad-x)] py-[var(--app-header-pad-y)]">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-primary xs:gap-2"
              data-testid="link-home"
            >
              <Logo size={24} className="sm:h-7 sm:w-7" />
              <div className="leading-tight">
                <div className="font-display text-base font-semibold tracking-tight text-foreground xs:text-lg">
                  Samosa Map
                </div>
                <div className="hidden text-[10px] uppercase tracking-[0.18em] text-muted-foreground xs:block">
                  Rate your samosas
                </div>
              </div>
            </Link>
            <div className="flex items-center gap-0.5 xs:gap-1">
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
                      className="gap-1 px-2 xs:gap-1.5 xs:px-3"
                      data-testid="link-profile"
                    >
                      <User className="h-4 w-4" />
                      <span className="hidden xs:inline sm:inline">
                        {user.displayName}
                      </span>
                    </Button>
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 xs:h-10 xs:w-10"
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
                    className="gap-1 px-2 xs:gap-1.5 xs:px-3"
                    data-testid="link-auth"
                  >
                    <LogIn className="h-4 w-4" />
                    <span className="hidden xs:inline">Sign in</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[var(--app-shell-max-width)] flex-1 px-[var(--app-page-gutter)] pb-[var(--app-main-bottom-space)] sm:pb-0">
          {children}
        </main>

        {/* Mobile bottom nav for quick reach */}
        <nav className="fixed left-1/2 z-40 w-[var(--app-bottom-nav-width)] max-w-[var(--app-bottom-nav-max-width)] -translate-x-1/2 rounded-full border border-border/50 bg-background/70 px-[var(--app-bottom-nav-pad)] py-[var(--app-bottom-nav-pad)] shadow-[0_10px_30px_rgba(0,0,0,0.10)] backdrop-blur-2xl bottom-[var(--app-bottom-nav-bottom)] sm:hidden">
          <div className="flex items-stretch">
            <Link href="/" className="flex-1">
              <div
                className={`flex flex-col items-center justify-center gap-[var(--app-bottom-nav-item-gap)] rounded-full px-[var(--app-bottom-nav-item-pad-x)] py-[var(--app-bottom-nav-item-pad-y)] text-[length:var(--app-bottom-nav-item-font-size)] font-medium leading-none transition-all ${
                  location === "/"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                }`}
                data-testid="nav-map"
              >
                <Map className="h-[var(--app-bottom-nav-icon-size)] w-[var(--app-bottom-nav-icon-size)]" />
                Map
              </div>
            </Link>
            <Link href={user ? "/profile" : "/auth"} className="flex-1">
              <div
                className={`flex flex-col items-center justify-center gap-[var(--app-bottom-nav-item-gap)] rounded-full px-[var(--app-bottom-nav-item-pad-x)] py-[var(--app-bottom-nav-item-pad-y)] text-[length:var(--app-bottom-nav-item-font-size)] font-medium leading-none transition-all ${
                  location.startsWith("/profile") || location === "/auth"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                }`}
                data-testid="nav-profile"
              >
                <User className="h-[var(--app-bottom-nav-icon-size)] w-[var(--app-bottom-nav-icon-size)]" />
                {user ? "Profile" : "Sign in"}
              </div>
            </Link>
          </div>
        </nav>
      </div>
    </AppShellContext.Provider>
  );
}
