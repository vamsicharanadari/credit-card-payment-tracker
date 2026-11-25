# Credit Card & Cash Payment Tracker
### A Native Add-on for Wealthfolio

The **Credit Card & Cash Payment Tracker** add-on turns your [Wealthfolio](https://wealthfolio.app) instance into a complete **Debt & Payment Command Center**.

While Wealthfolio tracks transactions, balances, and net worth, this add-on fills the missing revolving debt layer: **statement payment due dates, payment due amounts, credit limits, cash-flow radar with shortfall calculation, utilization meters, payable checking accounts, and automated two-way payment logging**.

---

## Features

* **Side-by-Side "At a Glance" Summary:**
  * **Left Box (Cash & Checking):** Real-time sum of checking and savings accounts. Toggle filter on any account to exclude it from the total.
  * **Right Box (Credit Cards):** Total statement payment due. Toggle filter on any card to exclude it from the total.
  * **Net Liquid Position:** Displays real-time `Active Cash minus Total Payment Due`.
* **Upcoming Bills & Payment Radar:**
  * Chronologically sorted by due date:
    * 🔴 **Critical:** Due in $\le 3$ days or overdue
    * 🟡 **Upcoming:** Due in $4 - 7$ days
    * 🟢 **Later:** Due in $> 7$ days
  * **Sequential Cash-Flow Simulation & Insufficient Funds Guard:** Chronologically simulates checking account balance deductions across upcoming bills and displays exact shortfall warnings (e.g. `⚠️ (-$55)`) if available funds run low.
  * **Collapsible "Paid / $0 Due" Drawer:** Cards with `$0.00` due move into a collapsed section to keep focus on actionable bills.
* **Two-Way "✓ Mark as Paid" Workflow & Slide to Pay:**
  * Slide to pay or click "Mark as Paid" to confirm.
  * Creates an internal `TRANSFER_OUT` from Checking and `TRANSFER_IN` to Card in Wealthfolio.
  * Automatically rolls the calendar due date forward by **+1 month**.
  * Resets `Payment Due` to `$0.00`.
* **Optional Rates & Promotions:**
  * **APR is strictly optional.**
  * Optional **0% Promo Expiration Date** countdown badge (alerts in amber/red when $\le 30$ days remain).
* **Overall Credit Utilization Meter:**
  * Visual progress bar tracking total credit used vs. total credit limits (Green $<10\%$, Amber $10-30\%$, Red $>30\%$).
* **Pure Add-on Architecture:**
  * Zero changes to Wealthfolio core code. All custom tracking metadata is stored in Wealthfolio's native persistent storage (`ctx.api.storage`).

---

## Installation & Setup

The add-on is compiled and packaged ready to use in the releases or from:
`credit-card-payment-tracker.zip`

### Method 1: Upload via Wealthfolio Web UI (Easiest)
1. Open your Wealthfolio instance in your browser.
2. Navigate to **Settings** $\rightarrow$ **Add-ons** (`/settings/addons`).
3. Click **"Install Add-on"** or **"Install from File"**.
4. Select the packaged zip file: `credit-card-payment-tracker.zip`.
5. Accept the requested permissions (`accounts`, `portfolio`, `activities`, and `storage`).
6. A new **"Card Payments"** tab with a credit card icon will appear in your sidebar navigation!

---

### Method 2: Docker Volume Mount
If you run Wealthfolio via Docker / Docker Compose and prefer a direct file mount:
1. Extract the add-on files into your `WF_ADDONS_DIR` (e.g. `./data/addons/credit-card-payment-tracker`):
   ```bash
   mkdir -p ./data/addons/credit-card-payment-tracker
   cp manifest.json ./data/addons/credit-card-payment-tracker/
   cp -r dist ./data/addons/credit-card-payment-tracker/
   ```
2. Restart your container:
   ```bash
   docker compose restart wealthfolio
   ```

---

## How to Configure Your Cards for the First Time

1. Click on **"Card Payments"** in the sidebar.
2. All your existing checking accounts and credit cards will load automatically from Wealthfolio.
3. On each credit card in the **Upcoming Bills Radar**, click **`✏️ Edit`**:
   * Set your **Payment Due Date** (calendar date picker).
   * Enter your **Payment Due Amount** (from your statement).
   * Enter your **Credit Limit** (to calculate utilization).
   * Select your **Payable Checking Account** (dropdown of your checking accounts).
   * *(Optional)* Enter your **APR %** or **0% Promo Expiration Date**.
4. Click **"Save Settings"**. Your configuration is permanently saved into local storage!
