import { Suspense, lazy, useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Monitor,
  GitCompare,
  ListFilter,
  Moon,
  Sun,
  Table2,
  Users,
} from "lucide-react";
import {
  type ApplicationData,
  loadApplicationDataAsync,
} from "./data/loadApplicationDataAsync";
import { cn } from "./lib/utils";

const Overview = lazy(() =>
  import("./features/overview/Overview").then((module) => ({
    default: module.Overview,
  })),
);
const PokemonExplorer = lazy(() =>
  import("./features/pokemon-explorer/PokemonExplorer").then((module) => ({
    default: module.PokemonExplorer,
  })),
);
const MovesetComparator = lazy(() =>
  import("./features/moveset-comparator/MovesetComparator").then((module) => ({
    default: module.MovesetComparator,
  })),
);
const PairBuilder = lazy(() =>
  import("./features/pair-builder/PairBuilder").then((module) => ({
    default: module.PairBuilder,
  })),
);
const LineupMatrix = lazy(() =>
  import("./features/lineup-matrix/LineupMatrix").then((module) => ({
    default: module.LineupMatrix,
  })),
);
const Methodology = lazy(() =>
  import("./features/methodology/Methodology").then((module) => ({
    default: module.Methodology,
  })),
);

type ViewId =
  "overview" | "pokemon" | "movesets" | "pairs" | "lineups" | "methodology";

type ThemeMode = "light" | "dark" | "system";

const views: Array<{
  id: ViewId;
  label: string;
  path: string;
  icon: typeof Activity;
}> = [
  { id: "overview", label: "Overview", path: "/overview", icon: BarChart3 },
  { id: "pokemon", label: "Pokemon", path: "/pokemon", icon: ListFilter },
  { id: "movesets", label: "Movesets", path: "/movesets", icon: GitCompare },
  { id: "pairs", label: "Battle Sim", path: "/pairs", icon: Users },
  { id: "lineups", label: "Lineups", path: "/lineups", icon: Table2 },
  {
    id: "methodology",
    label: "Methodology",
    path: "/methodology",
    icon: BookOpen,
  },
];

const viewByPath = new Map(views.map((view) => [view.path, view]));
const appIconUrl = `${import.meta.env.BASE_URL}app-icon.svg`;

function getHashPath() {
  const hash = window.location.hash.replace(/^#/, "");
  const [hashPath] = hash.split("?");
  const path = hashPath.startsWith("/") ? hashPath : `/${hashPath}`;
  return path === "/" || path === "" ? "/" : path.replace(/\/+$/, "");
}

function getCurrentView() {
  const path = getHashPath();
  if (path === "/") {
    return "pokemon";
  }
  return viewByPath.get(path)?.id ?? "pokemon";
}

function useHashView() {
  const [activeView, setActiveView] = useState<ViewId>(() => getCurrentView());

  useEffect(() => {
    const updateView = () => setActiveView(getCurrentView());
    window.addEventListener("hashchange", updateView);
    updateView();
    return () => window.removeEventListener("hashchange", updateView);
  }, []);

  return activeView;
}

export default function App() {
  const activeView = useHashView();
  const dataState = useApplicationData();
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readThemeMode());
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const dark = themeMode === "dark" || (themeMode === "system" && systemDark);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateTheme = () => setSystemDark(mediaQuery.matches);
    updateTheme();
    mediaQuery.addEventListener("change", updateTheme);
    return () => mediaQuery.removeEventListener("change", updateTheme);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(themeModeStorageKey, themeMode);
  }, [themeMode]);

  return (
    <div className={cn(dark && "dark")}>
      <div className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
        <header className="sticky top-0 z-20 border-b border-[rgb(var(--border))] bg-[rgb(var(--panel)/0.96)] backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-3 sm:px-4">
            <img
              src={appIconUrl}
              alt=""
              className="h-9 w-9 shrink-0 rounded-md"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold sm:text-lg">
                Rocket Pair Lab
              </h1>
              <p className="truncate text-xs text-[rgb(var(--muted-foreground))]">
                Milestone 1 data explorer. Rankings remain experimental.
              </p>
            </div>
            <ThemeModeControl mode={themeMode} onChange={setThemeMode} />
          </div>
          <nav
            className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 pb-3 sm:px-4"
            aria-label="Primary views"
          >
            {views.map((view) => {
              const Icon = view.icon;
              const isActive = activeView === view.id;
              return (
                <a
                  key={view.id}
                  href={`#${view.path}`}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm",
                    isActive
                      ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.14)] text-[rgb(var(--foreground))]"
                      : "border-[rgb(var(--border))] bg-[rgb(var(--panel))] text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted)/0.6)]",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {view.label}
                </a>
              );
            })}
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-3 py-4 sm:px-4">
          <AppView activeView={activeView} dataState={dataState} />
        </main>
      </div>
    </div>
  );
}

type DataState =
  | { status: "loading" }
  | { status: "loaded"; data: ApplicationData }
  | { status: "error"; message: string };

function useApplicationData(): DataState {
  const [dataState, setDataState] = useState<DataState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    loadApplicationDataAsync()
      .then((data) => {
        if (active) {
          setDataState({ status: "loaded", data });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setDataState({
            status: "error",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return dataState;
}

function AppView({
  activeView,
  dataState,
}: {
  activeView: ViewId;
  dataState: DataState;
}) {
  if (dataState.status === "loading") {
    return <LoadingPanel label="Loading data..." />;
  }

  if (dataState.status === "error") {
    return (
      <div
        role="alert"
        className="rounded-md border border-[rgb(var(--danger)/0.5)] bg-[rgb(var(--danger)/0.08)] p-4 text-sm text-[rgb(var(--foreground))]"
      >
        Could not load application data: {dataState.message}
      </div>
    );
  }

  const { data } = dataState;

  return (
    <Suspense fallback={<LoadingPanel label="Loading view..." />}>
      {activeView === "overview" && <Overview data={data} />}
      {activeView === "pokemon" && <PokemonExplorer data={data} />}
      {activeView === "movesets" && <MovesetComparator data={data} />}
      {activeView === "pairs" && <PairBuilder data={data} />}
      {activeView === "lineups" && <LineupMatrix data={data} />}
      {activeView === "methodology" && <Methodology data={data} />}
    </Suspense>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--panel))] p-4 text-sm text-[rgb(var(--muted-foreground))]">
      {label}
    </div>
  );
}

const themeModeStorageKey = "rocket-pair-lab:theme-mode";

function readThemeMode(): ThemeMode {
  try {
    const value = window.localStorage.getItem(themeModeStorageKey);
    return isThemeMode(value) ? value : "system";
  } catch {
    return "system";
  }
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function ThemeModeControl({
  mode,
  onChange,
}: {
  mode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}) {
  const options: Array<{ mode: ThemeMode; label: string; icon: typeof Sun }> = [
    { mode: "light", label: "Light", icon: Sun },
    { mode: "dark", label: "Dark", icon: Moon },
    { mode: "system", label: "System", icon: Monitor },
  ];

  return (
    <div
      className="inline-flex h-10 shrink-0 items-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--muted)/0.36)] p-1"
      role="group"
      aria-label="Theme mode"
    >
      {options.map((option) => {
        const Icon = option.icon;
        const selected = mode === option.mode;

        return (
          <button
            key={option.mode}
            type="button"
            onClick={() => onChange(option.mode)}
            aria-pressed={selected}
            aria-label={`${option.label} theme`}
            title={`${option.label} theme`}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-full text-[rgb(var(--muted-foreground))] transition-colors",
              selected &&
                "bg-[rgb(var(--panel))] text-[rgb(var(--foreground))] shadow-sm ring-1 ring-[rgb(var(--border))]",
              !selected &&
                "hover:bg-[rgb(var(--muted)/0.72)] hover:text-[rgb(var(--foreground))]",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
