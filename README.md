# Cadence
### Learn your Cadence.

A privacy-first, judgment-free body tracking web app designed to help you notice your patterns over time without storing your data on a server.

Cadence is intentionally simple: entries are recorded locally in your browser or written directly to a user-owned Google Sheet. There is no database, no analytics, and no server-side data storage.

## ✨ Features

- Single-page entry flow
- Optional Google Sheet integration (user-owned storage)
- Local-only mode (no sign-in required)
- Weekly / Monthly / Quarterly summaries
- Mobile-first, responsive design (*coming soon!*)
- Minimalist UI with calm, neutral language
- No ads, no tracking, no AI inference

## 🧠 Design Philosophy
Cadence is built around a few core principles:
- User-owned data — your data lives where you choose
- No judgment — tracking without gamification or scoring
- Low cognitive load — simple inputs, clear flows
- Privacy by default — no server-side storage, *ever*.

# 🏗️ Tech Stack
- Framework: Next.js 14 (App Router)
- Language: TypeScript
- Authentication: Google OAuth
- State Management: Zustand
- Styling: Tailwind CSS
- Deployment: Vercel (TBD)

# 📁 Project Structure
```
/Cadence
    /app
        /entry
            page.tsx
        /fonts
            GeistMonoVS.woff
            GeistVS.woff
        /recover
            page.tsx
        /settings
            page.tsx
        /tutorial
            page.tsx
        globals.css
        layout.tsx
        page.tsx
    /components
        /entry
            index.ts
            LogSelectionModal.tsx
       /Layout
            AppShell.tsx
            Header.tsx 
        /ui
            SafeLink.tsx
        /settings
            /modals
                RecoveryPromptModal.tsx
                SavePromptModal.tsx
            AddMedicineForm.tsx
            CustomProductSection.tsx
            index.ts
            MedicineItem.tsx
            PainScaleOption.tsx
            SymptomChip.tsx
            ToggleRow.tsx
    /hooks
        useSafeRouter.ts
    /lib
        constants.ts
        googleSheets.ts
        settingsValidation.ts
        stringUtils.ts
    /stores
    useEntries.ts
        useSettings.ts
    /types
        index.ts
    tailwind.config.tsx
```
# 🔐 Authentication & Data Storage

Cadence supports multiple usage modes:
1. No Sign-In (Local Storage)
- Entries stored in browser storage
- Fast, private, device-specific
- Data may be lost if browser storage is cleared

2. Google Sheet (Optional)
- User connects their own Google Sheet
- Data is written directly to the sheet
- No copies are stored on Cadence servers
- Sheet must be reconnected on new devices

Important: Cadence does not and will never: 
- store user data
- store sheet IDs
- store your entries on any backend database

# 🚀 Getting Started (Local Development)
### Prerequisites
- Node.js 18+
- npm or pnpm
- Google OAuth credentials (for Sheet integration)

### Installation
- git clone https://github.com/your-username/Cadence.git
- cd Cadence
- npm install

### Environment Variables
- Create a .env.local file:
- NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
- NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000

*Note: No backend secrets or database credentials are required.*

Run Locally via `npm run dev` and visit http://localhost:3000

# 🧪 Beta Testing
- Cadence is currently in a private beta.
- Expect breaking changes
- Data persistence is intentionally limited
- Feedback is welcome via the support contact listed below

# ❓ FAQ
Is Cadence HIPAA compliant?
- No. Cadence is not a medical device and does not provide medical advice. Users retain full ownership and control of their data.

Does Cadence track users?
- No. There are no analytics, ads, or tracking scripts.

Can I export my data?
- Yes — users can export data from their Google Sheet or download CSV files in local mode. (*coming soon!*)

# 🧑‍💻 About the Creator
- Cadence is an independent project built with care and intention.
- It is not venture-backed and is designed to remain simple and sustainable.

# 📬 Support
Questions, feedback, or issues?
📧 support@Cadence.app or open a GitHub issue.

# 📜 License
MIT License