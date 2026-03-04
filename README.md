# fScreentime

A digital wellness SaaS platform that helps users reduce screen time through financial accountability. Users set weekly screen time goals and stake $10 — if they miss their goal, the money is donated to a charity of their choice.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [Data Models](#data-models)
- [API Endpoints](#api-endpoints)
- [Authentication & Authorization](#authentication--authorization)
- [Payment System (Stripe)](#payment-system-stripe)
- [Email System](#email-system)
- [iPhone Integration](#iphone-integration)
- [Frontend Pages & Components](#frontend-pages--components)
- [Environment Variables](#environment-variables)
- [Infrastructure & Deployment](#infrastructure--deployment)
- [Security](#security)
- [Setup](#setup)

---

## Overview

**Core concept:** "Skin in the Game" — users put $10 at stake each week. If their total screen time exceeds their weekly budget, $10 is automatically charged to their card and donated to a selected charity (Red Cross, MSF, UNICEF, WWF, etc.). If they stay under budget, nothing is charged.

**How data gets in:** Users set up an iOS Shortcut automation on their iPhone that sends daily screen time data via HTTP POST to the `/ingest` endpoint. A bulk endpoint also exists for uploading up to 90 days of historical data.

---

## Tech Stack

### Frontend
- **React 18** with Vite 5 (ES modules, fast HMR)
- **React Router 6** for client-side routing
- **Tailwind CSS 3** for styling
- **ApexCharts** (react-apexcharts) for data visualization
- **AWS Amplify 6** for Cognito auth integration
- **Stripe.js + @stripe/react-stripe-js** for payment card UI
- **@aws-sdk/client-s3** for direct S3 data fetching from the browser
- **Axios** for API requests

### Backend
- **Node.js 18** on AWS Lambda
- **Serverless Framework 3** for infrastructure-as-code and deployment
- **DynamoDB** (on-demand billing) for goals and payment records
- **S3** for screen time data storage
- **AWS SES** for transactional emails
- **Stripe SDK v14** for payment processing
- **Jest 30** for unit tests

### Infrastructure (AWS)
- **Lambda** — all backend compute
- **API Gateway** (HTTP API) — REST endpoints with CORS
- **Cognito** — User Pool (email auth) + Identity Pool (direct S3 access) + Google/Facebook OAuth
- **DynamoDB** — 2 tables: goals, payments
- **S3** — 3 buckets: raw data, processed data, website hosting
- **CloudFront** — CDN with security headers
- **Route 53 + ACM** — custom domain and TLS certificates
- **SES** — email delivery
- **CloudWatch** — logs, alarms, metrics

---

## Project Structure

```
/
├── src/                          # Frontend (React)
│   ├── pages/
│   │   ├── Landing.jsx           # Marketing homepage
│   │   ├── Auth.jsx              # Sign in / sign up / verification
│   │   ├── Goals.jsx             # Goal creation + active goal tracking
│   │   ├── Settings.jsx          # Payment management + account deletion
│   │   ├── Blog.jsx              # Blog article pages
│   │   ├── Ranking.jsx           # Leaderboard (coming soon placeholder)
│   │   ├── PrivacyPolicy.jsx     # Privacy policy
│   │   └── TermsOfService.jsx    # Terms of service
│   ├── components/
│   │   ├── Dashboard.jsx         # Analytics dashboard with charts
│   │   ├── ContributionsChart.jsx# Calendar heatmap of daily usage
│   │   ├── CardManagement.jsx    # Stripe card display/management
│   │   ├── StripePayment.jsx     # Stripe CardElement form
│   │   ├── FeedbackForm.jsx      # Star rating + message feedback form
│   │   ├── ErrorBoundary.jsx     # React error boundary
│   │   └── Logo.jsx              # Brand logo component
│   ├── context/
│   │   └── AuthContext.jsx       # Auth state (user session, sign in/out)
│   ├── config/
│   │   └── amplify.js            # AWS Amplify/Cognito configuration
│   └── utils/
│       ├── api.js                # Axios instance with JWT auth interceptor
│       ├── s3Data.js             # Direct S3 data fetching via AWS SDK
│       ├── parseData.js          # Screen time data parsing/aggregation
│       └── analytics.js          # Google Analytics event helpers
├── backend/
│   ├── handler.js                # Core API: ingest, goals CRUD, delete account
│   ├── stripe.js                 # Stripe: setup intents, penalties, webhooks, cancellation
│   ├── email.js                  # Email templates (SES) for all transactional emails
│   ├── contact.js                # Feedback form submission endpoint
│   └── serverless.yml            # Full AWS infrastructure definition (Lambda, API GW, DynamoDB, S3, CloudFront, etc.)
├── ARCHITECTURE.md               # Scalability design document
├── package.json                  # Frontend dependencies
└── backend/package.json          # Backend dependencies
```

---

## Features

### 1. Screen Time Data Ingestion
- **Daily ingest** (`POST /ingest`): Receives screen time data from iPhone iOS Shortcut automation
  - Accepts comma-separated app entries (e.g., `"Chrome (2h 13m),Spotify (6m)"`)
  - Parses time strings into minutes
  - Stores as JSON in S3 keyed by `{userId}/all.json`
  - Merges new day data into existing user data file
- **Bulk ingest** (`POST /ingest/bulk`): Upload up to 90 days of historical data at once
  - Accepts array of day objects with date + entries
  - Validates and merges with existing data

### 2. Analytics Dashboard
- **Time range filters**: 7 days, 14 days, 30 days, all time
- **Day-of-week bar chart**: Average screen time per weekday
- **Area chart**: Daily screen time trend over time
- **Donut chart**: App breakdown by total usage
- **Contributions heatmap**: Calendar-style grid showing daily usage intensity (similar to GitHub contributions)
- **Summary stats**: Total minutes, daily average, week-over-week change
- **App-specific filtering**: Filter charts by individual app
- Data fetched directly from S3 via Cognito Identity Pool credentials (no API call)

### 3. Weekly Goals ("Skin in the Game")
- **Goal creation flow**:
  1. Set daily screen time limit (0.5h–8h in 0.5h increments)
  2. Weekly budget auto-calculated (daily limit × 7)
  3. Select charity from list (Red Cross, MSF, UNICEF, WWF, etc.)
  4. Optionally exclude up to 3 apps (e.g., work apps)
  5. Confirm $10 stake → Stripe card setup
- **Active goal tracking**:
  - Radial bar gauge showing weekly progress vs budget
  - Daily usage vs daily limit comparison
  - Top apps breakdown for the current week
  - Status indicators (on track / over budget)
- **Auto-renewal**: Goals auto-renew weekly unless cancelled
- **Cancel renewal**: Stops auto-renewal but current week goal stays active
- **Forfeit goal**: Immediately charges $10 to charity and ends the goal
- **Goal history**: View past weeks' goals and outcomes from S3

### 4. Payment System (Stripe)
- **Card setup**: SetupIntent flow — card tokenized via Stripe, never stored on our servers
- **Deferred charges**: Card is only charged if the weekly goal is missed
- **Penalty processing**: Scheduled Lambda runs hourly Sun–Tue, charges at Monday 9 AM in user's timezone
- **Card management**: View saved card details (brand, last 4, expiry), update card anytime
- **Expiry warnings**: Settings page alerts users 60 days before card expiration
- **Webhook handling**: `setup_intent.succeeded`, `setup_intent.setup_failed`, `payment_intent.payment_failed`, `charge.dispute.created`

### 5. Authentication
- **Email/password**: Sign up with email + password (min 8 chars), email verification code required
- **Social login**: Google and Facebook via Cognito OAuth
- **Optional display name**: Set during sign-up, defaults to email prefix
- **Protected routes**: Frontend `ProtectedRoute` wrapper redirects unauthenticated users
- **JWT authorization**: Backend endpoints validated via Cognito authorizer

### 6. Email Notifications (AWS SES)
All emails use a branded dark HTML template. Triggered emails:
- **Goal created** — confirmation with motivational quote
- **Payment setup complete** — card saved successfully
- **Goal passed** — congratulations, no charge this week
- **Penalty charged** — goal missed, $10 donated to charity
- **Charge failed** — payment attempt failed, action needed
- **Goal cancelled/forfeited** — $10 charged to charity
- **Goal renewed** — auto-renewal kicked in for new week
- **Contact form submission** — forwarded to support email

### 7. User Settings & Account
- View/update payment card
- Card expiry warning display
- Permanent account deletion (deletes S3 data + DynamoDB records + signs out)
- Sign out

### 8. Blog
- Static article pages with scroll-reveal animations
- Features: pull quotes, stat callouts, drop caps, responsive typography
- Routes: `/blog` (listing), `/blog/:slug` (article)

### 9. Landing Page
- Hero section with value proposition
- User testimonials
- Feature highlights and how-it-works explanation
- CTA buttons to sign up

### 10. Feedback System
- In-app feedback form with star rating (1–5) and text message
- Submitted via `POST /contact` to support email via SES
- Input sanitized (HTML stripped, control chars removed)

### 11. Ranking / Leaderboard (Coming Soon)
- Placeholder page with mockup of #1, #2, #3 leaderboard positions
- Future competitive feature

---

## Data Models

### Screen Time Data (S3: `{userId}/all.json`)
```json
{
  "days": {
    "2024-01-15": {
      "entries": [
        { "app": "Chrome", "minutes": 120 },
        { "app": "Slack", "minutes": 45 }
      ],
      "systemVersion": "17.2",
      "deviceName": "iPhone 15"
    }
  },
  "timezone": "GMT+11",
  "tzOffsetHours": 11,
  "goalHistory": []
}
```

### Goals Table (DynamoDB)
| Field | Type | Description |
|-------|------|-------------|
| `userId` | String (PK) | Cognito user ID |
| `weekStart` | String (SK) | Week start date `YYYY-MM-DD` |
| `weekEnd` | String | Week end date |
| `dailyLimit` | Number | Hours per day |
| `weeklyLimit` | Number | Hours per week (dailyLimit × 7) |
| `status` | String | `active`, `charged`, `cancelled`, `charge_failed` |
| `charity` | String | Charity display name |
| `charityId` | String | Charity identifier |
| `amount` | Number | Stake amount in dollars (currently always 10) |
| `autoRenew` | Boolean | Whether goal auto-renews next week |
| `excludedApps` | List | Up to 3 app names to exclude from tracking |
| `timezone` | String | User's IANA timezone |
| `numDays` | Number | Days in the goal period (7) |
| `createdAt` | String | ISO timestamp |
| `ttl` | Number | DynamoDB TTL (1 year from creation) |

### Payments Table (DynamoDB)
| Field | Type | Description |
|-------|------|-------------|
| `userId` | String (PK) | Cognito user ID |
| `stripe_customer_id` | String | Stripe Customer ID |
| `stripe_payment_method_id` | String | Stripe PaymentMethod ID |
| `setup_complete` | Boolean | Whether card setup succeeded |
| `email` | String | User email for receipts |
| `createdAt` | String | ISO timestamp |
| `updatedAt` | String | ISO timestamp |

---

## API Endpoints

### Public (No Auth)
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/ingest` | `handler.ingest` | Receive daily screen time from iPhone |
| POST | `/ingest/bulk` | `handler.ingestBulk` | Bulk upload up to 90 days |
| POST | `/contact` | `contact.submitFeedback` | Submit feedback form |
| POST | `/stripe-webhook` | `stripe.stripeWebhook` | Stripe webhook events |

### Authenticated (Cognito JWT)
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/goals` | `handler.saveGoal` | Create a new weekly goal |
| GET | `/goals` | `handler.getGoal` | Get active goal (optional `?weekStart=`) |
| GET | `/goals/history` | `handler.getGoalHistory` | Get past goals from S3 |
| POST | `/goals/cancel` | `stripe.cancelGoal` | Forfeit goal (immediate $10 charge) |
| POST | `/goals/cancel-renewal` | `stripe.cancelRenewal` | Cancel auto-renewal |
| GET | `/payment-method` | `stripe.getPaymentMethod` | Get saved card details |
| POST | `/create-setup-intent` | `stripe.createSetupIntent` | Start Stripe card setup |
| POST | `/update-payment-method` | `stripe.updatePaymentMethod` | Update saved card |
| POST | `/delete-account` | `handler.deleteAccount` | Delete all user data permanently |

### Scheduled
| Schedule | Handler | Description |
|----------|---------|-------------|
| Hourly (Sun–Tue) | `stripe.processPenalties` | Process weekly penalty charges (Monday 9 AM per user timezone) |

---

## Authentication & Authorization

### Cognito User Pool
- Email-based authentication with auto-verified email
- Password policy: minimum 8 characters
- Account recovery via verified email
- OAuth providers: Google (openid, email, profile scopes) + Facebook

### Frontend Auth Flow
1. Amplify manages session/token storage in browser
2. Sign in via email+password (SRP) or social redirect
3. Sign up requires email verification code
4. `AuthContext` provides `user` state app-wide
5. `ProtectedRoute` component redirects if not authenticated

### Backend Auth
- HTTP API Cognito authorizer validates JWT on protected endpoints
- User ID extracted from `event.requestContext.authorizer.jwt.claims.sub`
- All data partitioned by userId

### Direct S3 Access
- Cognito Identity Pool issues temporary AWS credentials to authenticated users
- IAM role restricts access to `${identityId}/*` prefix only
- Frontend reads screen time data directly from S3 (no API round-trip)

---

## Payment System (Stripe)

### Flow
1. **Goal creation** → `POST /create-setup-intent` → creates Stripe Customer (if new) + SetupIntent with `usage: 'off_session'`
2. **Card entry** → Frontend renders Stripe `CardElement`, user confirms → `confirmCardSetup()`
3. **Webhook** → Stripe sends `setup_intent.succeeded` → backend saves payment method to DynamoDB
4. **Weekly check** → Monday 9 AM (user's TZ): `processPenalties` Lambda checks if weekly limit exceeded
5. **If exceeded** → creates PaymentIntent for $10 → charges card → updates goal status to `charged` → sends email
6. **If under budget** → updates goal status → sends congratulations email
7. **Auto-renewal** → if `autoRenew` is true, creates new goal for next week

### Webhook Events Handled
- `setup_intent.succeeded` — save payment method, send confirmation
- `setup_intent.setup_failed` — send error email
- `payment_intent.payment_failed` — log failure, send email
- `charge.dispute.created` — log for manual review

---

## Email System

Transactional emails via AWS SES with branded dark HTML template.

| Template | Trigger | Content |
|----------|---------|---------|
| `goalCreated` | Goal saved | Confirmation + motivational quote |
| `paymentSetupComplete` | Card setup webhook | Card saved successfully |
| `goalPassed` | Monday penalty check | Congratulations, no charge |
| `penaltyCharged` | Monday penalty check | Goal missed, $10 to charity |
| `chargeFailed` | Monday penalty check | Payment failed, action needed |
| `goalCancelled` | User forfeits | $10 charged to charity |
| `goalRenewed` | Monday auto-renewal | New week goal activated |
| `contactFormSubmission` | Feedback form | Forwarded to support |

---

## iPhone Integration

Users collect screen time data via iOS Shortcuts automation:

1. Shortcut reads the Screen Time API on iPhone
2. Formats entries as comma-separated strings: `"Chrome (2h 13m),Spotify (6m),iTerm (52s)"`
3. Sends daily via HTTP POST to `POST /ingest` with body:
   ```json
   {
     "deviceKey": "user-device-key",
     "date": "Mon, 15 Jan 2024 00:00:00 GMT",
     "entries": "Chrome (2h 13m),Spotify (6m)",
     "systemVersion": "17.2",
     "deviceName": "iPhone 15"
   }
   ```
4. Backend parses time strings into minutes and merges into S3 data file
5. Bulk upload available via `POST /ingest/bulk` for historical backfill (up to 90 days)

---

## Frontend Pages & Components

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `Landing` | Marketing homepage with testimonials, features, CTA |
| `/auth` | `Auth` | Sign in, sign up, email verification |
| `/app/dashboard` | `Dashboard` | Charts and analytics for screen time data |
| `/app/goals` | `Goals` | Goal creation wizard + active goal tracker |
| `/app/settings` | `Settings` | Card management, account deletion |
| `/app/ranking` | `Ranking` | Leaderboard (coming soon) |
| `/blog` | `Blog` | Article listing |
| `/blog/:slug` | `Blog` | Individual article with scroll animations |
| `/privacy` | `PrivacyPolicy` | Privacy policy |
| `/terms` | `TermsOfService` | Terms of service |

### Key Components
- **Dashboard** — Multi-chart analytics: bar, area, donut, heatmap. Time range and app filters.
- **ContributionsChart** — GitHub-style heatmap calendar for daily screen time.
- **Goals** — Multi-step goal creation with Stripe integration, progress tracking with radial gauge.
- **CardManagement** — Displays saved Stripe card info with expiry warnings.
- **StripePayment** — Stripe Elements CardElement form for secure card entry.
- **FeedbackForm** — Star rating + text area, submits to `/contact`.
- **AuthContext** — React Context for auth state, wraps app, provides `user`/`signIn`/`signUp`/`signOut`.
- **ProtectedRoute** — Route wrapper that redirects to `/auth` if not logged in.

---

## Environment Variables

### Frontend (`.env`)
```
VITE_API_URL                    # API Gateway base URL
VITE_COGNITO_USER_POOL_ID      # Cognito User Pool ID
VITE_COGNITO_CLIENT_ID         # Cognito App Client ID
VITE_COGNITO_IDENTITY_POOL_ID  # Cognito Identity Pool ID
VITE_COGNITO_DOMAIN            # Cognito hosted UI domain
VITE_DATA_BUCKET               # S3 bucket for screen time data
VITE_AWS_REGION                # AWS region
VITE_REDIRECT_SIGN_IN          # OAuth redirect URI (sign in)
VITE_REDIRECT_SIGN_OUT         # OAuth redirect URI (sign out)
VITE_STRIPE_PUBLISHABLE_KEY    # Stripe publishable key
```

### Backend (`serverless.yml` environment)
```
DYNAMODB_GOALS_TABLE            # DynamoDB goals table name
DYNAMODB_PAYMENTS_TABLE         # DynamoDB payments table name
DATA_BUCKET                     # S3 data bucket name
STRIPE_SECRET_KEY               # Stripe secret key
STRIPE_WEBHOOK_SECRET           # Stripe webhook signing secret
SES_REGION                      # SES region
SES_FROM_EMAIL                  # Sender email address
SES_SUPPORT_EMAIL               # Support/feedback recipient
APP_URL                         # Frontend URL (for email links)
STAGE                           # Deployment stage (dev/prod)
API_KEY                         # API key for /ingest endpoint
```

---

## Infrastructure & Deployment

### Development
```bash
# Frontend
npm install && npm run dev        # Vite dev server on localhost:5173

# Backend
cd backend && npm install
npx serverless offline            # Local Lambda emulation
```

### Production
- **Frontend**: `npm run build` → deploy built files to S3 → served via CloudFront CDN
- **Backend**: `npx serverless deploy --stage prod` → deploys Lambda functions, API Gateway, DynamoDB tables, S3 buckets, CloudFront distribution

### Infrastructure Resources (defined in `serverless.yml`)
- 2 DynamoDB tables (goals + payments) with on-demand billing and TTL
- S3 buckets for data storage and website hosting
- CloudFront distribution with security headers (HSTS, CSP, X-Frame-Options)
- API Gateway HTTP API with Cognito authorizer
- IAM roles with least-privilege access
- CloudWatch alarms for error rates and latency
- API throttling: 10 burst / 20 sustained requests per IP

---

## Security

- **Encryption in transit**: TLS 1.2+ via CloudFront and API Gateway
- **Encryption at rest**: AES-256 (S3 SSE, DynamoDB AWS-managed)
- **Auth**: Cognito JWT validation, email verification required
- **Data isolation**: All data partitioned by userId, IAM roles prevent cross-user access
- **Payment security**: Card numbers never touch our servers (Stripe tokenization)
- **Input sanitization**: Contact form strips HTML and control characters
- **Security headers**: HSTS (2yr), X-Content-Type-Options, X-Frame-Options: DENY, CSP
- **CORS**: Restricted to specific allowed origins
- **Rate limiting**: API Gateway throttling per IP
- **Account deletion**: Full data purge (S3 + DynamoDB + Cognito)

---

## Setup

### Backend

1. Install dependencies:
```bash
cd backend
npm install
```

2. Configure environment variables in `serverless.yml` or `.env`

3. Deploy to AWS:
```bash
npm run deploy
```

### Frontend

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file with the variables listed above (see [Environment Variables](#environment-variables))

3. Run development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

### Stripe Setup
1. Create Stripe account and get API keys
2. Set up webhook endpoint pointing to `/stripe-webhook`
3. Subscribe to events: `setup_intent.succeeded`, `setup_intent.setup_failed`, `payment_intent.payment_failed`, `charge.dispute.created`

### Cognito Setup
1. Create User Pool with email sign-in
2. Create Identity Pool linked to User Pool
3. Configure Google and Facebook as identity providers
4. Set up OAuth redirect URIs
