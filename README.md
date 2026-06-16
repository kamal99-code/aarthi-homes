# Helix — Overdraft Interest Optimizer

Helix is a premium web application to calculate interest on overdraft-like accounts using the standard **30/360 day-count convention** (treating every month as exactly 30 days and the year as 360 days).

The legacy **Aarthi Homes** homestay codebase has been fully preserved under `aarthi-homes/`.

---

## 🚀 How to Run Locally

1. **Install Dependencies**:
   Open a Command Prompt or Terminal in this folder and run:
   ```bash
   npm install
   ```
2. **Start Dev Server**:
   ```bash
   npm run dev
   ```
3. **Open Browser**:
   - **Calculator Landing Page**: [http://localhost:8080/](http://localhost:8080/)
   - **Admin Portal Dashboard**: [http://localhost:8080/admin](http://localhost:8080/admin) (Clean URL) or [http://localhost:8080/admin.html](http://localhost:8080/admin.html)
   - **Archived Aarthi Homes Homestay**: [http://localhost:8080/aarthi-homes/](http://localhost:8080/aarthi-homes/)

---

## 🛡️ Admin Portal & Passcode Protection
The **Admin Portal** ([admin.html](admin.html)) is protected by a 4-digit administrative passcode.
- **Passcode PIN**: **`1848`**
- **Features**:
  - Auto-focus progression inputs for smooth PIN entry.
  - Shake error feedback for invalid entries.
  - Session-persistence: Once entered correctly, you stay authorized for the duration of your tab session.
  - Live key-by-key search by client/account name.
  - Detailed glassmorphic modal pop-up showcasing transaction items.
  - Direct **Purge** action to delete records instantly.

---

## 📅 Calculation Options
- **Mandatory End Date**: You must specify a target evaluation end date for calculations.
- **Inclusive End Date (+1 Day)**: Toggle this checkbox to dynamically add 1 day to the final period. This is standard in day-count methods where the final date is computed as inclusive (interest accrues on the day of the evaluation end date).

---

## 🗄️ Supabase Integration

Run this SQL script in your Supabase project's **SQL Editor** to create the required table:

```sql
CREATE TABLE interest_calculations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    interest_rate NUMERIC NOT NULL,
    transactions JSONB NOT NULL,
    total_interest NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and setup access policies
ALTER TABLE interest_calculations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert" ON interest_calculations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service delete" ON interest_calculations FOR DELETE USING (true);
CREATE POLICY "Allow public select" ON interest_calculations FOR SELECT USING (true);
```

---

## 📊 Google Sheets Integration

We use a lightweight Google Apps Script Web App to append records without complex service account key configurations.

1. Open a Google Sheet and name it (e.g. "Overdraft Logs").
2. Go to **Extensions > Apps Script**.
3. Paste the script below, replacing any template code:

```javascript
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Timestamp", "Account Name", "Interest Rate (%)", "Total Interest Accrued", "Transactions Count", "Transactions Details"]);
    }
    
    sheet.appendRow([
      payload.timestamp,
      payload.name,
      payload.interestRate + "%",
      payload.totalInterest,
      payload.transactionsCount,
      payload.details
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}
```

4. Save the project and select **Deploy > New Deployment**.
5. Set Type to **Web App**, Execute as **Me**, and Who has access to **Anyone**.
6. Deploy, authorize permissions, and copy the **Web App URL**.

---

## ⚙️ Environment Variables (.env)

Create a file named `.env` in the root folder of this project to connect your database and sheet:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-service-role-key
GOOGLE_SHEET_WEBHOOK_URL=https://script.google.com/macros/s/xxxx/exec
```

> [!IMPORTANT]
> - Locally, if these environment variables are missing, the server will degrade gracefully and mock-save transactions to a local file named `calculations.json` to allow full offline testing.
> - The Supabase Key must be the **service_role** key to allow the automated hourly cleanup `/api/cleanup` script to run SQL deletes.
