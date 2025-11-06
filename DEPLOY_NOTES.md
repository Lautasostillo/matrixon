Diversity matrix — Deploy Guide (Vercel + Supabase)

Prereqs
- Vercel account (free)
- Supabase project (free)

Env vars (production)
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_BUCKET = matrix (default)
- STORAGE_PROVIDER = supabase

Steps
1) Install deps locally
   - cd creative-matrix && npm install
2) Seed Supabase bucket (optional but recommended)
   - Create .env.local with SUPABASE_* and STORAGE_PROVIDER=supabase
   - npm run seed:supabase
3) Run locally (fs by default)
   - STORAGE_PROVIDER=fs npm run dev
4) Push repo to GitHub
5) Vercel
   - Import the repo
   - Framework: Next.js (auto)
   - Env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET=matrix, STORAGE_PROVIDER=supabase
   - Build: next build (auto)
   - Output: Next.js (auto)
6) Test
   - / (Matrix) loads
   - /panel allows creating/updating brands; check brand list reflects changes across reloads

Notes
- In dev you can keep STORAGE_PROVIDER=fs to avoid needing credentials.
- API routes now use Supabase Storage in prod for persistence.
