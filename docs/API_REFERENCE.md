# API Reference

All endpoints are prefixed with the application base URL.  
**Local:** `http://localhost:8080`  
**Production:** `https://freelanceflow-nf7p.onrender.com`

All request and response bodies use **JSON** (`Content-Type: application/json`).

---

## Table of Contents

- [Authentication](#authentication)
- [Profile](#profile)
- [Dashboard](#dashboard)
- [Projects](#projects)
- [Marketplace](#marketplace)
- [Bids](#bids)
- [Milestones](#milestones)
- [Invoices](#invoices)
- [Team](#team)
- [Admin](#admin)

---

## Authentication

### POST `/api/auth/signup`

Register a new user.

**Request body:**

```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "secret123",
  "role": "freelancer",

  // Freelancer-only fields
  "profession": "Full Stack Developer",
  "headline": "React + Java specialist",
  "skills": ["React", "Java", "MongoDB"],
  "education": "B.Tech Computer Science",
  "location": "Pune, India",
  "contactInfo": "+91-9876543210",

  // Client-only fields
  "businessName": "Acme Corp",
  "orgRole": "team_leader",
  "teamLeaderName": ""
}
```

**Response `200 OK`:**

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "role": "freelancer"
}
```

**Response `400 Bad Request`:**

```json
{ "error": "Email already registered" }
```

---

### POST `/api/auth/login`

Authenticate a user.

**Request body:**

```json
{
  "email": "jane@example.com",
  "password": "secret123",
  "role": "freelancer"
}
```

**Response `200 OK`:**

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "role": "freelancer",
  "orgRole": null,
  "teamLeaderName": null
}
```

**Response `401 Unauthorized`:**

```json
{ "error": "Invalid credentials" }
```

---

## Profile

### GET `/api/freelancer/profile?userId={id}`

Get a freelancer's profile.

**Response `200 OK`:**

```json
{
  "_id": "64f1...",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "profession": "Full Stack Developer",
  "headline": "React + Java specialist",
  "skills": ["React", "Java", "MongoDB"],
  "education": "B.Tech Computer Science",
  "location": "Pune, India",
  "contactInfo": "+91-9876543210",
  "avatar": null
}
```

### PUT `/api/freelancer/profile`

Update freelancer profile. Send only the fields to update.

**Request body:** Same shape as GET response (partial updates supported)

**Response `200 OK`:** Updated user document

---

### GET `/api/client/profile?userId={id}`

Get a client's profile.

**Response `200 OK`:**

```json
{
  "_id": "64f2...",
  "name": "Marcus Lee",
  "email": "marcus@acme.com",
  "businessName": "Acme Corp",
  "location": "Mumbai, India",
  "contactInfo": "9876543210",
  "orgRole": "team_leader",
  "teamLeaderName": "",
  "avatar": null
}
```

### PUT `/api/client/profile`

Update client profile. If `orgRole` is `project_manager`, the system automatically resolves the team leader link using `teamLeaderName`.

---

## Dashboard

### GET `/api/freelancer/dashboard?userId={id}`

Get the freelancer's dashboard data.

**Response `200 OK`:**

```json
{
  "totalEarnings": 4500.00,
  "pendingPayments": 1200.00,
  "activeProjectCount": 2,
  "overdueInvoiceCount": 0,
  "earningsHistory": [
    { "month": "2026-01", "amount": 1500.00 },
    { "month": "2026-02", "amount": 3000.00 }
  ],
  "riskAlerts": [
    { "projectId": "64f3...", "message": "Milestone due in 2 days" }
  ],
  "reliabilityScore": 87,
  "nextMonthForecast": 2000.00
}
```

---

### GET `/api/client/dashboard-summary?userId={id}`

Get client dashboard data (team-aggregated).

**Response `200 OK`:**

```json
{
  "totalProjects": 5,
  "activeProjects": 2,
  "amountDue": 3200.00,
  "totalSpent": 12500.00
}
```

---

## Projects

### POST `/api/client/create-project`

Create a new project.

**Request body:**

```json
{
  "clientId": "64f2...",
  "title": "E-commerce Platform",
  "summary": "Build a full-stack e-commerce platform with cart and payments",
  "objectives": "Deliver a scalable, mobile-friendly shopping platform",
  "scope": "Frontend UI, backend API, product catalog, cart, checkout",
  "skills": ["React", "Node.js", "MongoDB"],
  "deliverables": ["Product listing page", "Shopping cart", "Checkout flow"],
  "tasks": ["Design DB schema", "Build REST API", "Implement React UI"],
  "outOfScope": ["Payment gateway integration", "Mobile app"],
  "budget": 5000,
  "paymentType": "fixed",
  "startDate": "2026-05-01",
  "endDate": "2026-07-01",
  "milestones": [
    { "name": "Design & DB Schema", "dueDate": "2026-05-15" },
    { "name": "Backend API", "dueDate": "2026-06-01" },
    { "name": "Frontend UI", "dueDate": "2026-06-20" },
    { "name": "Testing & Launch", "dueDate": "2026-07-01" }
  ]
}
```

**Validation rules enforced by `ProjectValidator`:**

| Rule | Constraint |
|------|------------|
| Title | Minimum 5 characters |
| Summary | Minimum 20 characters |
| Deliverables | At least 1 required |
| Dates | `startDate` must be before `endDate` |
| Budget | Must be greater than 0 |

**Response `200 OK`:** Created project document with `_id` and `status: "Open"`

**Response `400 Bad Request`:** Validation error message

---

### GET `/api/client/projects?userId={id}`

Get all projects for a client (team-aware — includes team leader's projects).

**Response `200 OK`:** Array of project documents

---

### GET `/api/marketplace?search={query}&skills={skill1,skill2}&minBudget={n}&maxBudget={n}`

Get all Open projects. All query parameters are optional.

**Response `200 OK`:**

```json
[
  {
    "_id": "64f3...",
    "title": "E-commerce Platform",
    "summary": "...",
    "skills": ["React", "Node.js"],
    "budget": 5000,
    "paymentType": "fixed",
    "startDate": "2026-05-01",
    "endDate": "2026-07-01",
    "status": "Open",
    "clientId": "64f2...",
    "clientReliabilityScore": 82
  }
]
```

---

## Bids

### POST `/api/bids/submit`

Submit a bid on a project.

**Request body:**

```json
{
  "projectId": "64f3...",
  "freelancerId": "64f1...",
  "bidAmount": 4500,
  "proposal": "I have 3 years of React experience and have built similar e-commerce platforms...",
  "proposalQuality": 4
}
```

**Response `200 OK`:** Scored bid document

```json
{
  "_id": "64f4...",
  "projectId": "64f3...",
  "freelancerId": "64f1...",
  "bidAmount": 4500,
  "proposal": "...",
  "proposalQuality": 4,
  "compositeScore": 78,
  "scoreBreakdown": {
    "reliability": 85,
    "budgetFit": 90,
    "experienceMatch": 75,
    "completionRate": 70,
    "proposalQuality": 80
  },
  "status": "Pending",
  "submittedAt": "2026-04-18T10:30:00Z"
}
```

**Response `400 Bad Request`:** `{ "error": "You have already submitted a bid for this project" }`

---

### GET `/api/bids/project?projectId={id}`

Get all bids for a project, sorted by `compositeScore` descending.

**Response `200 OK`:** Array of scored bid documents

---

### GET `/api/bids/count?projectId={id}`

Get the number of bids submitted for a project.

**Response `200 OK`:** `{ "count": 7 }`

---

### POST `/api/bids/accept`

Accept a bid and start the project.

**Request body:**

```json
{
  "bidId": "64f4...",
  "projectId": "64f3...",
  "freelancerId": "64f1..."
}
```

**Response `200 OK`:** `{ "message": "Bid accepted. Project is now In Progress." }`

Side effects:
- Accepted bid status → `"Accepted"`
- All other bids for the project → `"Rejected"`
- Project status → `"In Progress"`
- `assignedFreelancerId` set on project document

---

### PUT `/api/bids/weights`

Update scoring weights for a project and rescore all existing bids.

**Request body:**

```json
{
  "projectId": "64f3...",
  "weights": {
    "reliability": 20,
    "budgetFit": 30,
    "experienceMatch": 30,
    "completionRate": 10,
    "proposalQuality": 10
  }
}
```

Weights must sum to 100.

**Response `200 OK`:** Array of all rescored bids for the project

---

### GET `/api/bids/weights?projectId={id}`

Get current scoring weights for a project.

**Response `200 OK`:** Weight object (returns defaults if no custom weights set)

---

## Milestones

### PUT `/api/freelancer/milestone/complete`

Mark a milestone as complete (pending client approval).

**Request body:**

```json
{
  "projectId": "64f3...",
  "milestoneIndex": 0
}
```

**Response `200 OK`:** Updated project document. The milestone at the given index will have `pendingApproval: true`.

---

### PUT `/api/client/milestone/approve`

Approve or reject a milestone (Team Leader only).

**Request body:**

```json
{
  "projectId": "64f3...",
  "milestoneIndex": 0,
  "approved": true
}
```

Set `"approved": false` to reject.

**Response `200 OK`:** Updated project document.

On approval: `completed: true`, `approved: true`, `pendingApproval: false`  
On rejection: `pendingApproval: false` (reverts to pending)

---

### POST `/api/freelancer/project/upload-srs`

Upload an SRS document for a project.

**Request:** `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `file` | File | PDF or DOCX, max 20MB |
| `projectId` | String | Target project ID |
| `freelancerId` | String | Uploader's user ID |

**Response `200 OK`:** `{ "message": "SRS uploaded successfully", "path": "..." }`

---

### GET `/api/client/project/srs?projectId={id}`

Get the SRS document reference for a project.

**Response `200 OK`:** `{ "srsPath": "uploads/srs/..." }`

---

## Invoices

### POST `/api/freelancer/invoice/generate`

Generate an invoice after milestone approval.

**Request body:**

```json
{
  "projectId": "64f3...",
  "freelancerId": "64f1...",
  "clientId": "64f2...",
  "milestoneIndex": 0,
  "amount": 1250.00
}
```

**Response `200 OK`:** Created invoice document

```json
{
  "_id": "64f5...",
  "projectId": "64f3...",
  "freelancerId": "64f1...",
  "clientId": "64f2...",
  "milestoneIndex": 0,
  "amount": 1250.00,
  "status": "Pending",
  "dateIssued": "2026-04-18T12:00:00Z",
  "approvedDate": null,
  "paidDate": null
}
```

---

### PUT `/api/client/invoice/approve`

Approve an invoice (Team Leader only). Status changes to `"Approved"`.

**Request body:**

```json
{
  "invoiceId": "64f5...",
  "approved": true
}
```

Set `"approved": false` to reject.

---

### PUT `/api/client/invoice/pay`

Mark an invoice as paid (Project Manager). Status changes to `"Paid"` and `paidDate` is recorded.

**Request body:**

```json
{
  "invoiceId": "64f5..."
}
```

**Response `200 OK`:** Updated invoice with `status: "Paid"` and `paidDate` timestamp

---

### GET `/api/freelancer/invoices?userId={id}`

Get all invoices for a freelancer with payment summaries.

**Response `200 OK`:**

```json
{
  "invoices": [ ... ],
  "totalPaid": 4500.00,
  "totalPending": 1200.00,
  "overdueCount": 0
}
```

---

### GET `/api/client/invoices?userId={id}`

Get all team-aware invoices for a client with totals.

---

### GET `/api/invoices?userId={id}`

Get raw invoice list for a freelancer.

---

## Team

### GET `/api/team/client-ids?teamLeaderName={name}`

Get all user IDs belonging to the same team (same `teamLeaderName`).

**Response `200 OK`:** `["64f2...", "64f6..."]`

Used internally by team-aware queries in `ClientTabsController` and `MilestoneInvoiceController`.

---

## Admin

### POST `/api/admin/patch-user`

Add or update `orgRole` and `teamLeaderName` on an existing user. Used for migrating users created before these fields existed.

**Request body:**

```json
{
  "email": "marcus@acme.com",
  "orgRole": "team_leader",
  "teamLeaderName": ""
}
```

**Response `200 OK`:** Patched user document

---

### GET `/api/admin/user-info?email={email}`

Get a user's `orgRole`, `teamLeaderName`, and `_id` by email.

**Response `200 OK`:**

```json
{
  "_id": "64f2...",
  "orgRole": "team_leader",
  "teamLeaderName": ""
}
```

---

## Error Responses

All endpoints follow a consistent error format:

```json
{
  "error": "Human-readable error message",
  "status": 400
}
```

| HTTP Status | Meaning |
|-------------|---------|
| `200 OK` | Success |
| `400 Bad Request` | Validation error or invalid input |
| `401 Unauthorized` | Invalid credentials |
| `404 Not Found` | Resource not found |
| `500 Internal Server Error` | Unexpected server error |
