# Impeccable Commands Guide

A comprehensive reference for all Impeccable design system commands available in the Pulsiv frontend project.

## Overview

Impeccable is an AI-powered design system that helps you create, audit, critique, and improve frontend interfaces with professional-grade quality. It covers UX review, visual hierarchy, accessibility, performance, responsive behavior, and more.

## Quick Reference

| Category | Commands | Purpose |
|----------|----------|---------|
| **Build & Setup** | `/init`, `/document`, `/shape`, `/extract` | Project setup and planning |
| **Evaluate** | `/critique`, `/audit` | Review and assessment |
| **Refine** | `/polish`, `/bolder`, `/quieter`, `/distill`, `/harden`, `/onboard` | Quality improvement |
| **Enhance** | `/animate`, `/colorize`, `/typeset`, `/layout`, `/delight`, `/overdrive` | Design enhancement |
| **Fix** | `/clarify`, `/adapt`, `/optimize` | Problem resolution |
| **Iterate** | `/live`, `/generate` | Interactive design |

---

## Build & Setup Commands

### `/init`

**Purpose:** Set up a project for Impeccable with multi-round discovery interview

**What it does:**
- Runs a discovery interview to capture product context
- Creates `PRODUCT.md` with durable project information
- Records brand attributes, target audience, and design constraints
- Establishes the foundation for all future design work

**When to use:**
- Starting a new project
- First time using Impeccable in an existing project
- When product direction has significantly changed
- Initializing design system documentation

**Example:**
```bash
/init
```

**Output:**
- Creates `PRODUCT.md` in project root
- Captures brand voice, user personas, and design principles

---

### `/document`

**Purpose:** Generate `DESIGN.md` from existing project code

**What it does:**
- Analyzes current codebase for design patterns
- Extracts components, tokens, and design decisions
- Documents the current visual design system
- Creates a snapshot of the existing design world

**When to use:**
- Documenting existing UI without proper design specs
- Onboarding to a codebase
- Before making major redesign changes
- Creating reference for design consistency

**Example:**
```bash
/document
/document src/components/
```

**Output:**
- Creates `DESIGN.md` documenting current design system
- Lists components, patterns, and design tokens found

---

### `/shape [feature]`

**Purpose:** Plan UX/UI before writing code

**What it does:**
- Multi-round discovery for specific feature
- Creates surface brief with mode (Persuade/Operate/Read/Experience)
- Documents user flows and interaction patterns
- Establishes visual direction before implementation

**When to use:**
- Starting a new feature
- Complex UI requiring upfront planning
- When design direction is unclear
- Before building new pages or flows

**Example:**
```bash
/shape "user dashboard"
/shape "onboarding flow"
/shape "settings panel"
```

**Output:**
- Surface brief with mode and user stories
- Design direction and visual hierarchy plan

---

### `/craft [feature]`

**Purpose:** (Deprecated) Build new surfaces

**What it does:**
- Legacy alias for new-work requests
- Plans and executes new feature implementation
- Follows surface brief and design direction

**When to use:**
- **DEPRECATED** - Use `/shape` instead
- Not recommended for new workflows

**Example:**
```bash
/craft "login page"  # Avoid - deprecated
```

**Output:**
- Similar to `/shape` but with older workflow

---

### `/extract [target]`

**Purpose:** Pull reusable patterns into design system

**What it does:**
- Identifies reusable components and patterns in codebase
- Extracts design tokens (colors, spacing, typography)
- Creates or updates design system files
- Standardizes scattered design decisions

**When to use:**
- Finding repeated patterns to consolidate
- Extracting hardcoded values to tokens
- Building or updating design system
- Refactoring for consistency

**Example:**
```bash
/extract
/extract src/components/Button/
/extract "button styles"
```

**Output:**
- Design system updates
- Extracted tokens and patterns
- Component standardization

---

## Evaluate Commands

### `/critique [target]`

**Purpose:** Comprehensive UX design review with heuristic scoring

**What it does:**
- Runs dual-agent assessment (LLM + automated detector)
- Scores against Nielsen's 10 usability heuristics (0-4 each)
- Evaluates cognitive load and emotional journey
- Tests against relevant user personas
- Identifies 3-5 priority issues with severity tags (P0-P3)
- Provides design specificity verdict
- Tracks score trends over time

**When to use:**
- After completing a feature
- Before releasing to production
- Identifying improvement opportunities
- Comparing design quality over time

**Example:**
```bash
/critique src/pages/Dashboard.tsx
/critique src/components/LoginForm.tsx
/critique
```

**Output:**
- Design Health Score (e.g., 28/40)
- Heuristic scoring table
- Priority issues with suggested commands
- Persona red flags
- Trend line (previous runs)
- Recommended action plan

**Severity Tags:**
- **P0**: Critical - Breaks core functionality
- **P1**: High - Significant usability issue
- **P2**: Medium - Usability friction
- **P3**: Low - Polish opportunities

**Related files:**
- Creates `.impeccable/critique/<slug>-<timestamp>.md`
- Used by `/polish` to pick up priority issues

---

### `/audit [target]`

**Purpose:** Technical quality checks (accessibility, performance, responsive)

**What it does:**
- Automated accessibility scan (WCAG compliance)
- Performance diagnostics
- Responsive behavior testing
- Design anti-pattern detection
- Technical debt identification

**When to use:**
- Accessibility compliance checking
- Performance optimization
- Mobile/responsive testing
- Technical debt assessment
- Before accessibility testing phases

**Example:**
```bash
/audit src/pages/Checkout.tsx
/audit "all forms"
/audit
```

**Output:**
- Accessibility violations with file locations
- Performance bottlenecks
- Responsive issues
- Technical recommendations

**Native variant:**
- `/audit.native` for native mobile platforms (iOS/Android)

---

## Refine Commands

### `/polish [target]`

**Purpose:** Final quality pass before shipping

**What it does:**
- Fixes alignment, spacing, and consistency issues
- Addresses priority issues from previous critique
- Removes visual artifacts and glitches
- Ensures production-ready quality
- Validates against design tokens

**When to use:**
- Before shipping to production
- Final quality gate before release
- After `/critique` to fix identified issues
- Pre-release cleanup

**Example:**
```bash
/polish src/components/Modal.tsx
/polish "header component"
/polish
```

**Output:**
- Cleaned up component files
- Applied design token consistency
- Fixed alignment and spacing issues

---

### `/bolder [target]`

**Purpose:** Amplify safe or boring designs

**What it does:**
- Adds visual interest and personality
- Increases visual hierarchy and impact
- Enhances color, typography, and spacing
- Makes timid designs stand out
- Adds distinctive visual elements

**When to use:**
- Designs feel flat or corporate
- Need more visual impact
- Landing pages need to pop
- Marketing pages need to convert

**Example:**
```bash
/bolder src/pages/HomePage.tsx
/bolder "pricing cards"
/bolder "hero section"
```

**Output:**
- Enhanced visual design
- Improved visual hierarchy
- More distinctive aesthetic

---

### `/quieter [target]`

**Purpose:** Tone down aggressive or overstimulating designs

**What it does:**
- Reduces visual noise and clutter
- Calms overstimulating elements
- Improves focus and readability
- Removes unnecessary visual elements
- Creates more serene user experience

**When to use:**
- UI feels too loud or busy
- Cognitive overload issues
- Complex dashboards needing simplification
- Content-heavy interfaces

**Example:**
```bash
/quieter src/pages/Settings.tsx
/quieter "data visualization dashboard"
/quieter "admin panel"
```

**Output:**
- Simplified visual design
- Reduced cognitive load
- Cleaner, more focused interface

---

### `/distill [target]`

**Purpose:** Strip designs to their essence

**What it does:**
- Removes unnecessary complexity
- Simplifies interactions and flows
- Reduces visual elements to minimum
- Clarifies core purpose
- Removes feature bloat

**When to use:**
- Features feel overly complex
- Simplify MVP or minimum viable versions
- Reduce cognitive overhead
- Streamline user flows

**Example:**
```bash
/distill src/pages/Profile.tsx
/distill "settings panel"
/distill "search interface"
```

**Output:**
- Simplified component
- Reduced complexity
- Clearer user flows

---

### `/harden [target]**

**Purpose:** Make interfaces production-ready

**What it does:**
- Adds error handling and edge cases
- Implements i18n and localization support
- Improves text overflow handling
- Adds loading and empty states
- Fixes accessibility gaps
- Ensures keyboard navigation

**When to use:**
- Pre-production quality pass
- After initial implementation
- Before handoff to QA
- Accessibility hardening
- Internationalization

**Example:**
```bash
/harden src/pages/Checkout.tsx
/harden "all forms"
/harden
```

**Output:**
- Production-ready components
- Error handling added
- i18n support
- Accessibility improvements

---

### `/onboard [target]**

**Purpose:** Design first-run experiences and empty states

**What it does:**
- Designs onboarding flows
- Creates engaging empty states
- Improves first-user experience
- Adds tutorial and guidance
- Reduces activation friction

**When to use:**
- New user onboarding flows
- Empty state design
- Feature discovery flows
- First-run wizard design
- Empty dashboard pages

**Example:**
```bash
/onboard src/pages/Welcome.tsx
/onboard "empty analytics"
/onboard "first-time user flow"
```

**Output:**
- Onboarding flow design
- Empty state components
- First-user experience improvements

---

## Enhance Commands

### `/animate [target]`

**Purpose:** Add purposeful animations and motion

**What it does:**
- Adds meaningful micro-interactions
- Implements smooth transitions
- Creates feedback animations
- Adds motion for state changes
- Improves perceived performance

**When to use:**
- Adding motion design
- Creating interactive feel
- Loading state animations
- Micro-interaction enhancement
- Making interfaces feel alive

**Example:**
```bash
/animate src/components/Button.tsx
/animate "loading states"
/animate "menu transitions"
```

**Output:**
- Added animations and transitions
- Micro-interaction implementations
- Motion design integration

---

### `/colorize [target]`

**Purpose:** Add strategic color to monochromatic designs

**What it does:**
- Introduces intentional color usage
- Creates visual hierarchy through color
- Adds color to indicate states
- Improves emotional resonance
- Builds brand color integration

**When to use:**
- Greyscale designs needing color
- Adding brand identity through color
- State indication (success/error/warning)
- Visual interest enhancement

**Example:**
```bash
/colorize src/components/Alerts.tsx
/colorize "status indicators"
/colorize "navigation"
```

**Output:**
- Strategic color implementation
- Color tokens and usage
- Visual hierarchy through color

---

### `/typeset [target]`

**Purpose:** Improve typography hierarchy and fonts

**What it does:**
- Fixes font choices and readability
- Establishes type hierarchy
- Improves line height and spacing
- Adds font variation and weight usage
- Optimizes reading experience

**When to use:**
- Typography feels inconsistent
- Need better visual hierarchy
- Font readability issues
- Heading/body relationship problems
- Type scaling improvements

**Example:**
```bash
/typeset src/pages/Documentation.tsx
/typeset "all text content"
/typeset "article layout"
```

**Output:**
- Improved typography
- Type scale implementation
- Better readability

---

### `/layout [target]`

**Purpose:** Fix spacing, rhythm, and visual hierarchy

**What it does:**
- Fixes spacing inconsistencies
- Establishes grid systems
- Improves visual rhythm
- Aligns elements properly
- Optimizes responsive layout

**When to use:**
- Spacing feels inconsistent
- Layout alignment issues
- Grid/responsive problems
- Visual rhythm improvements
- Component positioning

**Example:**
```bash
/layout src/pages/Dashboard.tsx
/layout "all card components"
/layout "form layouts"
```

**Output:**
- Consistent spacing system
- Better grid alignment
- Improved visual hierarchy

---

### `/delight [target]`

**Purpose:** Add personality and memorable touches

**What it does:**
- Adds micro-moments of joy
- Creates unexpected surprises
- Improves emotional connection
- Adds thoughtful details
- Makes interfaces memorable

**When to use:**
- Adding personality to boring UIs
- Creating memorable experiences
- Improving user emotional connection
- Delight-driven design improvements
- Easter egg additions

**Example:**
```bash
/delight src/pages/Achievements.tsx
/delight "success states"
/delight "error messages"
```

**Output:**
- Delightful micro-interactions
- Personality additions
- Memorable UI moments

---

### `/overdrive [target]`

**Purpose:** Push interfaces past conventional limits

**What it does:**
- Creates technically ambitious features
- Adds ambitious visual effects
- Implements cutting-edge interactions
- Breaks conventional design patterns
- Creates "wow" moments

**When to use:**
- Portfolio pieces needing showcase
- Ambitious feature requests
- Technical showcases
- Pushing design boundaries
- "Extraordinary" interfaces

**Example:**
```bash
/overdrive src/pages/Showcase.tsx
/overdrive "hero animation"
/overdrive "immersive experience"
```

**Output:**
- Ambitious visual effects
- Cutting-edge implementations
- Technically extraordinary features

---

## Fix Commands

### `/clarify [target]`

**Purpose:** Improve UX copy, labels, and error messages

**What it does:**
- Improves clarity of text content
- Fixes unclear labels and instructions
- Clarifies error messages
- Improves microcopy
- Enhances user guidance

**When to use:**
- Confusing copy or labels
- Unclear error messages
- Poor user guidance
- Technical jargon issues
- Instructional text improvements

**Example:**
```bash
/clarify src/components/Form.tsx
/clarify "error messages"
/clarify "button labels"
```

**Output:**
- Improved copy
- Clearer error messages
- Better user guidance

---

### `/adapt [target]`

**Purpose:** Adapt designs for different devices and screen sizes

**What it does:**
- Fixes responsive behavior
- Adapts layout for mobile/tablet/desktop
- Creates device-specific optimizations
- Ensures mobile-first approach
- Handles responsive breakpoints

**When to use:**
- Mobile responsiveness issues
- Tablet layout problems
- Responsive design improvements
- Device-specific adaptations
- Breakpoint optimization

**Example:**
```bash
/adapt src/pages/Navigation.tsx
/adapt "header component"
/adapt "all layout components"
```

**Output:**
- Fixed responsive layouts
- Device-specific adaptations
- Improved mobile experience

**Native variant:**
- `/adapt.native` for native mobile platforms (iOS/Android)

---

### `/optimize [target]**

**Purpose:** Diagnose and fix UI performance

**What it does:**
- Identifies performance bottlenecks
- Optimizes rendering performance
- Fixes slow interactions
- Reduces bundle size impact
- Improves perceived performance

**When to use:**
- Slow rendering issues
- Poor interaction performance
- Large component optimization
- Performance regression fixes
- Rendering optimization

**Example:**
```bash
/optimize src/pages/DataTable.tsx
/optimize "heavy components"
/optimize "rendering performance"
```

**Output:**
- Performance improvements
- Optimized components
- Better rendering performance

---

## Iterate Commands

### `/live`

**Purpose:** Interactive live variant mode

**What it does:**
- Boots live mode for browser-based iteration
- Allows picking elements in browser
- Enables side-by-side variant comparison
- Supports quick A/B testing in browser
- Interactive design iteration

**When to use:**
- Quick design iteration
- Browser-based visual comparison
- A/B testing ideas
- Element-level refinement
- Live design exploration

**Example:**
```bash
/live
```

**Output:**
- Opens live browser mode
- Enables interactive design iteration
- Allows element picking and variant creation

---

### `/generate [n] [action] [element]`

**Purpose:** Generate variants without manual picking

**What it does:**
- Creates multiple variants automatically
- Boots live mode with generated options
- Generates alternatives without manual selection
- Supports batch variant creation
- Agent-driven design generation

**When to use:**
- Need multiple design alternatives
- Quick exploration of options
- Batch variant generation
- Design exploration without manual picking
- Rapid iteration

**Example:**
```bash
/generate 3 variants for "button"
/generate 5 alternatives for "card"
/generate 4 styles for "icon button"
```

**Output:**
- Multiple design variants generated
- Live browser with alternatives
- Automated design exploration

---

## Utility Commands

### `/impeccable`

**Purpose:** General design work trigger

**What it does:**
- Generic design improvement command
- Handles general design requests
- Routes to appropriate specialized commands
- Falls back to general design work

**When to use:**
- General design requests
- When specific command unclear
- Open-ended design improvements

**Example:**
```bash
/impeccable "make this page better"
/impeccable "improve the user experience"
```

**Output:**
- Routes to appropriate command or workflow

---

## Usage Workflows

### New Feature Workflow

1. **`/init`** - Set up project context (first time only)
2. **`/shape [feature]`** - Plan UX/UI
3. **Implement component** - Build with design direction
4. **`/critique [target]`** - Review and get score
5. **`/polish [target]`** - Fix issues
6. **`/critique [target]`** - Verify improvements

### Audit & Improve Existing UI

1. **`/audit [target]`** - Technical quality check
2. **`/critique [target]`** - UX design review
3. **Run relevant fix commands** based on findings:
   - `/clarify` for copy issues
   - `/adapt` for responsive issues
   - `/optimize` for performance
   - `/harden` for production readiness
4. **`/polish [target]`** - Final quality pass
5. **`/critique [target]`** - Measure improvement

### Design System Maintenance

1. **`/document`** - Generate DESIGN.md (first time)
2. **`/extract`** - Find reusable patterns
3. **`/audit`** - Check design system consistency
4. **Update components** with extracted tokens
5. **`/polish`** - Ensure quality

### Accessibility Focus

1. **`/audit`** - Check accessibility violations
2. **`/harden`** - Fix accessibility gaps
3. **`/adapt`** - Ensure mobile accessibility
4. **`/critique`** - Verify improvements

---

## Command Execution Methods

### Method 1: Chat Commands (Recommended)

Simply type the command in Kiro chat:

```
/critique src/pages/Dashboard.tsx
/audit src/components/Form.tsx
/polish "login component"
```

### Method 2: CLI Commands

```bash
# Navigate to frontend directory
cd c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe

# Run commands via impeccable
impeccable critique src/pages/Dashboard.tsx
impeccable audit src/components/Form.tsx

# Or use the skill script directly
.\.agents\skills\impeccable\scripts\impeccable.cmd critique src/pages/Dashboard.tsx
```

### Method 3: With Dev Server Running

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run commands (can use URLs)
impeccable critique http://localhost:5173/dashboard
impeccable audit http://localhost:5173/settings
```

---

## Tips & Best Practices

### Getting Started
- **Start small**: Begin with a single component
- **Run critique**: Get a baseline score before making changes
- **Track trends**: Re-run critique after changes to measure improvement
- **Use polish**: Let `/polish` handle common issues before manual work

### Effective Critique
- **Complete features**: Critique works best on finished UI
- **Run dev server**: Browser visualization requires running server
- **Multiple targets**: Test different components for variety
- **Review scores**: Use trends to track improvement

### Command Selection
- **Unclear what to use?**: Start with `/critique` to get recommendations
- **Multiple issues**: Let critique identify priority order
- **Specific problems**: Match issue type to command:
  - Copy issues → `/clarify`
  - Responsive issues → `/adapt`
  - Performance issues → `/optimize`
  - Accessibility issues → `/audit` + `/harden`

### File Organization
- **Context files**: `PRODUCT.md` and `DESIGN.md` stay in project root
- **Critique reports**: Saved to `.impeccable/critique/`
- **Trends**: Track score history for comparison
- **Configuration**: `.impeccable/config.local.json`

---

## Common Scenarios

### Scenario 1: New Feature
> "I need to build a settings page"
```
/shape "settings page"
# Plan created, then build components
/critique src/pages/Settings.tsx
/polish src/pages/Settings.tsx
```

### Scenario 2: Improving Existing UI
> "This dashboard feels cluttered"
```
/audit src/pages/Dashboard.tsx
/critique src/pages/Dashboard.tsx
/quieter src/pages/Dashboard.tsx
/layout src/pages/Dashboard.tsx
```

### Scenario 3: Accessibility Focus
> "We need to improve accessibility"
```
/audit
/harden
/adapt
/critique
```

### Scenario 4: Visual Enhancement
> "Make this page more engaging"
```
/critique src/pages/Home.tsx
/bolder src/pages/Home.tsx
/colorize src/pages/Home.tsx
/animate src/pages/Home.tsx
```

### Scenario 5: Performance Issues
> "This page loads slowly"
```
/optimize src/pages/Dashboard.tsx
/audit src/pages/Dashboard.tsx
/critique src/pages/Dashboard.tsx
```

---

## Error Handling

### Context Loading Failed
If `impeccable context` fails:
1. Read existing `PRODUCT.md` and `DESIGN.md` directly
2. Continue with planning/editing
3. Don't block on context reload

### Sub-Agents Unavailable
When sub-agents aren't exposed:
1. Run assessments sequentially instead of parallel
2. Report `⚠️ DEGRADED: single-context` in output
3. Continue with degraded mode

### Detector Unavailable
If `impeccable detect` fails:
1. Report deterministic scan unavailable
2. Continue with browser/manual review
3. Note in run notes

### Browser Injection Failed
If browser overlay injection fails:
1. Report fallback signal used
2. Note no reliable overlay available
3. Continue without browser visualization

---

## Related Files

- **`.impeccable/`** - Impeccable configuration and data directory
- **`PRODUCT.md`** - Product context documentation
- **`DESIGN.md`** - Design system documentation
- **`.impeccable/critique/`** - Critique reports and history
- **`.impeccable/config.local.json`** - Local configuration
- **`.agents/skills/impeccable/SKILL.md`** - Full skill documentation
- **`.agents/skills/impeccable/reference/`** - Detailed command references

---

## Additional Resources

- **Documentation**: https://impeccable.style/
- **Cheatsheet**: https://impeccable.style/cheatsheet
- **Commands**: `/<command>` in Kiro harness

---

## Quick Command Reference

```
# Setup & Planning
/init                    Set up project context
/document                Generate DESIGN.md
/shape [feature]         Plan UX/UI

# Evaluation
/critique [target]       UX review + heuristic score
/audit [target]          Technical checks (a11y, perf)

# Refinement
/polish [target]         Final quality pass
/bolder [target]         Amplify visual interest
/quieter [target]        Reduce visual noise
/distill [target]        Strip to essence
/harden [target]         Production-ready
/onboard [target]        First-run experiences

# Enhancement
/animate [target]        Add purposeful motion
/colorize [target]       Strategic color addition
/typeset [target]        Typography hierarchy
/layout [target]         Spacing and rhythm
/delight [target]        Add personality
/overdrive [target]      Push beyond limits

# Fix
/clarify [target]        Improve UX copy
/adapt [target]          Responsive adaptation
/optimize [target]       Performance fixes

# Iteration
/live                    Interactive browser mode
/generate [n] [action]   Auto-generate variants
```

---

*Last Updated: September 2026*
*Part of Impeccable Design System v4.4.0*