React 19 Performance & Speed Constraints
AI Agent Coding Rules — API Monitoring SaaS Dashboard
Version: 1.0
React: 19.x (stable)
Build Tool: Vite 6
Last Updated: 2026-06-22
Purpose: Enforce React 19 performance-first patterns. Every line of code must prioritize render speed, minimize re-renders, and eliminate jank. This is a real-time dashboard — speed is non-negotiable.
Table of Contents
React 19 Compiler — The Golden Rule
Memoization Policy
State Management — Speed First
React 19 Hooks — Mandatory Patterns
Rendering Performance
Data Fetching — Zero Blocking
List & Table Optimization
Form Performance
Animation & Transitions
Memory & Bundle Optimization
Anti-Patterns — NEVER DO
Performance Checklist
1. React 19 Compiler — The Golden Rule
1.1 ENABLE THE COMPILER FIRST
bash
# Install React Compiler
npm install babel-plugin-react-compiler

# vite.config.ts
import react from '@vitejs/plugin-react';

export default {
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', { target: '19' }]],
      },
    }),
  ],
};
RULE: With the compiler enabled, you DO NOT write useMemo, useCallback, or React.memo manually. The compiler handles automatic memoization at build time. Writing them manually is code smell.
1.2 Compiler-Aware Code Patterns
Write pure functions so the compiler can optimize them:
tsx
// ✅ GOOD — Pure function, compiler optimizes automatically
function MetricCard({ metric, onSelect }: MetricCardProps) {
  const formattedValue = formatMetric(metric.value); // Compiler memoizes this

  return (
    <div onClick={() => onSelect(metric.id)}>
      <h3>{metric.name}</h3>
      <p>{formattedValue}</p>
    </div>
  );
}

// ❌ BAD — Side effects in render prevent optimization
function BadMetricCard({ metric }: MetricCardProps) {
  const [data, setData] = useState();
  // Side effect during render — compiler can't optimize
  fetchData().then(setData);

  return <div>{data}</div>;
}
1.3 When Manual Memoization Is STILL Allowed
Only these 3 exceptions permit manual useMemo/useCallback:
Table
Exception	Reason	Example
Third-party library integration	Compiler can't see inside external libs	Chart.js config objects, D3 calculations
Expensive data transformations	Compiler may miss extremely heavy compute	Aggregating 10k+ log entries
Cross-component boundaries	Props crossing module boundaries	Callbacks passed to memoized table cells
tsx
// ✅ ALLOWED: Third-party chart config
function LatencyChart({ data }: { data: DataPoint[] }) {
  const chartConfig = useMemo(() => ({
    type: 'line',
    data: {
      datasets: [{
        data: data.map(d => ({ x: d.timestamp, y: d.latency })),
        borderColor: '#3b82f6',
        tension: 0.4,
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  }), [data]);

  return <ChartComponent config={chartConfig} />;
}
2. Memoization Policy
2.1 The New Default: NO MANUAL MEMOIZATION
With React 19 Compiler, this is your new default:
tsx
// ✅ THIS IS THE NEW NORMAL — No memoization needed
function DashboardWidget({ title, metrics, onRefresh }: WidgetProps) {
  // Compiler automatically memoizes all of this:
  const sortedMetrics = metrics.sort((a, b) => b.value - a.value);
  const total = sortedMetrics.reduce((sum, m) => sum + m.value, 0);
  const handleRefresh = () => onRefresh();

  return (
    <Card>
      <h2>{title}</h2>
      <MetricList metrics={sortedMetrics} />
      <p>Total: {total}</p>
      <button onClick={handleRefresh}>Refresh</button>
    </Card>
  );
}
2.2 The 3 Exceptions — With Required Comments
When you MUST use manual memoization, document WHY:
tsx
// ✅ MANUAL MEMOIZATION — Exception #1: Third-party library
// Reason: Chart.js requires stable config reference to prevent re-init
const chartConfig = useMemo(() => generateChartConfig(data), [data]);

// ✅ MANUAL MEMOIZATION — Exception #2: Expensive computation
// Reason: Aggregating 50k+ log lines — measured 120ms without memo
const aggregatedStats = useMemo(() => 
  logs.reduce((acc, log) => { /* heavy compute */ }, {}),
  [logs]
);

// ✅ MANUAL MEMOIZATION — Exception #3: Cross-module callback
// Reason: Passed to React.memo'd table cell component
const handleCellClick = useCallback((id: string) => {
  navigate(`/logs/${id}`);
}, [navigate]);
2.3 NEVER Do This
tsx
// ❌ NEVER — Unnecessary useMemo on primitives
const count = useMemo(() => items.length, [items]); // Just use items.length

// ❌ NEVER — useCallback with no dependencies
const handleClick = useCallback(() => setOpen(true), []); // Compiler handles this

// ❌ NEVER — React.memo on simple components
const SimpleBadge = React.memo(({ text }) => <span>{text}</span>); // Compiler does this

// ❌ NEVER — Inline objects that break memoization
<Chart options={{ responsive: true }} /> // Extract to constant
3. State Management — Speed First
3.1 State Location Hierarchy (Fastest to Slowest)
plain
1. LOCAL STATE (useState/useReducer) — Fastest ⚡
   ↓
2. URL STATE (React Router) — Fast
   ↓
3. ZUSTAND STORE (module-level) — Fast
   ↓
4. TANSTACK QUERY (server state) — Fast (cached)
   ↓
5. GLOBAL CONTEXT — Slowest (avoid for dynamic data)
RULE: Keep state as LOCAL as possible. Lifting state causes cascade re-renders.
tsx
// ✅ GOOD — State lives where it's used
function LatencyGraph() {
  const [timeRange, setTimeRange] = useState('1h'); // Local — perfect
  const { data } = useLatencyData(timeRange);

  return (
    <div>
      <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      <LineChart data={data} />
    </div>
  );
}

// ❌ BAD — Lifted state causes parent + siblings to re-render
function Dashboard() {
  const [timeRange, setTimeRange] = useState('1h'); // WHY IS THIS HERE?
  // Every timeRange change re-renders ENTIRE dashboard

  return (
    <div>
      <Sidebar />
      <LatencyGraph timeRange={timeRange} onChange={setTimeRange} />
      <ErrorLogPanel /> // Re-renders unnecessarily!
      <MetricCards />   // Re-renders unnecessarily!
    </div>
  );
}
3.2 Zustand — Per Module, Per Domain
tsx
// ✅ GOOD — Small, focused stores per module
// modules/metrics/store/metrics.store.ts
interface MetricsState {
  metrics: Metric[];
  selectedMetricId: string | null;
  isLoading: boolean;

  setMetrics: (metrics: Metric[]) => void;
  selectMetric: (id: string | null) => void;
}

export const useMetricsStore = create<MetricsState>()(
  devtools(
    (set) => ({
      metrics: [],
      selectedMetricId: null,
      isLoading: false,

      setMetrics: (metrics) => set({ metrics }),
      selectMetric: (id) => set({ selectedMetricId: id }),
    }),
    { name: 'MetricsStore' }
  )
);

// ✅ GOOD — Select only what you need (prevents unnecessary re-renders)
// This component ONLY re-renders when selectedMetricId changes
function MetricDetail() {
  const selectedId = useMetricsStore((state) => state.selectedMetricId);
  // NOT: const { selectedMetricId, metrics, isLoading } = useMetricsStore() 
  // That would re-render on ANY store change!

  return selectedId ? <DetailPanel id={selectedId} /> : <EmptyState />;
}
3.3 Context — Use Sparingly
tsx
// ✅ GOOD — Context for STATIC data only (theme, auth state)
const ThemeContext = createContext<Theme>('light');

// ❌ BAD — Context for frequently changing data
const MetricsContext = createContext<Metric[]>(); // NO! Use Zustand or TanStack Query
4. React 19 Hooks — Mandatory Patterns
4.1 useActionState — Forms Only
tsx
// ✅ GOOD — useActionState for all form submissions
function LoginForm() {
  const [state, submitAction, isPending] = useActionState(
    async (prevState: LoginState, formData: FormData) => {
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;

      try {
        const result = await authApi.login({ email, password });
        return { success: true, user: result.user };
      } catch (error) {
        return { success: false, error: normalizeError(error) };
      }
    },
    { success: false, error: null }
  );

  return (
    <form action={submitAction}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <SubmitButton pending={isPending} />
      {state.error && <ErrorMessage error={state.error} />}
    </form>
  );
}

// SubmitButton uses useFormStatus internally
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} isLoading={pending}>
      {pending ? 'Signing in...' : 'Sign In'}
    </Button>
  );
}
RULE: Every form MUST use useActionState. No onSubmit handlers with useState for form status.
4.2 useOptimistic — Instant UI Feedback
tsx
// ✅ GOOD — useOptimistic for instant perceived performance
function EndpointList({ endpoints }: { endpoints: Endpoint[] }) {
  const [optimisticEndpoints, addOptimisticEndpoint] = useOptimistic(
    endpoints,
    (state, newEndpoint: Endpoint) => [...state, newEndpoint]
  );

  const handleAdd = async (formData: FormData) => {
    const tempEndpoint = {
      id: crypto.randomUUID(),
      url: formData.get('url') as string,
      status: 'pending' as const,
    };

    // UI updates INSTANTLY — no waiting for server
    addOptimisticEndpoint(tempEndpoint);

    // Server request happens in background
    await api.createEndpoint(formData);
  };

  return (
    <ul>
      {optimisticEndpoints.map((ep) => (
        <EndpointCard key={ep.id} endpoint={ep} />
      ))}
    </ul>
  );
}
RULE: Use useOptimistic for ALL create/update/delete operations. Users must see feedback in < 100ms.
4.3 use() — Async Data in Suspense
tsx
// ✅ GOOD — use() inside Suspense boundaries
function UserProfile() {
  const userPromise = useAuthStore.getState().getUserPromise();
  const user = use(userPromise); // Suspends until resolved

  return <ProfileCard user={user} />;
}

// Parent provides Suspense boundary
function App() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <UserProfile />
    </Suspense>
  );
}

// ❌ BAD — use() without Suspense
function BadProfile() {
  const user = use(fetchUser()); // Will throw if not in Suspense!
  return <div>{user.name}</div>;
}
RULE: Every use() MUST be wrapped in <Suspense>. No exceptions.
4.4 useFormStatus — Submit Buttons Only
tsx
// ✅ GOOD — useFormStatus in ALL submit buttons
function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending, data, method, action } = useFormStatus();

  return (
    <Button 
      type="submit" 
      disabled={pending}
      isLoading={pending}
      aria-busy={pending}
    >
      {pending ? <Spinner size="sm" /> : children}
    </Button>
  );
}
RULE: Every submit button MUST use useFormStatus. No manual isSubmitting state.
4.5 useTransition — Non-Urgent Updates
tsx
// ✅ GOOD — useTransition for heavy UI updates
function Dashboard() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleFilterChange = (filter: Filter) => {
    // Urgent: Update filter UI immediately
    setFilter(filter);

    // Non-urgent: Heavy metric filtering can be interrupted
    startTransition(() => {
      const filtered = heavyFilterMetrics(allMetrics, filter);
      setMetrics(filtered);
    });
  };

  return (
    <div>
      <FilterBar filter={filter} onChange={handleFilterChange} />
      {isPending && <FilterLoadingIndicator />}
      <MetricGrid metrics={metrics} />
    </div>
  );
}
RULE: Use useTransition for any state update that triggers heavy re-renders (filtering, sorting large datasets).
5. Rendering Performance
5.1 Component Splitting Strategy
tsx
// ✅ GOOD — Split components to minimize re-render scope
function Dashboard() {
  return (
    <DashboardLayout>
      <Sidebar />
      <main>
        <MetricCards />      // Independent — own data fetching
        <LatencyChart />     // Independent — own data fetching
        <ErrorLogPanel />    // Independent — own data fetching
        <AlertBanner />      // Independent — own data fetching
      </main>
    </DashboardLayout>
  );
}

// Each component fetches its own data via TanStack Query
// If LatencyChart re-renders, MetricCards doesn't
5.2 Suspense Boundaries — Everywhere
tsx
// ✅ GOOD — Suspense boundaries at every async boundary
function Dashboard() {
  return (
    <DashboardLayout>
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar />
      </Suspense>

      <main>
        <Suspense fallback={<MetricCardsSkeleton />}>
          <MetricCards />
        </Suspense>

        <Suspense fallback={<ChartSkeleton />}>
          <LatencyChart />
        </Suspense>

        <Suspense fallback={<LogPanelSkeleton />}>
          <ErrorLogPanel />
        </Suspense>
      </main>
    </DashboardLayout>
  );
}
RULE: Every component that fetches data MUST be wrapped in its own <Suspense> boundary. Never wrap the entire app in one Suspense.
5.3 Lazy Loading — Route Level
tsx
// ✅ GOOD — Lazy load every route module
const DashboardPage = lazy(() => import('./modules/dashboard/pages/DashboardPage'));
const MetricsPage = lazy(() => import('./modules/metrics/pages/MetricsPage'));
const SettingsPage = lazy(() => import('./modules/settings/pages/SettingsPage'));

// Router config
const routes = [
  {
    path: '/dashboard',
    element: (
      <Suspense fallback={<PageLoader />}>
        <DashboardPage />
      </Suspense>
    ),
  },
  // ...
];
RULE: Every route component MUST be lazy-loaded. No eager imports of page components.
6. Data Fetching — Zero Blocking
6.1 TanStack Query — The Standard
tsx
// ✅ GOOD — TanStack Query with proper caching
function LatencyChart() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['latency', timeRange, endpointId],
    queryFn: () => api.getLatencyData({ timeRange, endpointId }),
    staleTime: 30 * 1000,      // Data fresh for 30s
    gcTime: 5 * 60 * 1000,     // Keep in cache for 5min
    refetchInterval: 60 * 1000, // Poll every 60s for real-time feel
    refetchOnWindowFocus: false, // Don't refetch on tab switch
  });

  if (isLoading) return <ChartSkeleton />;
  if (error) return <ErrorState error={error} />;

  return <LineChart data={data} />;
}
6.2 Parallel Queries — Fetch Together
tsx
// ✅ GOOD — Parallel data fetching
function Dashboard() {
  // These fetch in parallel, not sequence
  const metricsQuery = useQuery({ queryKey: ['metrics'], queryFn: api.getMetrics });
  const alertsQuery = useQuery({ queryKey: ['alerts'], queryFn: api.getAlerts });
  const endpointsQuery = useQuery({ queryKey: ['endpoints'], queryFn: api.getEndpoints });

  const isLoading = metricsQuery.isLoading || alertsQuery.isLoading || endpointsQuery.isLoading;

  if (isLoading) return <DashboardSkeleton />;

  return (
    <>
      <MetricCards data={metricsQuery.data} />
      <AlertBanner alerts={alertsQuery.data} />
      <EndpointStatus endpoints={endpointsQuery.data} />
    </>
  );
}
6.3 Preloading — Hover/Intent Based
tsx
// ✅ GOOD — Preload data on hover
function EndpointLink({ endpoint }: { endpoint: Endpoint }) {
  const queryClient = useQueryClient();

  const handleMouseEnter = () => {
    // Preload endpoint detail data before click
    queryClient.prefetchQuery({
      queryKey: ['endpoint', endpoint.id],
      queryFn: () => api.getEndpointDetail(endpoint.id),
      staleTime: 60 * 1000,
    });
  };

  return (
    <Link 
      to={`/endpoints/${endpoint.id}`}
      onMouseEnter={handleMouseEnter}
    >
      {endpoint.name}
    </Link>
  );
}
7. List & Table Optimization
7.1 Virtualization — Mandatory for 100+ Items
tsx
// ✅ GOOD — React Window for large lists
import { FixedSizeList } from 'react-window';

function LogTable({ logs }: { logs: LogEntry[] }) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <LogRow log={logs[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={logs.length}
      itemSize={48}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
RULE: Any list/table with >100 rows MUST be virtualized. No exceptions.
7.2 Table Cell Memoization (Manual — Exception #3)
tsx
// ✅ GOOD — Memoized table cells for large tables
const TableCell = memo(function TableCell({ 
  value, 
  onClick 
}: { 
  value: string; 
  onClick: (id: string) => void;
}) {
  return <td onClick={() => onClick(value)}>{value}</td>;
});

// Parent passes stable callback
function DataTable({ data }: { data: DataRow[] }) {
  // Manual useCallback — Exception #3: Cross-component boundary
  const handleCellClick = useCallback((id: string) => {
    navigate(`/detail/${id}`);
  }, [navigate]);

  return (
    <table>
      <tbody>
        {data.map((row) => (
          <tr key={row.id}>
            {row.cells.map((cell) => (
              <TableCell 
                key={cell.id} 
                value={cell.value} 
                onClick={handleCellClick} 
              />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
7.3 Key Prop — Always Stable
tsx
// ✅ GOOD — Stable keys
{endpoints.map((ep) => (
  <EndpointCard key={ep.id} endpoint={ep} />
))}

// ❌ BAD — Index as key causes re-render issues
{endpoints.map((ep, index) => (
  <EndpointCard key={index} endpoint={ep} /> // NEVER!
))}

// ❌ BAD — Random keys destroy performance
{endpoints.map((ep) => (
  <EndpointCard key={Math.random()} endpoint={ep} /> // NEVER!
))}
8. Form Performance
8.1 React Hook Form + Zod — The Standard
tsx
// ✅ GOOD — RHF with Zod for validation
const endpointSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Must be a valid URL'),
  interval: z.number().min(30).max(3600),
});

function CreateEndpointForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(endpointSchema),
    mode: 'onBlur', // Validate on blur, not on change
  });

  const onSubmit = handleSubmit(async (data) => {
    await api.createEndpoint(data);
  });

  return (
    <form onSubmit={onSubmit}>
      <input {...register('name')} />
      {errors.name && <ErrorText>{errors.name.message}</ErrorText>}

      <input {...register('url')} />
      {errors.url && <ErrorText>{errors.url.message}</ErrorText>}

      <button type="submit" disabled={isSubmitting}>
        Create Endpoint
      </button>
    </form>
  );
}
RULE: Use mode: 'onBlur' for validation. onChange validation causes re-renders on every keystroke.
8.2 Uncontrolled Inputs — Default Where Possible
tsx
// ✅ GOOD — Uncontrolled for simple inputs
function SearchInput({ onSearch }: { onSearch: (q: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(inputRef.current?.value ?? '');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input ref={inputRef} type="search" placeholder="Search logs..." />
      <button type="submit">Search</button>
    </form>
  );
}

// ❌ BAD — Controlled with onChange for search
function BadSearchInput({ onSearch }: { onSearch: (q: string) => void }) {
  const [query, setQuery] = useState(''); // Re-renders on EVERY keystroke!

  return (
    <input 
      value={query} 
      onChange={(e) => {
        setQuery(e.target.value); // Re-render!
        onSearch(e.target.value); // Re-render!
      }} 
    />
  );
}
9. Animation & Transitions
9.1 CSS Transitions — First Choice
tsx
// ✅ GOOD — CSS transitions for simple animations
function Toast({ message, onClose }: ToastProps) {
  return (
    <div 
      className="toast"
      style={{
        transition: 'opacity 300ms ease, transform 300ms ease',
        opacity: 1,
        transform: 'translateY(0)',
      }}
    >
      {message}
    </div>
  );
}
9.2 requestAnimationFrame for JS Animations
tsx
// ✅ GOOD — rAF for smooth JS-driven animations
function SmoothCounter({ target }: { target: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    const startValue = displayValue;
    const diff = target - startValue;
    const duration = 500;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(startValue + diff * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafRef.current!);
  }, [target]);

  return <span>{displayValue.toLocaleString()}</span>;
}
9.3 Avoid Layout Thrashing
tsx
// ❌ BAD — Forced synchronous layout
function BadComponent() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Read
    const height = ref.current!.offsetHeight;
    // Write (forces recalculation!)
    ref.current!.style.height = `${height + 10}px`;
    // Read again (forces ANOTHER recalculation!)
    const newHeight = ref.current!.offsetHeight;
  }, []);
}

// ✅ GOOD — Batch reads and writes
function GoodComponent() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Read all values first
    const height = ref.current!.offsetHeight;
    const width = ref.current!.offsetWidth;

    // Then write (single layout calculation)
    requestAnimationFrame(() => {
      ref.current!.style.height = `${height + 10}px`;
      ref.current!.style.width = `${width + 10}px`;
    });
  }, []);
}
10. Memory & Bundle Optimization
10.1 Dynamic Imports — Component Level
tsx
// ✅ GOOD — Dynamic import for heavy components
const HeavyChart = lazy(() => import('./HeavyChart'));

function AnalyticsPanel() {
  const [showChart, setShowChart] = useState(false);

  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show Analytics</button>
      {showChart && (
        <Suspense fallback={<ChartSkeleton />}>
          <HeavyChart />
        </Suspense>
      )}
    </div>
  );
}
10.2 Tree-Shakeable Imports
tsx
// ✅ GOOD — Import only what you need
import { format } from 'date-fns'; // Tree-shakes unused functions

// ❌ BAD — Import entire library
import * as dateFns from 'date-fns'; // Bundles everything
10.3 Image Optimization
tsx
// ✅ GOOD — WebP with fallback, explicit dimensions
<picture>
  <source srcSet="/chart.webp" type="image/webp" />
  <img 
    src="/chart.png" 
    alt="Metrics chart"
    width={800}
    height={400}
    loading="lazy"
    decoding="async"
  />
</picture>
11. Anti-Patterns — NEVER DO
11.1 The Forbidden List
Table
#	Anti-Pattern	Why It's Slow	Correct Alternative
1	useMemo/useCallback everywhere	Compiler handles this; manual = clutter	Let compiler optimize
2	useEffect for data fetching	Race conditions, no caching	TanStack Query
3	useEffect + setState on mount	Double render in Strict Mode	use() + Suspense
4	Inline object/function props	Breaks memoization	Extract to constants or let compiler handle
5	Index as key prop	Re-render chaos on reorder	Stable unique IDs
6	Math.random() as key	Complete re-render every time	Stable unique IDs
7	Controlled inputs for search	Re-render on every keystroke	Uncontrolled + onSubmit
8	Lifting state unnecessarily	Cascade re-renders	Keep state local
9	Context for dynamic data	Every consumer re-renders	Zustand or TanStack Query
10	No Suspense boundaries	Blocking renders	Wrap every async component
11	Eager route imports	Slower initial load	React.lazy() all routes
12	Large lists without virtualization	10k+ DOM nodes = jank	react-window or react-virtualized
13	useLayoutEffect for non-DOM reads	Blocks paint	useEffect
14	Reading window/document in render	SSR issues, forced sync layout	useSyncExternalStore
15	Promise in render without use()	Throws on every render	use() inside Suspense
11.2 Code Examples of Forbidden Patterns
tsx
// ❌ FORBIDDEN #1: useEffect for data fetching
function BadComponent() {
  const [data, setData] = useState();

  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(setData);
  }, []);

  return <div>{data}</div>;
}

// ✅ CORRECT: TanStack Query
function GoodComponent() {
  const { data } = useQuery({
    queryKey: ['data'],
    queryFn: () => api.getData(),
  });

  return <div>{data}</div>;
}

// ❌ FORBIDDEN #2: useEffect + setState on mount
function BadCounter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(10); // Extra render!
  }, []);

  return <div>{count}</div>;
}

// ✅ CORRECT: Initialize directly
function GoodCounter() {
  const [count] = useState(10); // Single render

  return <div>{count}</div>;
}

// ❌ FORBIDDEN #3: Inline object props
function BadParent() {
  return (
    <Child 
      config={{ color: 'blue', size: 'large' }} // New object every render!
      onClick={() => handleClick()} // New function every render!
    />
  );
}

// ✅ CORRECT: Extract constants (compiler handles, but explicit is clear)
const CHILD_CONFIG = { color: 'blue', size: 'large' };

function GoodParent() {
  const handleClick = useCallback(() => { /* ... */ }, []);

  return (
    <Child 
      config={CHILD_CONFIG}
      onClick={handleClick}
    />
  );
}

// ❌ FORBIDDEN #4: Reading DOM in render
function BadComponent() {
  // This runs during render — blocks paint!
  const width = document.getElementById('container')?.offsetWidth;

  return <div style={{ width }}>Content</div>;
}

// ✅ CORRECT: useSyncExternalStore
function GoodComponent() {
  const width = useSyncExternalStore(
    (callback) => {
      window.addEventListener('resize', callback);
      return () => window.removeEventListener('resize', callback);
    },
    () => document.getElementById('container')?.offsetWidth ?? 0
  );

  return <div style={{ width }}>Content</div>;
}
12. Performance Checklist
Before committing any code, verify:
Component Level
[ ] State is as local as possible
[ ] No useMemo/useCallback unless one of the 3 exceptions applies
[ ] No useEffect for data fetching (use TanStack Query)
[ ] useActionState used for all forms
[ ] useOptimistic used for create/update/delete
[ ] use() wrapped in <Suspense>
[ ] key props are stable unique IDs
[ ] Lists >100 items are virtualized
[ ] Heavy components are lazy-loaded
Render Level
[ ] React Compiler is enabled
[ ] Suspense boundaries at every async boundary
[ ] No inline object/function creation in JSX
[ ] No useLayoutEffect unless measuring DOM
[ ] startTransition used for heavy state updates
Data Level
[ ] TanStack Query with proper staleTime/gcTime
[ ] Parallel queries instead of sequential
[ ] Preloading on hover/intent
[ ] No polling intervals < 5 seconds (use WebSockets for real-time)
Bundle Level
[ ] Route-level code splitting
[ ] Tree-shakeable imports
[ ] Images optimized (WebP, explicit dimensions, lazy loading)
[ ] No unused dependencies
Quick Reference Card
plain
┌─────────────────────────────────────────────────────────────┐
│  REACT 19 SPEED CHEAT SHEET                                 │
├─────────────────────────────────────────────────────────────┤
│  FORMS      → useActionState + useFormStatus               │
│  ASYNC      → use() + Suspense                             │
│  OPTIMISTIC → useOptimistic                                │
│  HEAVY UI   → useTransition                                │
│  STATE      → Keep LOCAL (Zustand per module)              │
│  FETCHING   → TanStack Query (never useEffect)             │
│  LISTS      → react-window (if >100 items)                 │
│  MEMO       → Compiler handles it (don't manual memo)      │
│  ROUTES     → React.lazy() + Suspense                      │
│  CONTEXT    → Static data ONLY (theme, auth)               │
│  KEYS       → Stable IDs (never index/random)              │
│  SEARCH     → Uncontrolled + onSubmit (not onChange)       │
│  ANIMATION  → CSS first, rAF for JS                        │
│  LAYOUT     → Batch reads, then write in rAF              │
└─────────────────────────────────────────────────────────────┘
Remember: This is a real-time API monitoring dashboard. Every millisecond of render time matters. When in doubt, profile first with React DevTools Profiler, then optimize. Speed is a feature.