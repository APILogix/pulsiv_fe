# Monitra Design System

> Minimal, technical, calm, and operational.
>
> Monitra is an API observability platform. Its interface should feel like precision engineering software: quiet when everything is healthy, immediately expressive when something requires attention.

---

## 1. Design Philosophy

Monitra follows a **Mono-First Observability** design language.

The interface is predominantly neutral:

* near-black backgrounds
* charcoal surfaces
* off-white typography
* muted gray secondary information
* extremely subtle borders
* restrained shadows
* compact controls
* generous but controlled whitespace
* semantic colors only when information requires them

The design should feel:

* precise
* technical
* premium
* calm
* fast
* trustworthy
* developer-first

### Core Principle

> **Color should communicate state, not decoration.**

Do not add gradients, colorful cards, glowing backgrounds, decorative blobs, excessive illustrations, or rainbow dashboards simply to make the interface look interesting.

Monitra is an operational product.

Users should be able to answer:

1. What is happening?
2. Is something wrong?
3. How serious is it?
4. Where did it happen?
5. What should I do next?

within seconds.

---

# 2. Visual Direction

## Primary Inspiration

Monitra combines:

### Linear

Take:

* restraint
* typography
* spacing discipline
* near-black canvas
* subtle surface hierarchy
* hairline borders
* compact controls
* minimal decoration
* strong information hierarchy

Linear's visual identity is largely created by restrictions rather than by a large color palette.

### Strix

Take:

* technical atmosphere
* security/engineering credibility
* operational information density
* strong state visualization
* technical product surfaces
* clear severity communication

### Monitra Difference

Do **not** reproduce either product.

Monitra should have its own identity:

> **Monochrome observability + controlled semantic color.**

---

# 3. Color System

## 3.1 Canvas

```css
--color-canvas: #08090A;
--color-canvas-elevated: #0B0C0E;
```

The application should never use pure `#000000` as the primary background.

The slight blue-neutral undertone creates depth without becoming visibly blue.

---

## 3.2 Surface Hierarchy

```css
--surface-0: #08090A;
--surface-1: #0F1012;
--surface-2: #141518;
--surface-3: #191A1D;
--surface-4: #1E2024;
```

Use surfaces progressively.

### Surface 0

Application background.

### Surface 1

Primary cards and panels.

### Surface 2

Nested cards, dropdowns and secondary panels.

### Surface 3

Hover states, selected elements and elevated controls.

### Surface 4

High-emphasis interactive surfaces.

Do not skip directly from `#08090A` to bright gray.

The hierarchy should be almost invisible.

---

# 4. Typography Colors

```css
--text-primary: #F4F5F7;
--text-secondary: #B4B8C0;
--text-tertiary: #858A94;
--text-disabled: #555A63;
```

### Primary

Use for:

* page titles
* important metrics
* selected navigation
* critical information
* primary button text

### Secondary

Use for:

* descriptions
* metadata
* table values
* supporting information

### Tertiary

Use for:

* timestamps
* labels
* helper text
* low-priority metadata

### Disabled

Use sparingly.

Disabled text should remain readable but clearly inactive.

---

# 5. Borders

Borders should provide structure without becoming visual noise.

```css
--border-subtle: rgba(255,255,255,0.05);
--border-default: rgba(255,255,255,0.08);
--border-strong: rgba(255,255,255,0.12);
--border-focus: rgba(255,255,255,0.20);
```

### Rules

Prefer:

```css
border: 1px solid rgba(255,255,255,0.06);
```

over:

```css
border: 1px solid #333;
```

Avoid heavy outlines.

Avoid borders around every individual piece of information.

Use whitespace and surface changes before borders.

---

# 6. Semantic Colors

Monitra is monochrome by default.

Semantic colors are exceptions.

## Success

```css
--success: #3CCB7F;
--success-muted: rgba(60,203,127,0.12);
--success-border: rgba(60,203,127,0.25);
```

Use for:

* healthy
* operational
* resolved
* successful requests
* passing checks

---

## Warning

```css
--warning: #E8B84A;
--warning-muted: rgba(232,184,74,0.12);
--warning-border: rgba(232,184,74,0.25);
```

Use for:

* degraded
* approaching limits
* latency warnings
* configuration problems
* attention required

---

## Error

```css
--error: #F05D5E;
--error-muted: rgba(240,93,94,0.12);
--error-border: rgba(240,93,94,0.25);
```

Use for:

* failed requests
* exceptions
* incidents
* failed jobs
* unhealthy services

---

## Info

```css
--info: #5EA7F5;
--info-muted: rgba(94,167,245,0.12);
--info-border: rgba(94,167,245,0.25);
```

Use for:

* informational events
* traces
* system messages
* neutral recommendations

---

# 7. Brand Accent

Monitra should have **one restrained brand accent**.

Recommended:

```css
--brand: #8B7CF6;
--brand-hover: #9B8DFF;
--brand-muted: rgba(139,124,246,0.12);
--brand-border: rgba(139,124,246,0.25);
```

The accent should be used for:

* primary CTA
* active navigation
* selected tabs
* focus states
* links
* important interactive states

Do not use the brand accent for:

* decorative backgrounds
* every icon
* every card
* every metric
* large gradients

The interface should still look like Monitra when the accent is removed.

---

# 8. Color Usage Ratio

Target approximately:

```text
Neutral UI       85–90%
Semantic colors   8–12%
Brand accent      2–5%
```

This is a design constraint, not a mathematical requirement.

If a page contains multiple large purple, blue, green and red regions, it is probably violating the system.

---

# 9. Typography

## Font

Primary:

```css
font-family:
  Inter,
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

For technical data:

```css
font-family:
  "SFMono-Regular",
  "SF Mono",
  "Roboto Mono",
  Consolas,
  monospace;
```

Use monospace only where it improves comprehension.

Examples:

* API endpoints
* request IDs
* trace IDs
* status codes
* timestamps
* code
* SQL
* JSON
* log output

Do not make the entire application monospace.

---

# 10. Typography Scale

## Display

```text
48px
line-height: 56px
weight: 500
letter-spacing: -0.04em
```

Use only for marketing/product hero sections.

---

## Page Heading

```text
28px
line-height: 34px
weight: 500
letter-spacing: -0.025em
```

---

## Section Heading

```text
20px
line-height: 28px
weight: 500
letter-spacing: -0.015em
```

---

## Card Heading

```text
15px
line-height: 22px
weight: 500
```

---

## Body

```text
14px
line-height: 21px
weight: 400
```

---

## Small

```text
13px
line-height: 18px
weight: 400
```

---

## Micro

```text
11px
line-height: 16px
weight: 500
```

Use for:

* badges
* table headers
* uppercase labels
* metadata

Avoid excessive uppercase text.

---

# 11. Typography Rules

Use negative tracking for large headings.

Avoid:

* extremely bold 700/800 headings everywhere
* giant text inside application dashboards
* multiple font families
* excessive uppercase
* oversized labels
* text shadows

Preferred weights:

```text
400  Regular
450  Book/medium body emphasis
500  Primary UI emphasis
600  Strong emphasis
```

The interface should feel refined rather than bold.

---

# 12. Spacing System

Use a 4px base grid.

```text
4px
8px
12px
16px
20px
24px
32px
40px
48px
64px
80px
96px
```

Default component spacing:

```text
Icon → text:       8px
Label → control:   8px
Control → control: 8–12px
Card padding:      16–24px
Section spacing:   32–48px
Major section:     64–96px
```

Do not introduce arbitrary values unless necessary.

---

# 13. Border Radius

Monitra should avoid excessive rounded UI.

```css
--radius-xs: 4px;
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 10px;
--radius-xl: 12px;
```

Use:

### 4px

Small controls and badges.

### 6px

Buttons and inputs.

### 8px

Cards and dropdowns.

### 10–12px

Large feature surfaces.

Avoid:

```css
border-radius: 9999px;
```

except for:

* status dots
* avatars
* pills
* compact tags

---

# 14. Shadows

The system is primarily border/surface driven.

Avoid large shadows.

Preferred:

```css
box-shadow:
  0 8px 30px rgba(0,0,0,0.25);
```

only for floating surfaces.

Dropdowns:

```css
box-shadow:
  0 12px 40px rgba(0,0,0,0.35);
```

Cards should generally use:

```css
box-shadow: none;
```

Depth should come from:

```text
surface + border + spacing
```

rather than:

```text
surface + huge shadow
```

---

# 15. Buttons

## Primary

```text
Background: #F4F5F7
Text:       #08090A
Radius:     6px
Height:     36px
Padding:    12px
Weight:     500
```

Hover:

```text
Background: #FFFFFF
```

---

## Brand Primary

Use when the action represents a core Monitra action.

```text
Background: #8B7CF6
Text:       #FFFFFF
Radius:     6px
```

Do not use both white-primary and purple-primary buttons in the same visual group unless there is a clear hierarchy.

---

## Secondary

```text
Background: transparent
Border: 1px solid rgba(255,255,255,0.08)
Text: #B4B8C0
```

Hover:

```text
Background: #141518
Text: #F4F5F7
```

---

# 16. Inputs

Inputs should visually disappear into the interface until interacted with.

```text
Background: #0F1012
Border: rgba(255,255,255,0.08)
Height: 36–40px
Radius: 6px
```

Focus:

```text
border: rgba(139,124,246,0.55);
box-shadow: 0 0 0 2px rgba(139,124,246,0.12);
```

Avoid bright blue browser-like focus rings.

---

# 17. Navigation

## Sidebar

Recommended width:

```text
220–240px
```

Sidebar background:

```css
#0B0C0E
```

Navigation items:

```text
Height: 32px
Radius: 6px
Padding: 8px
Gap: 8px
```

Default:

```text
Text: #858A94
```

Hover:

```text
Background: #141518
Text: #F4F5F7
```

Active:

```text
Background: #191A1D
Text: #F4F5F7
```

Use the brand color only as a small active indicator when necessary.

---

# 18. Top Navigation

Keep the top bar quiet.

```text
Height: 56–64px
Border-bottom: 1px solid rgba(255,255,255,0.05)
```

Avoid:

* oversized logos
* giant search bars
* unnecessary gradients
* multiple CTA buttons
* excessive navigation items

---

# 19. Cards

Cards should be containers for information, not decorative objects.

```css
background: #0F1012;
border: 1px solid rgba(255,255,255,0.06);
border-radius: 8px;
```

Padding:

```text
16–24px
```

Card hierarchy:

```text
Title
Supporting information
Primary value/content
Optional metadata
```

Avoid placing:

* huge icons
* gradients
* illustrations
* glowing borders

inside every card.

---

# 20. Metric Cards

Monitra dashboards should prioritize actual operational information.

Example:

```text
REQUESTS

1.24M
+12.4%

Last 24 hours
```

Primary number:

```text
24–32px
weight: 500
```

Trend:

Use semantic color only when meaningful.

---

# 21. API Monitoring Dashboard

The dashboard should answer:

```text
System health
↓
Traffic
↓
Errors
↓
Latency
↓
Affected endpoints
↓
Recent incidents
```

Recommended layout:

```text
┌─────────────────────────────────────────────┐
│ Overview                       Time Range   │
├──────────┬──────────┬──────────┬───────────┤
│ Requests │ Errors   │ P95      │ Uptime    │
├──────────┴──────────┴──────────┴───────────┤
│                                             │
│             Request / Error Graph           │
│                                             │
├───────────────────────┬─────────────────────┤
│ Endpoint Performance  │ Recent Incidents    │
│                       │                     │
├───────────────────────┴─────────────────────┤
│ Recent Events / Logs                        │
└─────────────────────────────────────────────┘
```

Do not make every dashboard section a card.

Large charts should often sit directly on the canvas with only a subtle divider.

---

# 22. Status Indicators

Status must be immediately scannable.

### Healthy

```text
● Operational
```

Green.

### Degraded

```text
● Degraded
```

Amber.

### Down

```text
● Down
```

Red.

### Unknown

```text
● Unknown
```

Muted gray.

Use both:

```text
color + text
```

Never rely on color alone.

---

# 23. Severity

Severity hierarchy:

```text
Critical → Red
Error    → Red
Warning  → Amber
Info     → Blue
Success  → Green
```

Critical states may use slightly stronger visual treatment:

```text
red indicator
+
subtle red-tinted surface
```

Never use a full red card background.

---

# 24. Tables

Tables are a major part of Monitra.

They should feel dense but readable.

Header:

```text
font-size: 11–12px
color: #858A94
weight: 500
```

Rows:

```text
height: 44–52px
```

Borders:

```text
rgba(255,255,255,0.05)
```

Hover:

```text
background: #141518
```

Avoid vertical borders unless they improve scanning.

---

# 25. Logs

Logs should use a dedicated visual hierarchy.

Example:

```text
12:42:31.821   ERROR   POST /api/users   500   842ms
```

Timestamp:

```text
#858A94
monospace
```

Severity:

semantic color.

Endpoint:

```text
#F4F5F7
monospace
```

Metadata:

```text
#858A94
```

Logs should be dense but not cramped.

---

# 26. Trace UI

Trace IDs should always be visually recognizable.

```text
trace_01J8Q4Z7M8...
```

Use monospace.

Provide copy affordances.

Span hierarchy:

```text
HTTP Request
 ├── Middleware
 ├── Database Query
 ├── Redis
 └── External API
```

Indentation should communicate hierarchy more strongly than colored backgrounds.

---

# 27. Code

Code blocks:

```css
background: #0B0C0E;
border: 1px solid rgba(255,255,255,0.06);
border-radius: 8px;
```

Font:

```text
13px monospace
line-height: 20px
```

Do not overuse syntax colors.

Monitra's code UI should remain mostly neutral with only meaningful syntax highlights.

---

# 28. Charts

Charts should be minimalist.

Default:

```text
grid: extremely subtle
axis labels: muted
background: transparent
```

Do not use:

```text
10 different bright colors
```

Recommended hierarchy:

```text
Primary series → brand accent
Secondary      → muted gray
Error          → red
Warning        → amber
Success        → green
```

For multiple neutral series, use luminance differences before introducing new hues.

---

# 29. Empty States

Empty states should be quiet.

Avoid giant illustrations.

Preferred:

```text
No incidents yet

Your monitored services are currently healthy.

[Configure monitoring]
```

Use a small icon only if useful.

---

# 30. Loading States

Use skeletons rather than spinners wherever the layout is known.

Skeleton:

```css
background: #141518;
border-radius: 4px;
```

Animation should be subtle.

Avoid aggressive shimmer effects.

---

# 31. Modals

Modal:

```text
Background: #141518
Border: rgba(255,255,255,0.08)
Radius: 10px
```

Overlay:

```css
background: rgba(0,0,0,0.60);
```

Modal hierarchy:

```text
Title
Description
Content
Actions
```

Primary action aligned consistently.

---

# 32. Command Palette

Monitra should support keyboard-first interaction.

Shortcut:

```text
⌘K / Ctrl+K
```

Command palette:

```text
┌──────────────────────────────────────┐
│ Search commands...              ⌘K  │
├──────────────────────────────────────┤
│ → Go to project                     │
│ → Search incidents                  │
│ → Search logs                       │
│ → Create alert rule                 │
│ → Open settings                     │
└──────────────────────────────────────┘
```

Command UI should feel native to the application, not like a separate component library.

---

# 33. Motion

Motion is functional.

Use:

```text
100–150ms
```

for micro-interactions.

Use:

```text
150–250ms
```

for panels and dropdowns.

Avoid:

* bounce animations
* large page transitions
* parallax
* constant pulsing
* excessive spring physics

Good motion:

```text
hover
focus
expand
collapse
panel open
status transition
```

Bad motion:

```text
decorative floating objects
continuous glowing
large entrance animations
```

---

# 34. Responsive Design

Desktop:

```text
≥ 1280px
```

Primary application experience.

Tablet:

```text
768–1279px
```

Collapse sidebar when necessary.

Mobile:

```text
< 768px
```

Prioritize:

```text
navigation
critical metrics
incidents
logs
actions
```

Do not simply squeeze the desktop dashboard onto mobile.

Tables should become:

* horizontally scrollable
* simplified
* or converted into stacked information blocks

---

# 35. Accessibility

Minimum requirements:

* WCAG AA contrast target
* keyboard navigation
* visible focus state
* semantic HTML
* ARIA only where necessary
* no color-only status communication
* reduced-motion support

For example:

Bad:

```text
●
```

Better:

```text
● Operational
```

---

# 36. Iconography

Use a consistent outline icon system.

Preferred characteristics:

```text
16px default
1.5px stroke
simple geometry
minimal detail
```

Icons should support comprehension.

Do not use icons as decoration.

Avoid mixing:

* filled icons
* outlined icons
* emoji
* 3D icons
* random icon libraries

within the same interface.

---

# 37. Background Effects

Monitra should have almost no background effects.

Allowed:

```text
very subtle radial gradient
```

only for:

* marketing hero
* major product introduction
* special promotional section

Not allowed as a default dashboard background.

Avoid:

```text
grid backgrounds
noise everywhere
glowing blobs
aurora gradients
neon borders
glassmorphism everywhere
```

The product should look expensive because of **precision**, not visual effects.

---

# 38. Glassmorphism

Do not make glassmorphism a core design language.

If used:

```css
background: rgba(15,16,18,0.75);
backdrop-filter: blur(12px);
border: 1px solid rgba(255,255,255,0.06);
```

Use only for:

* floating navigation
* command palette
* temporary overlays

Never use glass cards throughout the dashboard.

---

# 39. Marketing Website

Marketing pages can be more expressive than the application.

Recommended structure:

```text
Navigation

Hero
↓
Product proof
↓
Monitoring workflow
↓
Error intelligence
↓
Tracing
↓
Alerting
↓
AI insights
↓
Integrations
↓
Security
↓
Pricing
↓
CTA
```

Hero should remain minimal.

Example direction:

```text
Observe your APIs.
Before your users do.

Real-time monitoring,
tracing, errors and intelligence
for modern applications.

[Start monitoring]
[View documentation]
```

Large typography.

Minimal supporting graphics.

Product screenshots should provide the visual complexity.

---

# 40. Design Density

Monitra has two density modes.

## Marketing

```text
Low density
Large typography
Large spacing
Strong visual rhythm
```

## Application

```text
Medium/high density
Compact controls
Dense tables
High information throughput
```

Do not apply marketing spacing to the application.

That would make an observability dashboard inefficient.

---

# 41. Information Hierarchy

Every screen should have:

```text
Level 1
What is happening?

Level 2
Where is it happening?

Level 3
Why is it happening?

Level 4
What can I do?
```

Example:

```text
API Errors
2.8%

↓
POST /api/payment

↓
500 Internal Server Error

↓
Database connection timeout

↓
[View trace]
```

The interface should progressively reveal detail.

---

# 42. Anti-Patterns

Never generate these unless explicitly requested:

### Neon SaaS

```text
purple gradients
blue gradients
glowing cards
neon borders
```

### Generic AI SaaS

```text
gradient blobs
sparkle icons
huge rounded cards
AI magic animations
```

### Dashboard Clutter

```text
every metric inside a card
every section bordered
multiple accent colors
giant charts
```

### Dribbble UI

```text
beautiful but non-functional
oversized whitespace
tiny unreadable text
decorative graphs
fake metrics
```

### Enterprise Legacy UI

```text
heavy borders
gray panels everywhere
tiny 11px text
dense toolbar buttons
```

---

# 43. Component Decision Rule

Before adding visual decoration ask:

> Does this improve comprehension?

If yes:

```text
keep it
```

If no:

```text
remove it
```

Before adding color ask:

> Does the color communicate state, hierarchy, or action?

If no:

```text
use neutral
```

Before adding a card ask:

> Does this information require independent grouping?

If no:

```text
remove the card
```

---

# 44. AI UI Generation Rules

When generating Monitra UI, AI agents MUST follow these constraints.

### MUST

* Use dark mono-first surfaces.
* Use off-white rather than pure white for most text.
* Use subtle borders.
* Use restrained radius.
* Use Inter or equivalent modern sans.
* Use semantic colors for operational states.
* Use monospace for technical identifiers.
* Preserve visual hierarchy.
* Prefer whitespace over decorative elements.
* Keep dashboards information-dense.
* Use consistent 4px spacing increments.
* Keep colors intentional.
* Make interactive states obvious.
* Support keyboard navigation.

### MUST NOT

* Add random gradients.
* Add glowing cards.
* Add excessive purple.
* Add rainbow charts.
* Use huge shadows.
* Make every component rounded.
* Put every section inside a card.
* Use emoji as UI icons.
* Invent fake metrics.
* Add decorative illustrations to operational screens.
* Use color without semantic meaning.
* Copy Linear's interface literally.

---

# 45. Monitra Signature

The final interface should be recognizable through the combination of:

```text
Near-black canvas
+
Quiet charcoal surfaces
+
Off-white typography
+
Hairline borders
+
Compact geometry
+
Tight typography
+
One restrained brand accent
+
Semantic operational colors
+
Dense technical information
+
Almost no decoration
```

The goal is not:

> "Make it look futuristic."

The goal is:

> **"Make complex infrastructure feel simple."**

---

# 46. Final Design Test

Before shipping a screen, ask:

### Hierarchy

Can I identify the most important information in <2 seconds?

### Color

Does every color communicate something?

### Density

Is there enough information without visual overload?

### Contrast

Can muted information still be read comfortably?

### Consistency

Would another Monitra screen feel like the same product?

### Restraint

Can I remove 20% of the visual elements without losing functionality?

If yes, remove them.

### Product quality

Does the screen look like an operational tool used by engineers every day rather than a design showcase?

If not, simplify.

---

# 47. Design North Star

**Monitra should feel like:**

> A quiet control room for modern APIs.

Not a gaming dashboard.

Not a neon AI product.

Not a generic SaaS template.

Not a Linear clone.

Not a traditional enterprise monitoring console.

**Precise. Minimal. Technical. Calm. Fast.**

That is the Monitra visual identity.
