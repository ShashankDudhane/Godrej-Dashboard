# Godrej Dashboard

A modern web dashboard built with **Next.js 14**, **Supabase**, and **Shadcn UI (Sonner for toast notifications)**.  
This project provides a secure authentication system, role-based dashboards, and dynamic modules such as Hindrances, Drawings, Approvals, Concrete, Plan vs Actual, Manpower, and Cash Flow.

---

## 🚀 Tech Stack

- **Frontend**: [Next.js 14](https://nextjs.org/) (App Router, TypeScript, TailwindCSS)
- **Backend**: [Supabase](https://supabase.com/) (Postgres DB + Auth)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/) with TailwindCSS
- **Notifications**: [Sonner](https://sonner.emilkowal.ski/)

---



---

## ⚙️ Setup Instructions

### 1️⃣ Clone the repository
```bash
git clone https://github.com/<your-username>/godrej-dashboard.git
cd godrej-dashboard
2️⃣ Install dependencies

npm install
3️⃣ Configure environment variables
Create a .env.local file in the root directory:

NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_ACCESS_TOKEN=<your-access-token> # optional, for CLI usage
🔑 You can find these values in your Supabase Dashboard → Project Settings → API.

4️⃣ Generate Supabase types (optional but recommended)

npx supabase gen types typescript --project-id <project-id> > types/supabase.ts
If you see an access token error, login first:

npx supabase login
5️⃣ Run the development server

npm run dev
