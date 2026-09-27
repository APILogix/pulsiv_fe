/**
 * Page-shaped skeleton library (Phase 3).
 *
 * `RouteSkeleton` picks the right one from the URL; the individual exports are
 * available for local boundaries (tab panels, lazy widgets, optimistic lists).
 */
export {
  Block,
  Skeleton,
  SkeletonText,
  SkeletonCircle,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonInput,
  SkeletonToggle,
  SkeletonSelect,
  SkeletonTabs,
  SkeletonHeader,
  SkeletonFilters,
  SkeletonCard,
  SkeletonChart,
  SkeletonList,
  SkeletonDrawer,
  SkeletonModal,
  SkeletonCardGrid,
  SkeletonChartCard,
  SkeletonDetailPanels,
  SkeletonForm,
  SkeletonKpiRow,
  SkeletonLogStream,
  SkeletonPageHeader,
  SkeletonPeopleList,
  SkeletonShell,
  SkeletonTable,
  SurfaceCard,
} from "./primitives";

export {
  AiConversationSkeleton,
  AiOverviewSkeleton,
  AlertsSkeleton,
  AuditSkeleton,
  AuthCardSkeleton,
  BillingSkeleton,
  DashboardGallerySkeleton,
  DashboardSkeleton,
  DetailSkeleton,
  ErrorGroupsSkeleton,
  ExplorerTableSkeleton,
  GenericPageSkeleton,
  GeoSkeleton,
  IntegrationsSkeleton,
  KeysSkeleton,
  ListSkeleton,
  LogsSkeleton,
  MembersSkeleton,
  MetricsSkeleton,
  ProjectOverviewSkeleton,
  ProjectsSkeleton,
  RemoteConfigSkeleton,
  RulesSkeleton,
  ServiceHealthSkeleton,
  SettingsSkeleton,
  TraceWaterfallSkeleton,
  WizardSkeleton,
  WorkflowsSkeleton,
} from "./pages";

export { RouteSkeleton, resolveRouteSkeleton, stripOrgSlug } from "./RouteSkeleton";

