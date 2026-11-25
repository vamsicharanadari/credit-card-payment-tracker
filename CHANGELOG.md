# Changelog

All notable changes to the **Credit Card & Payment Tracker** add-on for Wealthfolio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-11-24

### 🚀 Highlights & Major Features
- **Sequential Cash-Flow Radar with Shortfall Calculator**:
  - Implemented chronological simulation of available cash in the linked checking account (`Pay from`).
  - As earlier bills in the queue consume cash, downstream bills accurately calculate if balance is insufficient and display the exact shortfall difference (e.g. `⚠️ (-$55)`).
- **Persistent Database Storage Architecture**:
  - Decoupled card metadata (`cct_cards_meta`) from heavy uploaded card background artwork (`cct_img_<accountId>`).
  - Strictly adheres to Wealthfolio's SQLite 250 KB per-record limit to guarantee 100% data retention across browser tabs, reloads, and incognito sessions.
  - Added official `"storage": ["get", "set", "remove"]` category declaration to `manifest.json`.

### 🎨 Design & UI Modernization
- **Global Typography**:
  - Enforced `JetBrains Mono` across all fonts, headings, inputs, dropdowns, and modals to match Wealthfolio's native aesthetic.
- **Glance Box Inline Row Layout**:
  - Redesigned `Total Active Cash` and `Total Payment Due` from stacked vertical layout to inline row format (labels left-aligned, values right-aligned) matching Wealthfolio's account list rows.
  - Reduced balance font sizes (`text-lg font-bold`) and utilization badge text (`text-[10px]`) for a balanced, clean visual rhythm.
- **Clean Monochrome Outlined Controls**:
  - Removed bright emojis (`📊`, `⚙️`, `⚡`, `📅`, `💳`, `💵`) from headers, navigation buttons, and the slide-to-pay slider knob.
  - Introduced clean, vector outline SVGs for `Dashboard`, `Settings & Backup`, `Refresh`, and `Slide to Pay`.
- **Text & UI Decluttering**:
  - Removed redundant helper texts:
    - *"Supports uploaded files (.png, .jpg, .webp) and data URLs. Sets this image as the background of your card."*
    - *"Cards with $0 balance are automatically hidden from the top section."*
    - *"Total revolving credit used across all configured credit cards"*
    - *"Chronological schedule of credit card statements and due dates"*
    - *"Real-time due dates, statement balances, utilization alerts, checking accounts, and data backups"*
    - *"Want to backup your card due dates, export/import JSON, or configure limits?"*

### 💳 Credit Card Embeds & Slide-to-Pay
- Display projected available balance before deduction: `(Avail: $X)`.
- When insufficient funds occur downstream, displayed highlighted badge: `⚠️ (-$Shortfall)`.
- Replaced emoji knob in `SwipeToPayButton` with a sleek monochrome cash banknote SVG icon.
- Linked the top-right glance box directly to statement payment due (`Total Payment Due`).

---

## [1.0.1] - 2026-11-23

### Fixed
- Fixed CSP violation for external image URLs by restricting uploads to `data:` and `blob:` schemes.
- Fixed currency symbol overlap in editable input fields.
- Fixed sandboxed iframe `localStorage` / `sessionStorage` `SecurityError` by routing persistence through Wealthfolio host storage API (`ctx.api.storage`).

---

## [1.0.0] - 2026-11-22

### Added
- Initial release of Credit Card & Payment Tracker add-on for Wealthfolio.
- Real-time accounts integration via Wealthfolio host API (`getAll`, `getLatestValuations`, `activities.create`).
- Upcoming Bills Radar with urgency status badges (`🔴 OVERDUE / TODAY`, `🟡 UPCOMING`, `🟢 PAID`).
- Interactive Slide-to-Pay button for marking card bills paid and auto-generating transfer activities.
- Overall Credit Utilization meter with tiered alerts.
- Dedicated Settings & Backup view with JSON export and import capabilities.
