# UI/UX Design Brief & Style Guide

---

## 1. Visual Style & Theme
PodcastIQ is styled with a premium, sleek, developer-friendly **Dark Mode** interface. The visual language is inspired by high-end modern developer workspaces (like *Linear*, *Notion*, and *Vercel*):
*   **Aesthetic:** Modern minimal, flat borders, smooth shadows, and deep neon gradients.
*   **Vibe:** Professional, blazing fast, highly polished, and responsive.
*   **Structural Grid:** Standard 12-column flex and grid layouts with unified gap sizes (`gap-4` and `gap-6`).

---

## 2. Design System Tokens (Color Palette)

We configure these standard CSS color variables to create a cohesive palette:

```css
:root {
  /* Background Tones */
  --bg-primary: #0F0F0F;    /* Deep pitch black background */
  --bg-secondary: #161616;  /* Glass card backgrounds */
  --bg-tertiary: #1E1E1E;   /* Input backgrounds & inactive states */

  /* Border Tones */
  --border-muted: #222222;   /* Subtle divider line */
  --border-active: #2E2E2E;  /* Focused or highlighted borders */

  /* Accent Colors */
  --accent-purple: #6C63FF;  /* Sleek neon purple for CTAs and highlights */
  --accent-purple-glow: rgba(108, 99, 255, 0.15); /* Drop shadow glow */

  /* Text Colors */
  --text-primary: #F5F5F5;   /* Crisp white for headlines & main content */
  --text-secondary: #888888; /* Muted gray for captions & secondary notes */
  --text-disabled: #555555;  /* Inactive states */

  /* Semantic Alerts */
  --color-success: #22C55E;  /* Emerald Green */
  --color-error: #EF4444;    /* Ruby Red */
  --color-warning: #F59E0B;  /* Amber Yellow */
}
```

---

## 3. Typography (Inter Google Font)
*   **Font Family:** `Inter, sans-serif` (linked via Google Fonts).
*   **Typography Scale:**
    *   `H1 (Title):` `32px` (2rem) | Font-weight: `800 (Extra Bold)` | Line-height: `1.25`
    *   `H2 (Subsections):` `24px` (1.5rem) | Font-weight: `700 (Bold)` | Line-height: `1.35`
    *   `H3 (Card Titles):` `18px` (1.125rem) | Font-weight: `600 (Semi-Bold)` | Line-height: `1.4`
    *   `Body:` `14px` (0.875rem) | Font-weight: `400 (Regular)` | Line-height: `1.5`
    *   `Captions/Timestamps:` `12px` (0.75rem) | Font-weight: `500 (Medium)` | Line-height: `1.6`

---

## 4. UI Component Specifications

### 4.1. Action Buttons (`button`)
*   **Primary CTA Button:**
    *   *Sizing:* Height `40px`, horizontal padding `16px` (`py-2 px-4`).
    *   *Styling:* Rounded corners (`rounded-lg` / `8px`), background `--accent-purple`, text white, bold text.
    *   *Transition:* On hover, subtle scale up `scale-105` and a soft purple drop-shadow glow (`shadow-[0_0_15px_rgba(108,99,255,0.4)]`).
*   **Secondary/Tab Buttons:**
    *   *Styling:* Background transparent, border `1px solid --border-muted`, text `--text-secondary`.
    *   *Active State:* Background `--bg-tertiary`, text `--text-primary`, border `--accent-purple`.

### 4.2. Glass Cards (`div.card`)
*   *Sizing:* Padding `24px` (`p-6`), rounded corners `12px` (`rounded-xl`).
*   *Styling:* Background `--bg-secondary` with `backdrop-filter: blur(8px)`, border `1px solid --border-muted`.
*   *Shadow:* Box-shadow `0 4px 30px rgba(0, 0, 0, 0.5)`.

### 4.3. Text Input Fields (`input`, `textarea`)
*   *Sizing:* Height `40px` (inputs), padding `12px` (`px-3 py-2`), rounded corners `8px` (`rounded-lg`).
*   *Styling:* Background `--bg-tertiary`, border `1px solid --border-muted`, text `--text-primary`.
*   *Focus State:* Border `--accent-purple`, ring/glow `0 0 0 2px --accent-purple-glow`.

### 4.4. Timestamp Chips (`button.timestamp`)
*   *Sizing:* Inline pill capsule, horizontal padding `8px`, vertical padding `2px` (`px-2 py-0.5`), rounded `9999px`.
*   *Styling:* Background `rgba(108, 99, 255, 0.12)` (light purple wash), text `--accent-purple`, font-size `12px` (`text-xs`), bold numbers.
*   *Hover:* Background `rgba(108, 99, 255, 0.22)`, text-decoration none.

### 4.5. Chat Conversation Bubbles
*   **User Message Bubble:**
    *   *Alignment:* Right-aligned (`justify-end ml-auto`).
    *   *Styling:* Rounded-xl with bottom-right corner sharp, background `--accent-purple`, text `--text-primary`, max-width `70%`.
*   **AI Message Bubble:**
    *   *Alignment:* Left-aligned (`justify-start mr-auto`).
    *   *Styling:* Rounded-xl with bottom-left corner sharp, background `--bg-secondary`, border `1px solid --border-muted`, text `--text-primary`, max-width `75%`.

---

## 5. Layout & Screen Grids

### 5.1. Landing & Intake Screens (Desktop)
*   **Layout:** Single-column layout centered both vertically and horizontally (`flex flex-col items-center justify-center min-h-screen`).
*   **Focus Card:** A standard centered glass card of max-width `640px` containing all action controls to keep cognitive load minimal.

### 5.2. Results Screen (Desktop Split-Pane)
*   **Layout:** Two-column split viewport layout with zero scroll on the root container.
    *   `Left Sidebar Panel (Width: 35%, 100vh):`
        *   Fixed height viewport with independent scroll (`overflow-y-auto`).
        *   Displays a list of transcript segments marked with large clickable timestamp chips.
    *   `Right Action Dashboard (Width: 65%, 100vh):`
        *   Header section showing podcast title, duration, and metadata.
        *   Tab control bar (Chat | Show Notes | Quotes | Social Content).
        *   Dynamic content viewport with independent scroll.

---

## 6. Responsive Rules (Mobile Adapting)
While the interface is optimized for desktop productivity, it wraps gracefully on tablet and mobile screens:
*   **Split-Pane Collapse:** For viewports below `768px` (standard `md` break), the split pane converts to a stacked single-column layout. The **Timeline** shifts to a horizontal sliding bar at the top, and the **Action Dashboard** occupies the primary lower area.
*   **Header Compaction:** Logo and links collapse into an elegant hamburger button menu.
*   **Card Compaction:** Card paddings shift from `p-6` (desktop) to `p-4` (mobile).

---

## 7. Interactive Details & Micro-Animations

### 7.1. Timestamp Chip Hover Glow
```css
.timestamp-chip {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.timestamp-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 0 10px rgba(108, 99, 255, 0.4);
}
```

### 7.2. Chat Send Button Spinner
When a question is processing, the send icon transitions to a continuous rotating ring:
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.spinner-active {
  animation: spin 0.8s linear infinite;
}
```

### 7.3. Segment Hover Tooltip
Hovering over a timeline block highlights the element with a glowing left border (`border-l-2 border-l-[#6C63FF]`) and displays a smooth fade-in tooltip preview showing the text summary of that chunk.
