context # OBJECTIVE

You are a Staff Frontend Engineer and Principal Product Designer.

Your task is to design and implement the complete navigation system for an enterprise API observability platform (Datadog + Sentry + New Relic + Linear quality).

This is NOT a UI mockup.

This is NOT an admin template.

This is a production-grade interactive frontend prototype that will later become the real React application.

The output should feel like:

- Linear
- Datadog
- Vercel
- GitHub
- Raycast
- Stripe Dashboard

The project already has a complete design system.

Follow the design system exactly.

Do not invent random colors.

Do not use Bootstrap.

Do not use Tailwind.

Do not use Material UI.

Only HTML + CSS + Vanilla JS.

The project must be component driven.

No inline styles.

No hardcoded navigation.

Everything must be generated from configuration.

------------------------------------------------------------

# DESIGN GOALS

The application should feel

• calm
• premium
• enterprise
• developer first
• minimal
• fast
• keyboard friendly
• scalable

Every interaction should feel intentional.

No visual clutter.

Whitespace should be generous.

Typography should be small and information dense.

Animations should be subtle.

------------------------------------------------------------

# IMPORTANT

Treat this as a REAL PRODUCT.

Do NOT create a static mockup.

Everything must actually work.

------------------------------------------------------------

# PROJECT STRUCTURE

Create a project like this

navigation-demo/

    index.html

    css/

        variables.css

        reset.css

        layout.css

        topbar.css

        parent-sidebar.css

        secondary-sidebar.css

        dropdown.css

        command.css

        components.css

        animations.css

        responsive.css

    js/

        app.js

        config/

            navigation.js
            permissions.js
            roles.js
            themes.js

        core/

            router.js
            navigationEngine.js
            permissionEngine.js
            sidebarEngine.js
            storage.js

        ui/

            topbar.js
            avatarMenu.js
            parentSidebar.js
            secondarySidebar.js
            dropdown.js
            commandPalette.js
            breadcrumbs.js
            notifications.js

        data/

            organizations.js
            projects.js
            notifications.js

    assets/

        icons.svg

------------------------------------------------------------

# APPLICATION LAYOUT

Desktop Layout

---------------------------------------------------

Parent Sidebar

72px

Icon only

Always visible

↓

Secondary Sidebar

260px

Collapsible

Resizable

↓

Main Content

↓

Top Navigation

Sticky

------------------------------------------------------------

# PARENT SIDEBAR

Contains ONLY

Home

Observe

Analyze

Respond

Projects

AI

Developer

Billing

Organization

Never place user settings here.

------------------------------------------------------------

# SECONDARY SIDEBAR

Changes completely depending on parent selection.

Every parent has

Groups

↓

Items

↓

Nested items

Groups must be collapsible.

Collapse state must persist.

------------------------------------------------------------

# OBSERVE

Overview

Monitoring

    Errors
    Requests
    Traces
    Spans

Telemetry

    Logs
    Metrics
    Profiles
    Messages

Runtime

    Sessions
    Crons
    Replays

Live

    Event Stream
    Live Errors
    Live Requests

------------------------------------------------------------

# ANALYZE

Overview

Dashboards

Saved Queries

Heatmaps

Performance

Reports

Services

Endpoints

Usage

Exports

------------------------------------------------------------

# RESPOND

Overview

Alert Rules

Alert Events

Incidents

Escalation Policies

Routing

Notification Templates

Silences

Delivery Logs

Failures

------------------------------------------------------------

# PROJECTS

Recent

Favorites

All Projects

Archived

Templates

Import

Create Project

When opening a project

replace sidebar with

Overview

Observe

Analyze

Respond

Members

SDK

API Keys

Connectors

Environments

Settings

------------------------------------------------------------

# DEVELOPER

SDK

SDK Config

API Keys

Releases

Environments

Connectors

Webhooks

OAuth

API Explorer

Playground

Documentation

------------------------------------------------------------

# AI

Overview

Root Cause

Performance Analysis

Trace Analysis

Error Analysis

Reports

Usage

------------------------------------------------------------

# BILLING

Overview

Subscription

Usage

Invoices

Payments

Credits

Coupons

Payment Methods

------------------------------------------------------------

# ORGANIZATION

Overview

Branding

Members

Teams

Roles

Invitations

Domains

SSO

SCIM

Audit Logs

Feature Flags

Quota

Usage

Danger Zone

------------------------------------------------------------

# TOP BAR

Contains

Logo

Breadcrumbs

Search

Organization Switcher

Project Switcher

Notifications

Help

Command Palette

User Avatar

------------------------------------------------------------

# USER MENU

Profile

Account Settings

Notifications

Appearance

Switch Organization

Documentation

Changelog

Logout

------------------------------------------------------------

# ACCOUNT SETTINGS

Profile

Security

Notifications

Developer

Preferences

Privacy

Security

Password

MFA

Passkeys

Recovery Codes

Trusted Devices

Sessions

Login History

Developer

API Tokens

CLI Tokens

OAuth Apps

Webhooks

------------------------------------------------------------

# ROLE SYSTEM

Implement

Owner

Admin

Developer

Billing

Security

Member

Viewer

Changing role must dynamically update sidebar.

No page reload.

------------------------------------------------------------

# PERMISSION ENGINE

Never use

if(role==="owner")

Instead

Every page declares

view

edit

delete

manage

ownerOnly

The permission engine determines visibility.

------------------------------------------------------------

# NAVIGATION ENGINE

Everything must come from

navigation.js

The renderer builds

Parent sidebar

Secondary sidebar

Breadcrumbs

Command palette

Search

Favorites

Recent pages

Context menus

Everything.

No duplicated navigation.

------------------------------------------------------------

# FAVORITES

Every page can be starred.

Sidebar has

Favorites

Recent

Pinned

Persist in localStorage.

------------------------------------------------------------

# COMMAND PALETTE

Ctrl + K

Search everything.

Projects

Routes

Pages

Commands

Navigation

Settings

------------------------------------------------------------

# USER EXPERIENCE

Smooth animations.

Subtle hover effects.

Animated active indicator.

Keyboard navigation.

Arrow navigation.

ESC closes overlays.

Persistent sidebar width.

Persistent collapsed groups.

Persistent selected theme.

Persistent role.

Persistent project.

Persistent organization.

------------------------------------------------------------

# THEMES

Support

Refined

Neon

Spectrum

Switch instantly.

Use CSS variables.

------------------------------------------------------------

# RESPONSIVE

Desktop

Tablet

Mobile Drawer

Touch friendly.

------------------------------------------------------------

# ACCESSIBILITY

Keyboard navigation

ARIA labels

Focus management

Reduced motion support

Proper contrast

Tab navigation

------------------------------------------------------------

# IMPLEMENTATION RULES

Never hardcode navigation.

Never duplicate configuration.

Never use magic numbers.

Never write huge files.

Split everything into reusable modules.

Each JS file should have one responsibility.

Each CSS file should style one area.

------------------------------------------------------------

# CODE QUALITY

Use ES Modules.

No globals.

No jQuery.

No frameworks.

No libraries.

Clean architecture.

Comment major sections.

------------------------------------------------------------

# DELIVERABLES

Create

✓ Complete project structure

✓ HTML

✓ CSS

✓ JavaScript

✓ Icons

✓ README

✓ Architecture documentation

✓ Mermaid diagrams

✓ Route mapping

✓ Permission mapping

✓ Navigation mapping

------------------------------------------------------------

# EXECUTION STRATEGY

Do NOT attempt everything at once.

Implement in phases.

Phase 1
Application shell

Phase 2
Navigation engine

Phase 3
Role engine

Phase 4
Command palette

Phase 5
User settings

Phase 6
Project mode

Phase 7
Animations

Phase 8
Responsive

Phase 9
Accessibility

Phase 10
Polish

Each phase must leave the application in a fully working state before continuing.

Do not stop after one phase.

Automatically continue until the entire navigation system is complete.
------------------------------------------------------------

# SELF REVIEW (MANDATORY)

After every implementation phase:

1. Review the code as a Senior Frontend Architect.
2. Identify duplicated logic.
3. Identify accessibility issues.
4. Identify performance issues.
5. Identify maintainability problems.
6. Refactor before moving to the next phase.
7. Ensure every interaction works.
8. Ensure every animation is smooth.
9. Ensure responsive layouts are not broken.
10. Continue automatically to the next phase.

Do not ask for confirmation.

Treat completion of the entire enterprise navigation system as the only stopping condition.
note add and drop down in aboev to change role so that we can see on what role we get what 