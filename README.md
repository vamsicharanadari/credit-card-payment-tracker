# Credit Card & Cash Payment Tracker
### A Native Add-on for Wealthfolio

The **Credit Card & Cash Payment Tracker** add-on turns your self-hosted [Wealthfolio](https://wealthfolio.app) instance (`http://192.168.0.67:6670`) into a complete **Debt & Payment Command Center**.

While Wealthfolio tracks transactions, balances, and net worth, this add-on fills the missing revolving debt layer: **statement payment due dates, payment due amounts, credit limits, utilization meters, payable checking accounts, and automated two-way payment logging**.

---

## Features

* **Side-by-Side "At a Glance" Summary:**
  * **Left Box (Cash & Checking):** Real-time sum of checking and savings accounts. Toggle `👁️` on any account to exclude it from the total.
  * **Right Box (Credit Cards):** Signed negative debt (`-$12,423.31`). **Automatically hides $0 balance cards** to keep the active view clean.
  * **Net Liquid Position:** Displays real-time `Active Cash minus Active Credit Debt`.
* **Upcoming Bills & Payment Radar:**
  * Chronologically sorted by payment urgency:
    * 🔴 **Critical:** Due in $\le 3$ days or overdue
    * 🟡 **Upcoming:** Due in $4 - 7$ days
    * 🟢 **Later:** Due in $> 7$ days
  * **Insufficient Funds Guard:** Warns if `Payment Due > Balance of Assigned Checking Account`.
  * **Collapsible "Paid / $0 Due" Drawer:** Cards with `$0.00` due move into a collapsed section to keep focus on actionable bills.
* **Two-Way "✓ Mark as Paid" Workflow:**
  * Clicking "Mark as Paid" opens a confirmation dialog.
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

The add-on is compiled and packaged ready to use at:
`credit-card-payment-tracker.zip`

### Method 1: Upload via Wealthfolio Web UI (Easiest)
1. Open your Wealthfolio instance in your browser: `http://192.168.0.67:6670`
2. Navigate to **Settings** $\rightarrow$ **Add-ons** (`/settings/addons`).
3. Click **"Install Add-on"** or **"Upload Add-on"**.
4. Select the packaged zip file:
   `/home/adarivamsi/.gemini/antigravity/scratch/credit-card-tracker-addon/credit-card-payment-tracker.zip`
5. Accept the requested permissions (`accounts` and `activities`).
6. A new **"Card Payments"** tab with a credit card icon will appear in your sidebar navigation!

---

### Method 2: Docker Volume Mount
If you run Wealthfolio via Docker / Docker Compose and prefer a direct file mount:
1. Extract the add-on files into your `WF_ADDONS_DIR` (e.g. `./data/addons/credit-card-payment-tracker`):
   ```bash
   mkdir -p ./data/addons/credit-card-payment-tracker
   cp /home/adarivamsi/.gemini/antigravity/scratch/credit-card-tracker-addon/manifest.json ./data/addons/credit-card-payment-tracker/
   cp -r /home/adarivamsi/.gemini/antigravity/scratch/credit-card-tracker-addon/dist ./data/addons/credit-card-payment-tracker/
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
