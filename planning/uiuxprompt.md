You are a Senior Staff Frontend Engineer, UX Engineer, React Performance Expert, Motion Designer, and Accessibility Specialist.

Your task is to completely audit and upgrade the frontend of this application into an enterprise-grade AI SaaS experience similar in quality to Linear, Vercel, Stripe Dashboard, Raycast, Notion, Framer and Arc Browser.

This is NOT an animation-only task.

The primary objective is:

Make the application feel incredibly responsive even when actual backend work takes time.

Do NOT blindly add animations everywhere.

Animations must improve perceived performance.

Phase 1 — Full Frontend Audit

Audit the complete frontend.

Produce a report covering:

component tree
routing
layouts
sidebar
navigation
loading states
skeleton usage
suspense boundaries
React rendering
bundle splitting
unnecessary rerenders
expensive components
animation libraries
page transitions
scroll behavior
virtualization
lazy loading
image optimization
icon loading
fonts
theme switching
hydration issues
unnecessary API calls
duplicated fetches
React Query / TanStack Query usage
Zustand usage
memoization
code splitting

After the audit:

Rank every issue:

Critical

High

Medium

Low

Then fix every issue.

Phase 2 — Global Loading Experience

The application already has an initial loading animation.

Audit it.

Improve it.

Requirements:

When user first opens application

Show premium startup animation.

NOT

spinner

NOT

progress bar

Instead show

logo

AI pulse

subtle background animation

loading text

dynamic loading messages

Examples

Initializing workspace...

Loading AI Engine...

Preparing Dashboard...

Connecting Workspace...

Almost Ready...

The loading screen must fade naturally into the dashboard.

Never disappear abruptly.

Phase 3 — Route Transition Skeletons

Currently each page loads instantly or flashes.

Replace with intelligent page skeletons.

When user clicks sidebar

DO NOT show blank page.

Immediately render page-specific skeleton.

Examples

Dashboard

show dashboard cards skeleton

Projects

show project cards

Alerts

show alert table

Settings

show settings form skeleton

Members

show member list skeleton

Logs

show log table

Metrics

show charts placeholder

AI

show AI conversation placeholder

Every page must have its own skeleton.

Never reuse generic rectangles.

Skeleton should resemble actual layout.

Phase 4 — Workflow Progress Animations

This is extremely important.

Whenever user performs an action that actually creates resources, show workflow animation.

Examples

Organization Creation

Instead of

Loading...

Show

✓ Creating Workspace

✓ Provisioning Resources

✓ Configuring Permissions

✓ Preparing Dashboard

✓ Creating API Keys

✓ Finalizing Setup

Then

Success Animation

Navigate user.

Same for

Project Creation

Show

Creating Project

Generating Environment

Creating SDK Config

Preparing Monitoring

Generating API Key

Done

Same for

Connector Creation

Connecting Slack...

Verifying Credentials...

Creating Webhook...

Saving Configuration...

Ready

Same for

API Key Creation

Generating Secure Key

Encrypting

Saving

Ready

Same for

Alert Creation

Creating Rules

Validating Conditions

Preparing Notification Channels

Done

Same for

Invite Member

Sending Invite

Creating Access

Syncing Permissions

Done

Same for

Billing

Generating Checkout

Connecting Stripe

Preparing Subscription

Done

Every important workflow should feel alive.

Phase 5 — Empty State Animations

Every empty page must become interactive.

Instead of blank screens

Use lightweight Lottie or Framer Motion animation.

Examples

No Projects

Show floating folder

No Alerts

Show bell animation

No Logs

Show terminal animation

No Members

Show team illustration

No Dashboards

Show dashboard illustration

No AI Sessions

Show AI animation

Every empty state must guide user.

Include CTA.

Phase 6 — Sidebar Motion

Audit sidebar.

Improve every interaction.

Requirements

Opening sidebar

smooth width animation

icons fade

labels slide

Closing sidebar

text fade

icons reposition

tooltips appear

Hover

background transition

icon scale

active indicator slide

submenu

accordion animation

scroll position preserved

No janky layout shifts.

Phase 7 — Page Transition System

Currently page switching feels abrupt.

Implement page transitions.

Requirements

Old page fades

New page slides

Content appears progressively

No white flashes

No layout jump

No hydration flicker

Keep transitions under

200ms

Do NOT make application feel slow.

Phase 8 — Micro Interactions

Audit entire application.

Add tasteful micro interactions.

Examples

Buttons

hover lift

tap animation

loading state

success ripple

Cards

hover elevation

border glow

AI cards

soft pulse

Tables

row hover

selection animation

checkbox animation

Dropdown

scale

fade

Menus

spring

Tooltips

fade

Dialogs

scale

backdrop blur

Tabs

animated indicator

Switches

spring animation

Checkboxes

animated tick

Radio buttons

smooth fill

Notifications

slide

fade

progress indicator

Search

focus animation

clear animation

Command palette

scale

fade

Accordion

height animation

Charts

animate data updates

Counters

count up animation

Progress bars

animated fill

Forms

field focus

validation animation

error shake

success glow

Never over animate.

Every interaction should feel premium.

Phase 9 — Scroll Experience

Improve scrolling globally.

Implement

smooth scrolling

preserve scroll position

prevent layout jump

momentum scrolling

anchor navigation animation

section reveal animation

sticky headers

scroll restoration

Do NOT introduce lag.

Avoid heavy scroll listeners.

Phase 10 — Data Fetch Experience

Instead of

loading...

Use optimistic UX.

Examples

Immediately render layout

Skeleton fills

Data streams in

Charts animate

Cards populate

Counters count up

Avoid blocking UI.

Phase 11 — AI Experience

Because this is AI-powered SaaS

Improve AI interactions.

Streaming response animation

Thinking animation

Typing indicator

Reasoning pulse

Auto scrolling

Message reveal animation

Token streaming

Suggested prompts animation

AI cards entrance animation

Code blocks fade in

Charts animate

Phase 12 — Accessibility

All animations must respect

prefers-reduced-motion

Keyboard users should never lose focus.

Animations must not trigger motion sickness.

ARIA support required.

Screen readers should ignore decorative animations.

Phase 13 — React Performance Audit

This is equally important.

Audit entire React application.

Find

Unnecessary rerenders

State explosion

Context overuse

Large providers

Expensive effects

Missing memoization

Large bundles

Duplicate libraries

Duplicate icons

Duplicate fetches

Repeated API calls

Blocking rendering

Huge layouts

Hydration mismatch

Slow suspense

Long tasks

Large JavaScript chunks

Then fix everything.

Specific improvements

Use React.memo where appropriate

useMemo only when beneficial

useCallback only where needed

Split providers

Lazy load heavy pages

Lazy load charts

Lazy load editors

Lazy load AI

Lazy load settings

Virtualize long lists

Window tables

Optimize TanStack Table

Optimize React Query

Prefetch next route

Route-level code splitting

Component-level lazy loading

Reduce initial JS bundle

Remove dead code

Optimize Zustand selectors

Prevent unnecessary state updates

Avoid prop drilling

Batch updates

Optimize suspense boundaries

Optimize images

Optimize SVGs

Optimize icon imports

Optimize fonts

Optimize CSS

Optimize animations

Avoid layout thrashing

Avoid forced reflow

Avoid unnecessary DOM nodes

Avoid unnecessary portals

Minimize hydration work

Reduce CLS

Reduce INP

Reduce TBT

Reduce LCP

Improve FCP

Target Lighthouse score

95+

Phase 14 — Motion Architecture

Do NOT scatter animation logic.

Create reusable architecture.

Example

MotionProvider

PageTransition

AnimatedRoute

LoadingBoundary

WorkflowProgress

AnimatedButton

AnimatedCard

AnimatedTable

AnimatedModal

AnimatedSidebar

AnimatedTooltip

AnimatedDropdown

AnimatedEmptyState

AnimatedSkeleton

CounterAnimation

ChartAnimation

Everything configurable.

Phase 15 — Implementation Constraints

Do NOT break

authentication

routing

permissions

responsive layouts

dark mode

light mode

SSR

hydration

existing APIs

React Query cache

Zustand store

Use GPU-accelerated transforms only.

Prefer

opacity

transform

scale

translate

Avoid animating

width

height

top

left

unless absolutely necessary.

Target

60 FPS

No dropped frames.

Final Deliverables
Complete frontend audit report.
React performance audit report.
UX audit report.
Animation architecture.
All reusable motion components.
Page-specific skeletons for every route.
Workflow progress animations for all CRUD operations.
Empty state animations.
Sidebar and navigation animations.
Page transition system.
Micro-interaction library.
Scroll behavior improvements.
AI interaction animations.
Accessibility validation.
Bundle optimization report.
Before vs. after performance metrics (bundle size, render timings, Web Vitals where measurable).
A checklist confirming every page has been upgraded without regressions.

Important principles

Favor perceived speed over decorative effects.
Never delay navigation solely to show an animation.
Show progress only for operations that genuinely take time.
Keep animations subtle (generally 150–250 ms, with longer durations only for multi-step workflow progress).
If an optimization or animation adds complexity without measurable Ux benefit, do not implement it.