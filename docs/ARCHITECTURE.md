# System Architecture

FreelanceFlow follows a **three-tier architecture** with a React SPA as the client layer, a Spring Boot REST API as the application layer, and MongoDB as the data layer.

---

## Table of Contents

- [Overview Diagram](#overview-diagram)
- [Client Layer](#client-layer)
- [Application Layer](#application-layer)
- [Data Layer](#data-layer)
- [Module Architecture](#module-architecture)
- [Authentication Flow](#authentication-flow)
- [Bid Scoring Engine](#bid-scoring-engine)
- [Milestone and Invoice State Machines](#milestone-and-invoice-state-machines)
- [Analytics Engine](#analytics-engine)
- [Team Collaboration Model](#team-collaboration-model)
- [Deployment Architecture](#deployment-architecture)
- [Design Decisions and Trade-offs](#design-decisions-and-trade-offs)

---

## Overview Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│                                                                 │
│   React 18 + TypeScript  ·  Vite 6.3.5  ·  Tailwind CSS 4     │
│   React Router 7  ·  Recharts  ·  Radix UI / shadcn            │
│                                                                 │
│   ┌────────────────────┐    ┌──────────────────────────────┐   │
│   │  AppContext         │    │  AuthGuard                   │   │
│   │  (auth state)       │    │  (route protection)          │   │
│   └────────────────────┘    └──────────────────────────────┘   │
│                                                                 │
│   /freelancer/*  ←──── FreelancerLayout  ←──── Freelancer Pages│
│   /client/*      ←──── ClientLayout      ←──── Client Pages    │
└─────────────────────────────┬───────────────────────────────────┘
                              │  HTTP / REST (JSON)
                              │  fetch() from React components
┌─────────────────────────────▼───────────────────────────────────┐
│                     APPLICATION LAYER                           │
│                Spring Boot 4.0.3  /  Java 21                    │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐   │
│  │AuthController│  │BidController│  │MilestoneInvoice      │   │
│  │SignupCtrl    │  │(submit,     │  │Controller            │   │
│  │ProfileCtrl   │  │accept,      │  │(milestone state      │   │
│  │AdminPatch    │  │weights)     │  │ invoice lifecycle)   │   │
│  └─────────────┘  └─────────────┘  └──────────────────────┘   │
│                                                                 │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────┐   │
│  │UserRestController│  │FreelancerTabs/   │  │TeamController│  │
│  │(dashboard, login)│  │ClientTabsCtrl    │  │SpaController │  │
│  └─────────────────┘  └──────────────────┘  └─────────────┘   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  BidScoringEngine  ·  AnalyticsEngine  ·  ProjectValidator│  │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ProjectDAO  ·  BidDAO  ·  ClientDAO  ·  InvoiceDAO     │   │
│  │  (MongoDB Java Driver — no ORM)                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │  MongoDB Wire Protocol
┌─────────────────────────────▼───────────────────────────────────┐
│                        DATA LAYER                               │
│         MongoDB (local dev)  ·  MongoDB Atlas (production)      │
│                                                                 │
│   users  ·  projects  ·  bids  ·  invoices  ·  clients         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Client Layer

### Single-Page Application Pattern

FreelanceFlow's frontend is a React SPA served entirely by Spring Boot. The `SpaController` catches all non-API browser routes and forwards them to `/index.html`, allowing React Router to handle client-side navigation.

```
Browser requests /freelancer/projects
       ↓
Spring Boot SpaController: forward to /index.html
       ↓
React Router 7: renders <FreelancerProjects /> component
```

### State Management

**AppContext** (`frontend/AppContext.tsx`) is the single source of auth truth:

```typescript
{
  userId: string,
  name: string,
  role: "freelancer" | "client",
  orgRole: "team_leader" | "project_manager" | null,
  teamLeaderName: string | null
}
```

Auth state is persisted to `localStorage` so it survives page refreshes. On mount, `AppContext` rehydrates from `localStorage` before rendering protected routes.

### Route Protection

**AuthGuard** (`frontend/components/guards/AuthGuard.tsx`) wraps all authenticated routes. On each navigation:
1. Reads auth state from `AppContext`
2. If unauthenticated → redirect to `/auth`
3. If wrong role (freelancer accessing `/client/*`) → redirect to their dashboard

### Component Architecture

```
App.tsx
├── routes.tsx (React Router 7 definitions)
│   ├── /auth → Auth.tsx
│   ├── / → Landing.tsx
│   ├── /freelancer/* → AuthGuard → FreelancerLayout
│   │   ├── /dashboard → Dashboard.tsx
│   │   ├── /marketplace → Marketplace.tsx
│   │   ├── /projects → Projects.tsx
│   │   ├── /invoices → Invoices.tsx
│   │   ├── /clients → Clients.tsx
│   │   └── /profile → FreelancerProfile.tsx
│   └── /client/* → AuthGuard → ClientLayout
│       ├── /dashboard → ClientDashboard.tsx
│       ├── /create-project → CreateProject.tsx
│       ├── /projects → ClientProjects.tsx
│       ├── /bidding → ProjectBidding.tsx
│       ├── /payments → ClientPaymentHistory.tsx
│       └── /profile → ClientProfile.tsx
```

---

## Application Layer

### REST API Design

All business API endpoints follow the pattern:
- `/api/auth/*` — authentication (public)
- `/api/freelancer/*` — freelancer-only endpoints
- `/api/client/*` — client-only endpoints
- `/api/bids/*` — bid operations (both roles)
- `/api/marketplace` — public project listing
- `/api/admin/*` — administrative patches

The URL prefix (`/api/freelancer/` vs `/api/client/`) acts as a surrogate role identifier since there is no JWT token infrastructure.

### Data Access Pattern

All database access goes through dedicated **DAO classes** that use the MongoDB Java Driver directly (no Spring Data repositories, no ORM):

```java
// Example: BidDAO.java
public void saveBid(Document bidDoc) {
    MongoDatabase db = mongoClient.getDatabase("freelanceflow");
    db.getCollection("bids").insertOne(bidDoc);
}
```

Each DAO is responsible for:
- Serializing Java objects to MongoDB `Document`
- Deserializing `Document` results to `Map<String, Object>` or domain objects
- Handling `ObjectId` ↔ `String` conversion

---

## Data Layer

### Document Design Philosophy

FreelanceFlow uses **embedding** over **referencing** for data that is always accessed together:

| Embedded in | Embedded data | Reason |
|-------------|--------------|--------|
| `projects` | `milestones[]` | Always fetched with project; simplifies state updates |
| `projects` | `deliverables[]`, `tasks[]`, `outOfScope[]` | Read-only after creation; no need for separate collection |
| `bids` | `scoreBreakdown` object | Always displayed alongside the composite score |

**Referenced** (stored as string IDs):
- `projects.clientId` → `users._id`
- `bids.freelancerId` → `users._id`
- `invoices.projectId` → `projects._id`

---

## Module Architecture

### Module 1: Authentication & User Management

```
POST /api/auth/signup → SignupController → users collection
POST /api/auth/login  → UserRestController → users collection
GET/PUT /api/*/profile → ProfileController → users collection
POST /api/admin/patch-user → AdminPatchController → users collection
```

The frontend AuthGuard and AppContext are also part of this module. Auth is **stateless** — no JWT tokens are issued. The backend trusts the URL prefix as a role indicator. The frontend enforces access control via AuthGuard before any API call is made.

### Module 2: Project Management & Marketplace

```
POST /api/client/create-project → ClientTabsController → ProjectValidator → ProjectDAO
GET  /api/client/projects       → ClientTabsController → TeamController → ProjectDAO
GET  /api/marketplace           → FreelancerTabsController → ProjectDAO
```

`ProjectValidator` is a service class (not a Spring validator) that checks field constraints before any write to MongoDB.

### Module 3: Bidding System & Scoring Engine

```
POST /api/bids/submit   → BidController → BidDAO.hasFreelancerBid() → BidScoringEngine → BidDAO.saveBid()
GET  /api/bids/project  → BidController → BidDAO → sorted by compositeScore DESC
POST /api/bids/accept   → BidController → BidDAO + ProjectDAO.assignFreelancerToProject()
PUT  /api/bids/weights  → BidController → BidDAO.getAllBids() → BidScoringEngine (rescore all) → BidDAO.bulkUpdate()
```

### Module 4: Milestone, Invoice Engine & Analytics

```
PUT  /api/freelancer/milestone/complete → MilestoneInvoiceController → ProjectDAO (sets pendingApproval)
PUT  /api/client/milestone/approve      → MilestoneInvoiceController → ProjectDAO (sets completed+approved)
POST /api/freelancer/invoice/generate   → MilestoneInvoiceController → InvoiceDAO
PUT  /api/client/invoice/approve        → MilestoneInvoiceController → InvoiceDAO
PUT  /api/client/invoice/pay            → MilestoneInvoiceController → InvoiceDAO
GET  /api/freelancer/dashboard          → UserRestController → AnalyticsEngine
```

---

## Authentication Flow

```
User fills login form
        ↓
POST /api/auth/login
        ↓
UserRestController validates email + password + role
        ↓  (match found)
Returns user document including orgRole and teamLeaderName
        ↓
AppContext stores { userId, name, role, orgRole, teamLeaderName } in state + localStorage
        ↓
React Router navigates to /freelancer/dashboard or /client/dashboard
        ↓
AuthGuard on each subsequent navigation:
  → reads AppContext
  → if null → redirect to /auth
  → if wrong role → redirect to own dashboard
```

---

## Bid Scoring Engine

`BidScoringEngine.java` (`src/main/java/com/freelanceflow/scoring/`)

### Input

- Bid document (bidAmount, proposalQuality, freelancerId)
- Project document (budget, requiredSkills)
- Freelancer's historical data (from `clients` and `invoices` collections)
- Weight configuration (custom per-project or default)

### Scoring Algorithm

```java
double reliabilityScore    = computeReliability(freelancerId);      // 0-100
double budgetFitScore      = computeBudgetFit(bidAmount, budget);   // 0-100
double experienceScore     = computeExperienceMatch(skills, req);   // 0-100
double completionScore     = computeCompletionRate(freelancerId);   // 0-100
double qualityScore        = (proposalQuality / 5.0) * 100;        // 0-100

double composite = (reliabilityScore    * weights.reliability    / 100)
                 + (budgetFitScore      * weights.budgetFit      / 100)
                 + (experienceScore     * weights.experienceMatch / 100)
                 + (completionScore     * weights.completionRate  / 100)
                 + (qualityScore        * weights.proposalQuality / 100);
```

### Weight Customization & Rescoring

When `PUT /api/bids/weights` is called:
1. New weights are saved to `projects.customWeights`
2. All bids for the project are fetched
3. `BidScoringEngine.calculateBidScore()` is called for each bid with new weights
4. All bids are updated in MongoDB with new `compositeScore` and `scoreBreakdown`

This is a synchronous operation — the response includes all rescored bids.

---

## Milestone and Invoice State Machines

### Milestone States

```
                    [freelancer: PUT /milestone/complete]
PENDING ──────────────────────────────────────────────► PENDING_APPROVAL
  ▲                                                              │
  │                         [client: PUT /milestone/approve (rejected)]
  └──────────────────────────────────────────────────────────────┘
                                                                │
                         [client: PUT /milestone/approve (approved)]
                                                                ▼
                                                          APPROVED (terminal)
```

State is tracked via three boolean fields on each milestone:

| State | `pendingApproval` | `completed` | `approved` |
|-------|-------------------|-------------|------------|
| Pending | false | false | false |
| Pending Approval | true | false | false |
| Approved | false | true | true |

### Invoice States

```
[freelancer: POST /invoice/generate]
        ↓
    PENDING
        ↓  [team_leader: PUT /invoice/approve (approved=true)]
    APPROVED  +  approvedDate timestamp
        ↓  [project_manager: PUT /invoice/pay]
    PAID  +  paidDate timestamp
```

---

## Analytics Engine

`AnalyticsEngine.java` (`src/main/java/com/freelanceflow/controller/`)

Three rule-based methods compute real-time analytics for the freelancer dashboard:

### calculateReliabilityScore(freelancerId)

```
score = 100
for each client the freelancer has worked with:
    score -= avgPaymentDelayDays × 2
    score -= overdueInvoiceCount × 10
score = clamp(score, 0, 100)
```

### predictDeadlineRisk(freelancerId)

Scans all active projects for the freelancer. For each project:
```
daysToDeadline = endDate - today
completedMilestones = count of approved milestones
totalMilestones = total milestone count

if (completedMilestones / totalMilestones < expectedProgress) → HIGH RISK
if (daysToDeadline < 7) → MEDIUM RISK
```

### predictNextMonthIncome(freelancerId)

```
pendingMilestoneValue = sum of unapproved milestone amounts across active projects
forecast = pendingMilestoneValue × historicalCompletionRate
```

---

## Team Collaboration Model

FreelanceFlow implements team sharing using **string-based name matching** — a deliberate choice to avoid schema changes.

### How It Works

1. When a Project Manager registers, they set `teamLeaderName = "Marcus"` (the team leader's name)
2. When fetching projects for the Project Manager, `TeamController.getTeamClientIds()` is called:
   ```java
   // Find all users where name matches teamLeaderName (case-insensitive)
   List<String> teamIds = usersCollection.find(
       Filters.regex("name", "^" + teamLeaderName + "$", "i")
   ).map(doc -> doc.getObjectId("_id").toString()).into(new ArrayList<>());
   ```
3. The project query returns projects where `clientId IN [projectManagerId, ...teamIds]`

### Trade-offs

| Advantage | Trade-off |
|-----------|-----------|
| No schema changes required | Fragile string matching — typos break visibility |
| Immediate visibility without invitation flow | Case-sensitivity issues (handled by regex) |
| Works across existing user documents | Null `teamLeaderName` must be guarded |

---

## Deployment Architecture

```
GitHub (source code)
        │  git push
        ▼
Render.com Build Server
        │  docker build (3-stage)
        ▼
Docker Container (eclipse-temurin:21-jre-alpine)
        │  java -jar app.jar --server.port=$PORT
        ▼
Render Web Service (HTTPS)
        │  MONGODB_URI env var
        ▼
MongoDB Atlas (M0 free tier)
Replica Set  ·  Automatic backups  ·  Cloud-hosted
```

The Spring Boot application serves as both the API server and the static file server for the React SPA — a single deployable unit with no separate frontend hosting required.

---

## Design Decisions and Trade-offs

| Decision | Rationale | Trade-off |
|----------|-----------|-----------|
| **No ORM (raw MongoDB Driver)** | Full control over document queries | More boilerplate; manual ObjectId conversion |
| **No JWT authentication** | Faster development; stateless frontend auth | Backend cannot independently verify caller identity; planned for future |
| **Embedded milestones in projects** | Single document read/write for most operations | Array updates require MongoDB positional operators |
| **String-based team sharing** | No schema migration needed | Fragile to typos; requires normalization |
| **Frontend-only AuthGuard** | Zero backend session infrastructure | Security relies entirely on client-side enforcement |
| **Single Spring Boot + SPA** | One deployment unit; simple Docker build | Frontend and backend must be rebuilt together for any frontend change |
| **Rule-based analytics (no ML)** | Works with sparse data; no training pipeline | Predictions become more accurate only at scale |
