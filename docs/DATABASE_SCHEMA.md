# Database Schema Documentation

FreelanceFlow uses **MongoDB** — a document-oriented NoSQL database. There are no SQL scripts or DDL statements. Collections and indexes are created automatically on the first write by the application.

**Database name:** `freelanceflow`  
**Collections:** `users`, `projects`, `bids`, `invoices`, `clients`

---

## Table of Contents

- [Connection Configuration](#connection-configuration)
- [Collection: users](#collection-users)
- [Collection: projects](#collection-projects)
- [Collection: bids](#collection-bids)
- [Collection: invoices](#collection-invoices)
- [Collection: clients](#collection-clients)
- [Data Relationships](#data-relationships)
- [Indexes](#indexes)
- [Sample Documents](#sample-documents)

---

## Connection Configuration

```properties
# Local development (default fallback)
spring.data.mongodb.uri=mongodb://localhost:27017/freelanceflow

# Production (MongoDB Atlas — set via environment variable)
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/freelanceflow
```

The URI is read from the `MONGODB_URI` environment variable. If not set, it falls back to the local MongoDB instance.

---

## Collection: `users`

Stores all registered users. Both freelancers and clients are stored in the **same collection** with role-specific fields stored alongside shared fields. The `role` field determines which fields are applicable.

### Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | MongoDB-generated unique identifier |
| `name` | String | Yes | Full name |
| `email` | String | Yes | Login email — unique across all users |
| `password` | String | Yes | Hashed password |
| `role` | String | Yes | `"freelancer"` or `"client"` |
| `profession` | String | Freelancer | Job title (e.g., "Full Stack Developer") |
| `headline` | String | Freelancer | Short professional tagline |
| `skills` | Array\<String\> | Freelancer | List of technical skills |
| `education` | String | Freelancer | Highest qualification |
| `businessName` | String | Client | Company or organization name |
| `orgRole` | String | Client | `"team_leader"` or `"project_manager"` |
| `teamLeaderName` | String | Project Manager | Name of team leader for shared visibility |
| `location` | String | No | City or country |
| `contactInfo` | String | No | Phone or alternate email |
| `avatar` | String | No | Profile photo (URL or base64) |

### Role-Field Mapping

```
users collection
├── Common fields: _id, name, email, password, role, location, contactInfo, avatar
├── Freelancer fields: profession, headline, skills[], education
└── Client fields: businessName, orgRole, teamLeaderName
```

---

## Collection: `projects`

Stores all project definitions created by clients. Milestones, deliverables, tasks, and out-of-scope items are stored as **embedded arrays** within each project document.

### Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Unique project identifier |
| `clientId` | String | Yes | `_id` of the client who created the project |
| `teamLeaderName` | String | Yes | Used to share project visibility across team members |
| `title` | String | Yes | Project title (min 5 chars) |
| `summary` | String | Yes | Project description (min 20 chars) |
| `objectives` | String | Yes | What the project aims to achieve |
| `scope` | String | No | What is in scope |
| `skills` | Array\<String\> | No | Required freelancer skills |
| `deliverables` | Array\<String\> | Yes (min 1) | List of expected outputs |
| `tasks` | Array\<String\> | No | Specific work items |
| `outOfScope` | Array\<String\> | No | Explicitly excluded items |
| `budget` | Number | Yes | Project budget in USD (must be > 0) |
| `paymentType` | String | Yes | `"fixed"` or `"hourly"` |
| `startDate` | String | Yes | ISO date string — must be before `endDate` |
| `endDate` | String | Yes | ISO date string |
| `status` | String | Yes | `"Open"`, `"In Progress"`, or `"Completed"` |
| `assignedFreelancerId` | String | No | `_id` of accepted freelancer (set after bid acceptance) |
| `milestones` | Array\<Object\> | No | Embedded milestone objects (see below) |
| `srsDocument` | String | No | File path of uploaded SRS document |
| `customWeights` | Object | No | Per-project bid scoring weight overrides |

### Milestone Object Schema

```json
{
  "name": "Backend API Development",
  "dueDate": "2026-06-01",
  "completed": false,
  "approved": false,
  "pendingApproval": false
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | String | Milestone title |
| `dueDate` | String | ISO date string |
| `completed` | Boolean | `true` after client approves |
| `approved` | Boolean | `true` after client approves |
| `pendingApproval` | Boolean | `true` after freelancer marks complete, before client acts |

### Milestone State Transitions

```
completed=false, pendingApproval=false  →  [Freelancer: Mark Complete]
completed=false, pendingApproval=true   →  [Client: Approve]
completed=true,  approved=true          →  FINAL STATE (approved)
                                         →  [Client: Reject]
completed=false, pendingApproval=false  →  Back to pending
```

### Custom Weights Object Schema

```json
{
  "reliability": 20,
  "budgetFit": 30,
  "experienceMatch": 30,
  "completionRate": 10,
  "proposalQuality": 10
}
```

All values are integers; they must sum to 100. If `customWeights` is null or absent, default weights are used by `BidScoringEngine`.

---

## Collection: `bids`

Stores all bid proposals submitted by freelancers. Each document includes the composite score and full per-metric breakdown computed by `BidScoringEngine`.

### Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Unique bid identifier |
| `projectId` | String | Yes | `_id` of the target project |
| `freelancerId` | String | Yes | `_id` of the bidding freelancer |
| `bidAmount` | Number | Yes | Proposed price in USD |
| `proposal` | String | Yes | Proposal text |
| `proposalQuality` | Number | Yes | Self-rated quality score (1–5) |
| `compositeScore` | Number | Auto | Weighted total score (0–100) |
| `scoreBreakdown` | Object | Auto | Per-metric scores (see below) |
| `status` | String | Auto | `"Pending"`, `"Accepted"`, or `"Rejected"` |
| `submittedAt` | String | Auto | ISO timestamp of submission |

### Score Breakdown Object Schema

```json
{
  "reliability": 85.0,
  "budgetFit": 92.0,
  "experienceMatch": 75.0,
  "completionRate": 70.0,
  "proposalQuality": 80.0
}
```

Each value is a float 0–100 representing the normalized score for that metric before weighting.

### Composite Score Formula

```
compositeScore = (reliability × w1) + (budgetFit × w2) + (experienceMatch × w3)
               + (completionRate × w4) + (proposalQuality × w5)

where w1+w2+w3+w4+w5 = 1.0  (weights as decimals)
```

Default weights: `w1=0.30, w2=0.25, w3=0.20, w4=0.15, w5=0.10`

### Uniqueness Constraint

`BidDAO.hasFreelancerBid()` checks for an existing bid with the same `(projectId, freelancerId)` pair before allowing insertion. Each freelancer can submit **at most one bid per project**.

---

## Collection: `invoices`

Stores all invoice records generated by freelancers after milestone approval. Each document tracks the complete payment lifecycle with full audit trail timestamps.

### Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Unique invoice identifier |
| `projectId` | String | Yes | `_id` of the associated project |
| `freelancerId` | String | Yes | `_id` of the invoice-generating freelancer |
| `clientId` | String | Yes | `_id` of the client |
| `milestoneIndex` | Number | Yes | Index of the milestone this invoice covers |
| `amount` | Number | Yes | Invoice amount in USD |
| `status` | String | Auto | `"Pending"`, `"Approved"`, or `"Paid"` |
| `dateIssued` | String | Auto | ISO timestamp when invoice was generated |
| `approvedDate` | String | Conditional | ISO timestamp when team leader approved |
| `paidDate` | String | Conditional | ISO timestamp when payment was recorded |

### Invoice State Machine

```
[Freelancer generates invoice]
        ↓
    status: "Pending"
        ↓  [Client team_leader approves]
    status: "Approved"  +  approvedDate set
        ↓  [Client project_manager marks paid]
    status: "Paid"  +  paidDate set
```

Rejection: `MilestoneInvoiceController.approveInvoice()` with `approved: false` deletes the invoice and allows regeneration.

---

## Collection: `clients`

Tracks per-client reliability metrics from a freelancer's perspective. Updated by `AnalyticsEngine` as invoices are processed and projects complete.

### Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Unique record identifier |
| `clientId` | String | Yes | `_id` of the client being tracked |
| `freelancerId` | String | Yes | `_id` of the freelancer observing this client |
| `clientName` | String | Yes | Denormalized client name for display |
| `businessName` | String | No | Client's business name |
| `avgPaymentDelayDays` | Number | Auto | Average days between invoice approval and payment |
| `overdueInvoiceCount` | Number | Auto | Invoices that exceeded 30-day payment window |
| `activeProjectCount` | Number | Auto | Current number of active projects |
| `reliabilityScore` | Number | Auto | Computed 0–100 by `AnalyticsEngine.calculateReliabilityScore()` |

### Reliability Score Formula

```java
// AnalyticsEngine.calculateReliabilityScore()
score = 100
score -= (avgPaymentDelayDays * 2)   // penalty for slow payment
score -= (overdueInvoiceCount * 10)  // heavy penalty for overdue
score = max(0, min(100, score))       // clamp to [0, 100]
```

---

## Data Relationships

MongoDB has no foreign key constraints. Relationships are maintained by storing the string representation of `_id` values in related documents:

```
users._id  ←──────────── projects.clientId
users._id  ←──────────── projects.assignedFreelancerId
users._id  ←──────────── bids.freelancerId
projects._id ←─────────── bids.projectId
projects._id ←─────────── invoices.projectId
users._id  ←──────────── invoices.freelancerId
users._id  ←──────────── invoices.clientId
users._id  ←──────────── clients.clientId
users._id  ←──────────── clients.freelancerId

Team sharing (string matching, not a foreign key):
users.teamLeaderName  ←── users.name  (of the team leader account)
projects.teamLeaderName ←── users.name
```

---

## Indexes

FreelanceFlow does not define explicit indexes beyond MongoDB's default `_id` index. All queries are handled via collection scans on the current dataset size.

**Recommended indexes for production scale:**

```javascript
// Marketplace query performance
db.projects.createIndex({ status: 1, skills: 1 })

// Bid lookups by project
db.bids.createIndex({ projectId: 1, compositeScore: -1 })

// Freelancer invoice lookups
db.invoices.createIndex({ freelancerId: 1, status: 1 })

// Team-aware project queries
db.projects.createIndex({ teamLeaderName: 1 })
db.users.createIndex({ email: 1 }, { unique: true })
```

---

## Sample Documents

### Sample `users` document (Freelancer)

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "name": "Sarah Chen",
  "email": "sarah@example.com",
  "password": "hashed_password_here",
  "role": "freelancer",
  "profession": "Full Stack Developer",
  "headline": "React + Spring Boot specialist with 4 years experience",
  "skills": ["React", "Java", "Spring Boot", "MongoDB", "TypeScript"],
  "education": "B.Tech Computer Science",
  "location": "Pune, India",
  "contactInfo": "+91-9876543210",
  "avatar": null
}
```

### Sample `projects` document

```json
{
  "_id": "64f3c4d5e6f7a8b9c0d1e2f3",
  "clientId": "64f2b3c4d5e6f7a8b9c0d1e2",
  "teamLeaderName": "Marcus Lee",
  "title": "E-commerce Platform Development",
  "summary": "Build a full-stack e-commerce platform with product catalog, cart, and checkout",
  "objectives": "Deliver a scalable, mobile-friendly platform within 8 weeks",
  "scope": "Frontend UI, REST API, product catalog, cart, checkout flow",
  "skills": ["React", "Node.js", "MongoDB"],
  "deliverables": ["Product listing page", "Shopping cart", "Checkout flow", "Admin panel"],
  "tasks": ["Design DB schema", "Build REST API", "React UI", "Integration testing"],
  "outOfScope": ["Payment gateway", "Mobile native app"],
  "budget": 5000,
  "paymentType": "fixed",
  "startDate": "2026-05-01",
  "endDate": "2026-07-01",
  "status": "In Progress",
  "assignedFreelancerId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "milestones": [
    { "name": "DB Schema & API Setup", "dueDate": "2026-05-15", "completed": true, "approved": true, "pendingApproval": false },
    { "name": "Backend REST API", "dueDate": "2026-06-01", "completed": false, "approved": false, "pendingApproval": true },
    { "name": "Frontend UI", "dueDate": "2026-06-20", "completed": false, "approved": false, "pendingApproval": false },
    { "name": "Testing & Launch", "dueDate": "2026-07-01", "completed": false, "approved": false, "pendingApproval": false }
  ],
  "customWeights": null,
  "srsDocument": null
}
```

### Sample `bids` document

```json
{
  "_id": "64f4d5e6f7a8b9c0d1e2f3a4",
  "projectId": "64f3c4d5e6f7a8b9c0d1e2f3",
  "freelancerId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "bidAmount": 4500,
  "proposal": "I have 4 years of experience building e-commerce platforms with React and Spring Boot. I recently completed a similar project for a retail client and can deliver within your timeline.",
  "proposalQuality": 4,
  "compositeScore": 82.5,
  "scoreBreakdown": {
    "reliability": 87.0,
    "budgetFit": 94.0,
    "experienceMatch": 85.0,
    "completionRate": 70.0,
    "proposalQuality": 80.0
  },
  "status": "Accepted",
  "submittedAt": "2026-04-20T09:15:00Z"
}
```

### Sample `invoices` document

```json
{
  "_id": "64f5e6f7a8b9c0d1e2f3a4b5",
  "projectId": "64f3c4d5e6f7a8b9c0d1e2f3",
  "freelancerId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "clientId": "64f2b3c4d5e6f7a8b9c0d1e2",
  "milestoneIndex": 0,
  "amount": 1250.00,
  "status": "Paid",
  "dateIssued": "2026-05-16T10:00:00Z",
  "approvedDate": "2026-05-17T14:30:00Z",
  "paidDate": "2026-05-18T09:00:00Z"
}
```
