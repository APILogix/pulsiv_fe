/**
 * Motion architecture (Phase 14).
 *
 * One import surface for every animated primitive in the app. Nothing here
 * animates a layout property except `AnimatedCollapse` (documented in place),
 * and every loop is disabled under `prefers-reduced-motion`.
 *
 * Import from `@/shared/motion` — never reach into individual files, so the
 * public surface stays reviewable.
 */

/* tokens + provider */
export {
  DURATION,
  DURATION_MS,
  EASE,
  SPRING,
  STAGGER,
  TRANSITION,
  fadeVariants,
  overlayVariants,
  pageVariants,
  reducedVariants,
  revealVariants,
  slideUpVariants,
  staggerContainer,
} from "./tokens";
export { MotionProvider, useMotionPreference, useVariants } from "./MotionProvider";

/* route transitions + loading */
export { PageTransition, ProgressiveReveal, RevealItem } from "./PageTransition";
export {
  AnimatedRoute,
  LoadingBoundary,
  RouteBoundary,
  moduleKey,
  type BoundaryScope,
} from "./LoadingBoundary";

/* workflow progress */
export {
  SuccessBurst,
  WorkflowInline,
  WorkflowOverlay,
  WorkflowProgress,
} from "./WorkflowProgress";
export {
  stepStatus,
  useWorkflow,
  type WorkflowResult,
  type WorkflowState,
  type WorkflowStatus,
  type WorkflowStepStatus,
} from "./useWorkflow";
export {
  ALERT_RULE_WORKFLOW,
  API_KEY_WORKFLOW,
  BILLING_WORKFLOW,
  CONNECTOR_WORKFLOW,
  DOMAIN_WORKFLOW,
  ENVIRONMENT_WORKFLOW,
  INVITE_MEMBER_WORKFLOW,
  ORGANIZATION_WORKFLOW,
  PROJECT_WORKFLOW,
  SAVE_WORKFLOW,
  WEBHOOK_WORKFLOW,
  type WorkflowStepDef,
} from "./workflow-presets";

/* empty states */
export { AnimatedEmptyState, type EmptyIllustration } from "./AnimatedEmptyState";

/* micro-interactions */
export {
  AnimatedButton,
  AnimatedCard,
  AnimatedCheckbox,
  AnimatedCollapse,
  AnimatedList,
  AnimatedListItem,
  AnimatedProgress,
  AnimatedRadio,
  AnimatedTabIndicator,
  AnimatedTableRow,
  FieldFeedback,
  HoverLift,
} from "./interactions";

/* data motion */
export {
  AnimatedArea,
  AnimatedBar,
  AnimatedLine,
  AnimatedSkeleton,
  ChartAnimation,
  CounterAnimation,
  LiveValue,
} from "./data-motion";

/* overlays */
export { AnimatedDrawer, AnimatedModal, MotionSurface } from "./overlays";

/* AI */
export {
  AiBlockReveal,
  MessageReveal,
  ReasoningPulse,
  StreamingText,
  SuggestedPrompts,
  ThinkingIndicator,
  TypingDots,
  useAutoScroll,
} from "./ai";

/* scroll */
export {
  ScrollToTop,
  SectionReveal,
  StickyHeader,
  scrollToAnchor,
  useScrollRestoration,
} from "./scroll";
