# YapShield 🛡️
> **Think freely, share safely.**  
> Privacy, safety, and security gateway for Generative AI applications.  
> **ORIGIN MINI 2026** — Problem Statement 5 | **Team Cooked**

---

## 1. Overview & Operational Flow

**YapShield** is an open-source, fail-closed privacy and security gateway designed for generative AI integrations. Sitting between user-facing applications and downstream large language models (LLMs), YapShield intercepts prompts to detect Personally Identifiable Information (PII), confidential credentials, financial identifiers, and prompt-injection attacks. Through policy-driven actions (allow, mask, tokenize, block), YapShield converts sensitive entities into cryptographic surrogate tokens, passes sanitized prompts to downstream AI models, and transparently re-hydrates the responses with original values upon return.

### The 5-Step Gateway Lifecycle

```
[ User Input ]
      │
      ▼
┌─────────────┐
│ 1. SCAN     │ ──► Multi-detector entity analysis (PII, Secrets, Injection)
└─────────────┘
      │
      ▼
┌─────────────┐
│ 2. PROTECT  │ ──► Policy evaluation (Mask, Tokenize via AES-256-GCM, Block)
└─────────────┘
      │
      ▼
┌─────────────┐
│ 3. REVIEW   │ ──► Explainable risk score & interactive override review
└─────────────┘
      │
      ▼
┌─────────────┐
│ 4. SEND     │ ──► Dispatched to LLM (Gemini) with retry & fallback
└─────────────┘
      │
      ▼
┌─────────────┐
│ 5. RESTORE  │ ──► Vault surrogate tokens re-hydrated in AI response
└─────────────┘
      │
      ▼
[ Safe Output ]
```

1. **Scan**: Intercepts the raw prompt and executes individual detectors concurrently across regex, checksum, gazetteer, entropy, and semantic injection models.
2. **Protect**: Maps detections against active policy presets (`Student`, `Developer`, `Enterprise`) or custom rules, encrypting tokenized values with AES-256-GCM.
3. **Review**: Generates an explainable risk score (0–100) and displays a pre-flight review screen allowing authorized human inspection and fine-grained overrides.
4. **Send**: Forwards only the sanitized or tokenized prompt to the downstream LLM (Google Gemini) via a resilient, timeout-protected pipeline with exponential backoff.
5. **Restore**: Intercepts the model's generated answer, substitutes synthetic surrogate tokens (`[EMAIL_1]`, `[PHONE_1]`) with their original decrypted values from the secure vault, and logs a tamper-evident audit record.

---

## 2. Features

### 🇮🇳 India-Specific PII Detectors
- **Aadhaar Number**: Matches 12-digit continuous and space/hyphen-separated formats (`XXXX XXXX XXXX`), validated using the **Verhoeff checksum algorithm** to eliminate false positives.
- **PAN (Permanent Account Number)**: Validates statutory 10-character alphanumeric syntax (`[A-Z]{5}[0-9]{4}[A-Z]`) with strict boundary constraints.
- **UPI ID (Virtual Payment Address)**: Detects payment handles across popular Indian banking providers (`@oksbi`, `@okhdfcbank`, `@paytm`, `@ybl`, `@apl`, etc.).
- **IFSC Code**: Matches 11-character Indian Financial System Codes (`^[A-Z]{4}0[A-Z0-9]{6}$`) with valid bank code and zero-padding verification.
- **Indian Mobile Phone Numbers**: Detects standard 10-digit mobile numbers starting with 6–9, with support for optional `+91` or `0` prefixes and space/hyphen delimiters.

### 🔑 Comprehensive Secrets Scanner
- **API Keys**: Scans for Google Cloud/Gemini API keys, OpenAI keys, GitHub PATs/OAuth tokens (`ghp_`, `gho_`, `github_pat_`), AWS Access Key IDs (`AKIA...`), and Slack bot/user tokens (`xoxb-`, `xoxa-`, `xoxp-`).
- **JSON Web Tokens (JWT)**: Detects full three-segment base64url-encoded tokens.
- **Private Key Blocks**: Identifies complete PEM-encoded private key blocks (RSA, EC, OPENSSH, and generic PKCS#8).
- **Shannon Entropy Scanner**: Detects high-entropy random secrets and credential assignments (`password=`, `token:`) exceeding threshold entropy.

### 👤 Person Name Detection
- Identifies full names using Indian and global gazetteers, honorific titles (`Mr.`, `Mrs.`, `Dr.`, `Shri`, `Smt.`), role-based cue words (`client`, `patient`, `customer`, `employee`), and contextual letter salutations (`Dear X`, `Regards, X`).

### 🛡️ Prompt Injection & Jailbreak Scoring
- Multi-vector injection heuristics producing a confidence score (0–100):
  - **Direct instruction overrides** ("ignore previous instructions", "disregard system prompt")
  - **Role hijacks & persona adoption** ("DAN", "act as an unrestricted AI", "roleplay without rules")
  - **Prompt extraction & exfiltration** (verbatim system prompt leakage, guardrail dumping)
  - **Delimiter injection** (`<system>`, `[INST]`, `### Instruction`)
  - **Hinglish & bilingual evasions** ("purane rules bhool jao", "sab guidelines drop karo")

### 📋 Policy Presets & Enforcement Modes
- **Student**: Balanced mode. Masks personal contact information, tokenizes names, blocks credentials and financial IDs, enforces human review before dispatch.
- **Developer**: Balanced mode. Blocks sensitive keys and passwords, tokenizes contact details, allows names, permits automated non-interactive execution.
- **Enterprise**: Strict mode. Maximum protection: blocks all government IDs, credentials, and financial secrets; tokenizes names and emails; enforces a lower injection tolerance (threshold 40).
- **Enforcement Modes**:
  - `strict`: Aggressive safety posture, low risk tolerances, rejects ambiguous inputs.
  - `balanced`: Optimal security vs. developer productivity trade-off.
  - `lenient`: Permissive mode allowing low-risk entities while blocking critical secrets.

### 🔐 Reversible Tokenization (AES-256-GCM Vault)
- Transforms sensitive entities into surrogate tokens (e.g. `[EMAIL_1]`, `[AADHAAR_1]`).
- Raw plaintext values are encrypted using **AES-256-GCM** with a cryptographically secure 12-byte initialization vector (IV) and a 16-byte authentication tag.
- Ephemeral vault storage with configurable TTLs and automatic teardown on failures.

### 📊 Explainable Risk Scoring & Review Screen
- Transparent multi-factor risk assessment (0–100) scoring entity sensitivity, volume, and injection probability.
- Interactive pre-send screen showing sanitized diffs, detected entity badges, and granular per-detection overrides (unmask or re-tokenize).

### ⛓️ Tamper-Evident Audit Log (SHA-256 Hash Chain)
- Every transaction produces an immutable audit record chained cryptographically to its predecessor:
  $$\text{Hash}_n = \text{SHA-256}(\text{Hash}_{n-1} \parallel \text{User} \parallel \text{Action} \parallel \text{Risk} \parallel \text{MaskedPrompt} \parallel \text{Decision} \parallel \text{Timestamp})$$
- `/api/audit/verify` re-computes and validates the entire cryptographic chain on demand, detecting unauthorized insertions, modifications, or deletions.

### 📈 Administrative Security Dashboard
- Interactive analytics built with Next.js and Recharts:
  - Total requests, blocked threat volume, tokenization counters, and average latency.
  - Real-time audit log stream and instant cryptographic chain integrity verification.
  - Protected behind an administrative passcode barrier.

### 🔄 Gemini Resilience & Fail-Closed Architecture
- **Exponential Backoff**: Up to 3 automatic retries (1s, 2s, 4s + random jitter) for HTTP 429, 503, and network timeouts.
- **Fallback Model**: Automatic failover to `GEMINI_FALLBACK_MODEL` if the primary model fails repeatedly.
- **20-Second Request Timeout**: Prevents hanging requests from consuming server threads.
- **Fail-Closed Guarantee**: Any detector exception, validation failure, policy violation, or upstream timeout immediately halts the pipeline, wipes vault entries in a `finally` block, and returns a sanitized safety rejection without leaking internal error details.

---

## 3. Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT / APPLICATION                          │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │  POST /api/gateway (mode: preview | send)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        YAPSHIELD GATEWAY ENGINE                        │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ 1. Multi-Vector Detectors                                      │   │
│   │    - Aadhaar (Verhoeff)       - PAN / UPI / IFSC               │   │
│   │    - Phone (Indian Mobile)    - API Keys / JWT / Private Keys  │   │
│   │    - High-Entropy Secrets     - Person Names / Custom Keywords │   │
│   │    - Prompt Injection Score   - Overlap & Containment Resolver │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│                                   ▼                                    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ 2. Policy & Risk Engine                                        │   │
│   │    - Presets: Student / Developer / Enterprise                 │   │
│   │    - Decision Matrix: Allow / Mask / Tokenize / Block          │   │
│   │    - Explainable Risk Score (0 - 100)                          │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│                                   ▼                                    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ 3. Cryptographic Token Vault (AES-256-GCM)                     │   │
│   │    - Replaces raw values with [SURROGATE_TOKENS]               │   │
│   │    - Persists encrypted payloads to Supabase Vault Store       │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│                                   ▼                                    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ 4. Tamper-Evident SHA-256 Audit Log Chain                     │   │
│   │    - Chained hash verification (PrevHash -> Hash)              │   │
│   │    - Zero raw values logged (Masked prompts only)              │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │ Sanitized Prompt
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    DOWNSTREAM LLM (Google Gemini)                      │
│            Retries (429/503) ──► Fallback Model ──► Output             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Response with Surrogate Tokens
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       VAULT RESTORATION ENGINE                         │
│       Decrypts & re-hydrates [SURROGATE_TOKENS] -> Original Data       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         FINAL RESTORED RESPONSE                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Actions, Route Handlers)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/) (Strict typing across all layers)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database & Storage**: [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security)
- **AI Integration**: [Google Gen AI SDK](https://github.com/google-gemini/generative-ai-js) (`@google/generative-ai`)
- **Cryptography**: Node.js Native `crypto` module (AES-256-GCM, SHA-256)
- **Data Visualization**: [Recharts](https://recharts.org/)
- **Testing**: [Vitest 2](https://vitest.dev/)
- **TypeScript Runner**: [tsx](https://github.com/privatenumber/tsx)

---

## 5. Setup & Installation

### Prerequisites
- Node.js `18.x` or higher
- npm `9.x` or higher
- A Supabase project
- A Google Gemini API key

### 1. Clone & Install
```bash
git clone https://github.com/Shruticodes-afk/yapshield.git
cd YapShield
npm install
```

### 2. Configure Environment Variables
Copy the template configuration file:
```bash
cp .env.example .env.local
```

Populate the following variables in `.env.local` (**never commit this file or expose real credentials**):
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous/public key.
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service-role administrative key (server-only).
- `GEMINI_API_KEY`: Your Google Gemini API key.
- `GEMINI_MODEL`: (Optional) Primary Gemini model (defaults to `gemini-3.8-flash`).
- `GEMINI_FALLBACK_MODEL`: (Optional) Fallback Gemini model for failover.
- `GEMINI_MAX_RETRIES`: (Optional) Maximum retry attempts on temporary errors (defaults to `2`).
- `GEMINI_TIMEOUT_MS`: (Optional) Per-attempt timeout in milliseconds (defaults to `15000`).
- `VAULT_SECRET`: 32-byte hexadecimal encryption key (64 hex characters).
- `DASHBOARD_PASSCODE`: (Optional) Administrative passcode to protect the dashboard and verification APIs.

#### Generating `VAULT_SECRET`
Generate a cryptographically secure 256-bit random hex key with Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Initialize Supabase Database Tables
Run the following SQL in the **Supabase SQL Editor** to create the required tables with Row Level Security (RLS) enabled:

```sql
-- 1. Policies Table
create table if not exists policies (
  id serial primary key,
  name text unique not null,
  mode text not null check (mode in ('strict', 'balanced', 'lenient')),
  rules jsonb not null default '{}'::jsonb,
  injection_threshold integer not null default 60,
  review_required boolean not null default false,
  keywords text[] default '{}',
  created_at timestamptz not null default now()
);

alter table policies enable row level security;

-- 2. Audit Logs Table (Tamper-Evident Hash Chain)
create table if not exists audit_logs (
  id bigserial primary key,
  user_id text,
  action text not null,
  categories text[] default '{}',
  risk_score numeric not null default 0,
  masked_prompt text not null,
  decision text not null,
  prev_hash text not null,
  hash text not null,
  created_at timestamptz not null default now()
);

alter table audit_logs enable row level security;

-- 3. Cryptographic Vault Table
create table if not exists vault (
  id bigserial primary key,
  request_id text not null,
  token text not null,
  encrypted_value text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_vault_request_id on vault(request_id);

alter table vault enable row level security;
```

#### 4. Multi-Instance Safe Audit Function (`/supabase/audit_append.sql`)
To prevent concurrent race conditions across multiple serverless instances (e.g. on Vercel), execute the contents of `/supabase/audit_append.sql` in the **Supabase SQL Editor**:
```sql
-- Creates the atomic audit_append function using pg_advisory_xact_lock
-- See /supabase/audit_append.sql for full source.
```

> **Note**: Because database interactions are performed server-side via `SUPABASE_SERVICE_ROLE_KEY`, the service role automatically bypasses RLS for authorized gateway operations while public access via the anon key remains locked.

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js local development server on port 3000. |
| `npm test` | Runs the full Vitest automated test suite (278 unit and integration tests across 11 test suites). |
| `npm run build` | Compiles TypeScript and builds the optimized production application. |
| `npm run eval` | Executes the evaluation harness across the 300-prompt benchmark dataset. |
| `npm run lint` | Runs ESLint to check for code quality and syntax errors. |

---

## 7. Evaluation & Benchmark

### Dataset Composition
The benchmark dataset (`scripts/generateDataset.ts`) contains **300 synthetic test prompts** distributed across five distinct evaluation groups:
1. **Clean (100 prompts)**: Standard coding tasks, academic prompts, questions with 10-digit non-phone numbers, 12-digit order IDs, and benign phrases (e.g., *"Please ignore the typo in my previous message"*).
2. **PII (100 prompts)**: Synthetically generated Indian PII: Aadhaar numbers passing Verhoeff validation, Luhn-valid credit cards, PAN numbers, UPI handles, IFSC codes, Indian phone numbers, and full names.
3. **Secrets (40 prompts)**: Synthetic credentials built dynamically from segmented string pieces at runtime (Google API keys, OpenAI keys, GitHub tokens, AWS keys, Slack tokens, JWTs, private keys, passwords).
4. **Prompt Injection (40 prompts)**: Advanced adversarial attacks spanning direct overrides, role hijacks, prompt extraction, delimiter bypasses, and Hinglish attack variations.
5. **Mixed (20 prompts)**: Complex prompts combining multiple entities (e.g. person names, emails, phone numbers, and payment details).

### Seeded & Runtime Generation
To protect repository integrity and adhere to secret scanning requirements:
- The dataset is generated deterministically using a seeded pseudo-random number generator (`20261103`).
- All test keys and tokens are dynamically synthesized in memory so that no literal secret strings exist in tracked source code.
- Generated benchmark and holdout CSV files are git-ignored.

### Evaluation Metrics
The evaluation script (`npm run eval`) executes `detectAll` and `detectInjection` across every row, producing an empirical performance report comparing YapShield to a Naive Regex Baseline:
- **Per-Entity Precision, Recall, and F1 Score**
- **Micro-Averaged Accuracy Metrics**
- **Clean Group False-Positive Rate (FPR)**
- **Prompt Injection Attack Recall & FPR**
- **Average & p95 Processing Latency (ms)**

### Honest Limitations
While YapShield achieves high accuracy on the benchmark suite, users and evaluators should consider the following practical limitations:
1. **Synthetic Data Distribution**: The evaluation benchmark is synthetically generated; real-world enterprise prompts may exhibit linguistic variety, typos, formatting quirks, and slang not present in synthetic datasets.
2. **Rule-Based Injection Detection**: Prompt injection heuristics rely on pattern recognition and semantic proximity. Highly sophisticated, novel linguistic evasions, indirect prompt injections, or base64/rot13 encoded attacks can bypass rule-based filters.
3. **Contextual Name Detection**: Person name recognition depends on title cues, role words, and gazetteer matching. Unadorned names appearing without contextual indicators (e.g. *"Meet Aarav at five"*) may not be flagged to avoid high false-positive rates on common words.
4. **Sample Size**: The benchmark consists of 300 prompts. Production deployments should validate accuracy against domain-specific datasets tailored to their specific use cases.

---

## 8. Security Notes

- **Server-Only Service Role Key**: `SUPABASE_SERVICE_ROLE_KEY` is restricted strictly to Node.js server environments. It is never exposed in browser bundles, client components, or public network responses.
- **Zero Raw Value Logging**: Plaintext prompts, decrypted tokens, API keys, and environment variables are never written to server logs, database tables, or error outputs. The error handler logs only pipeline stage labels and standard error names.
- **Immutable Block Actions**: Detections assigned a `block` action by the policy engine are non-overridable. The interactive review screen prevents users from overriding or unmasking blocked critical secrets.
- **Fail-Closed Execution**: If any internal error occurs during detection, tokenization, or policy evaluation, the gateway rejects the prompt with a generic safety error, clearing any intermediate vault state.
- **Dashboard Passcode Protection**: The administrative dashboard (`/dashboard`) and audit verification endpoints require authentication via `DASHBOARD_PASSCODE` to prevent unauthorized inspection of security logs.

---

## 9. Team Cooked

**ORIGIN MINI 2026 — Problem Statement 5**

- **Member 1**: Full-Stack Architecture & Gateway Engine
- **Member 2**: Security Detectors & Cryptographic Vault
- **Member 3**: Policy Engine & Audit Hash Chain
- **Member 4**: Evaluation Harness & Frontend Dashboard

---

## 10. Cybersecurity Desktop-App UI/UX Showcase (Case Study)

YapShield includes a dedicated, responsive case-study landing page section inspired by high-end cybersecurity desktop applications and SOC telemetry consoles, accessible at `/case-study`.

### Visual Style & Design Tokens
- **Theme**: Dark cybersecurity environment with deep background gradients (`#1c1c1e` to `#0e1a1f`).
- **Typography**: Clean sans-serif system stack with uppercase tracked micro-labels, centered headings (~28px), and relaxed body text (`#b8bcc2`).
- **Color Accents**:
  - **Accent Red (`#ff2d4a`)**: Highlights, critical incident counters, alert badges, and animated divider lines.
  - **Teal / Cyan Glow Palette (`#0b3b44`, `#11b5c4`, `#0a1f26`)**: Glassy dashboard panel borders, outer glows, and radar telemetry sweeps.
  - **Isometric Data Chips**: Yellow (`#f59e0b`), Green (`#10b981`), and Crimson Red (`#ff2d4a`).

### Page Structure (Top to Bottom)
1. **Eyebrow**: `"CYBERSECURITY UI/UX DESIGN • ANIMATED WINDOWS DESKTOP APPLICATION"` with active ping indicator.
2. **TagBar**: Slim bordered dark glassy pill with dot-separated capabilities: `"Managed Security App UI/UX • Animated Desktop Interface • Motion Design + Static Screen States"`.
3. **IntroDivider**: Accent red divider line animating `scaleX: 0 -> 1` followed by a centered 3-line intro paragraph.
4. **ChallengeApproach**: Two-column responsive block (separated by a thin vertical line on desktop, stacked on mobile) with red labels `"THE CHALLENGE"` and `"OUR APPROACH"`, headings, paragraphs, and telemetry metrics.
5. **HeroDashboard**: Large (~1000px wide) rounded cyber console featuring an isometric 3D grid:
   - **Radial Gauge (`Gauge.tsx`)**: Dual orange/green concentric rings with animated `strokeDashoffset`, smooth continuous rotation, and live sensor needle micro-jitter.
   - **Floating 3D Cubes (`Cube.tsx`)**: Isometric multi-layered stacked cubes (yellow, green, red) featuring continuous 4–6s floating loops and subtle exploded-view layer separation.
   - **Critical Alert Counter**: Glowing red card with ticket counter `"14"` and live incident isolation indicators.
   - **Live Monospace Terminal**: Streaming feed typing real-time telemetry events (`0x00A1 [KERNEL_MONITOR] ...`) with blinking cursor.
   - **Interactive 3D Stage**: Smooth mouse-move 3D tilt physics and scroll parallax.
6. **AnimationSequence**: Red label `"ANIMATION SEQUENCE"` followed by an interactive horizontal timeline and filmstrip showcasing keyframes across the 5 security stages (Node Discovery, Radar Sweep, Exploded Inspection, Incident Lockdown, Hash Chain Recovery).

### Component Architecture
All components are modular, typed, and located under `components/case-study/`:
- `components/case-study/Eyebrow.tsx`
- `components/case-study/TagBar.tsx`
- `components/case-study/IntroDivider.tsx`
- `components/case-study/ChallengeApproach.tsx`
- `components/case-study/HeroDashboard.tsx`
- `components/case-study/Gauge.tsx`
- `components/case-study/Cube.tsx`
- `components/case-study/AnimationSequence.tsx`
- `components/case-study/CaseStudyShowcase.tsx`
- **Central Content Configuration**: `lib/caseStudyContent.ts` (all copy, headings, timecodes, metrics, and labels).

### Motion & Accessibility
- Powered by **Framer Motion** with GPU-accelerated transforms (`translate3d`, `scale`, `rotate`).
- Fully respects `prefers-reduced-motion` through `useReducedMotion()`.

### How to Run & Verify
```bash
# 1. Install dependencies (including framer-motion)
npm install

# 2. Run the Next.js development server
npm run dev

# 3. Open in browser:
# - Case Study: http://localhost:3000/case-study
# - Home Page:  http://localhost:3000
# - Playground: http://localhost:3000/playground
# - Dashboard:  http://localhost:3000/dashboard

# 4. Verify test suite & build
npm test
npm run build
```

---

*Built with security and privacy by design.* 🛡️
