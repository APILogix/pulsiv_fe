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
  RulesSkeleton,
  ServiceHealthSkeleton,
  SettingsSkeleton,
  TraceWaterfallSkeleton,
  WizardSkeleton,
  WorkflowsSkeleton,
} from "./pages";

// Workspace pages: the projects list, project creation, and every project tab.
export {
  ProjectActivitySkeleton,
  ProjectAlertChannelsSkeleton,
  ProjectAlertRulesSkeleton,
  ProjectAnalyticsSkeleton,
  ProjectApiKeysSkeleton,
  ProjectConnectorsSkeleton,
  ProjectCreateSkeleton,
  ProjectDeadLettersSkeleton,
  ProjectDeliveriesSkeleton,
  ProjectEnvironmentsSkeleton,
  ProjectIncidentsSkeleton,
  ProjectMembersSkeleton,
  ProjectOverviewSkeleton,
  ProjectPreferencesSkeleton,
  ProjectRouteEditorSkeleton,
  ProjectRoutesSkeleton,
  ProjectSettingsSkeleton,
  ProjectsSkeleton,
  ProjectUsageSkeleton,
  RemoteConfigSkeleton,
} from "./workspace";

export { RouteFrame, RouteSkeleton, resolveRouteSkeleton, stripOrgSlug } from "./RouteSkeleton";

