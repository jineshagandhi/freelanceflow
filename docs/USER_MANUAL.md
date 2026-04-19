# User Manual

FreelanceFlow supports two distinct user roles: **Freelancer** and **Client**. This manual covers every workflow available to each role.

---

## Table of Contents

- [Getting Started](#getting-started)
  - [Registration](#registration)
  - [Login](#login)
- [Freelancer Guide](#freelancer-guide)
  - [Dashboard](#freelancer-dashboard)
  - [Browsing the Marketplace](#browsing-the-marketplace)
  - [Submitting a Bid](#submitting-a-bid)
  - [Managing Active Projects](#managing-active-projects)
  - [Completing Milestones](#completing-milestones)
  - [Generating Invoices](#generating-invoices)
  - [Viewing Client Reliability](#viewing-client-reliability)
  - [Managing Your Profile](#freelancer-profile)
- [Client Guide](#client-guide)
  - [Dashboard](#client-dashboard)
  - [Creating a Project](#creating-a-project)
  - [Reviewing Bids](#reviewing-bids)
  - [Customizing Scoring Weights](#customizing-scoring-weights)
  - [Accepting a Freelancer](#accepting-a-freelancer)
  - [Approving Milestones](#approving-milestones)
  - [Invoice Management](#invoice-management)
  - [Team Collaboration](#team-collaboration)
  - [Managing Your Profile](#client-profile)

---

## Getting Started

### Registration

1. Open FreelanceFlow at the application URL
2. Click **Get Started** on the landing page
3. On the Auth page, click the **Sign Up** tab
4. Enter your **Full Name**, **Email**, and **Password**
5. Select your **Role**: Freelancer or Client

**Freelancer — additional fields:**

| Field | Description |
|-------|-------------|
| Profession | Your job title (e.g., "Full Stack Developer") |
| Headline | Short professional tagline |
| Skills | Comma-separated list of skills (e.g., "React, Java, MongoDB") |
| Education | Highest qualification |
| Location | City or country |
| Contact Info | Phone number or alternate email |

**Client — additional fields:**

| Field | Description |
|-------|-------------|
| Business Name | Your company or organization name |
| Location | City or country |
| Contact Info | Phone or alternate email |
| Org Role | Select **Team Leader** or **Project Manager** |
| Team Leader Name | *Project Managers only* — enter your team leader's name to share project visibility |

6. Click **Create Account** — you are redirected to your role-specific dashboard

### Login

1. On the Auth page, click the **Login** tab
2. Enter your **Email**, **Password**, and select your **Role**
3. Click **Sign In**

> If you select the wrong role at login, authentication will fail even with correct credentials.

---

## Freelancer Guide

### Freelancer Dashboard

The Dashboard is your home screen showing a real-time overview of your freelance activity.

**Stats Cards:**

| Card | Description |
|------|-------------|
| Total Earnings | Sum of all paid invoices |
| Pending Payments | Sum of invoices with "Approved" or "Pending" status |
| Active Projects | Number of projects currently "In Progress" |
| Overdue Invoices | Invoices unpaid beyond 30 days |

**Earnings History Chart:**
- Bar/line chart showing income by month from paid invoices
- Rendered with Recharts

**Risk Alerts:**
- Projects with approaching deadline dates are flagged
- Estimated next-month income based on active milestone progress

---

### Browsing the Marketplace

1. Click **Marketplace** in the left navigation
2. All projects with status **Open** are listed
3. Use the search bar to filter by:
   - Keyword (title, description)
   - Required skills
   - Budget range
4. Click a project card to expand full details:
   - Objectives, scope, deliverables, tasks
   - Out-of-scope items
   - Required skills and budget
   - Timeline and milestones

---

### Submitting a Bid

1. On any Open project, click **Submit Bid**
2. Fill in the bid form:

| Field | Description |
|-------|-------------|
| Bid Amount | Your proposed price in USD |
| Proposal | Your pitch — explain your approach and qualifications |
| Proposal Quality | Self-rate your proposal from 1 (weak) to 5 (excellent) |

3. Click **Submit**

The system immediately scores your bid using the **BidScoringEngine**:

| Metric | Weight | How it's computed |
|--------|--------|-------------------|
| Reliability | 30% | Based on your payment and milestone history |
| Budget Fit | 25% | How close your bid is to the project budget |
| Experience Match | 20% | Overlap between your skills and required skills |
| Completion Rate | 15% | % of your past projects completed successfully |
| Proposal Quality | 10% | Your self-rated score (1–5) |

Your composite score (0–100) is visible to the client alongside per-metric breakdowns.

> You can only submit **one bid per project**. The system prevents duplicate submissions.

---

### Managing Active Projects

Once a client accepts your bid:

1. Navigate to **My Projects** → **Active Projects**
2. Each active project card shows:
   - Project title and client
   - Overall milestone progress bar
   - List of milestones with due dates and statuses

**Milestone statuses:**

| Status | Meaning |
|--------|---------|
| Pending | Not yet started or in progress |
| Pending Approval | You marked it complete, awaiting client review |
| Approved | Client confirmed completion |
| Rejected | Client rejected — rework required |

---

### Completing Milestones

1. When you finish work on a milestone, click **Mark Complete** on that milestone card
2. The milestone status changes to **Pending Approval**
3. The client's team leader is notified to review
4. Wait for approval — you will see the status update on your next page load

If rejected, the client may leave feedback. Address the issues and click **Mark Complete** again to resubmit.

**Uploading an SRS Document:**

1. Click **Upload SRS** on the project card
2. Select your SRS file (PDF or DOCX, max 20MB)
3. The document is stored and the client can view it at any time

---

### Generating Invoices

Invoices can only be generated after at least one milestone is **Approved**.

1. Navigate to **Invoices** in the left navigation
2. Click **Generate Invoice** next to an approved milestone
3. The invoice is created with status **Pending** and sent to the client

**Invoice lifecycle:**

```
Generated → Pending → Approved (by team leader) → Paid (by project manager)
```

Track all your invoices in the Invoices list — each shows:
- Project name and milestone
- Invoice amount
- Current status
- Issue date and payment date (once paid)

Paid invoices are included in your **Total Earnings** and appear in the dashboard earnings chart.

---

### Viewing Client Reliability

Before submitting a bid, you can check a client's reliability profile:

1. Navigate to **Clients** in the left navigation
2. For each client you have worked with:

| Field | Description |
|-------|-------------|
| Reliability Score | 0–100 computed by AnalyticsEngine |
| Avg Payment Delay | Average days from invoice approval to payment |
| Overdue Invoice Count | Invoices that exceeded 30 days without payment |
| Active Project Count | Current active engagements |

> Client profiles are only visible for clients you have interacted with (bid accepted, invoice paid, etc.)

---

### Freelancer Profile

1. Click **Profile** in the navigation
2. Edit any field:
   - Name, Email, Location, Contact Info
   - Profession, Headline
   - Skills (comma-separated)
   - Education
   - Avatar / profile photo

3. Click **Save** to update

---

## Client Guide

### Client Dashboard

The Dashboard provides a team-aware overview aggregated across all team members sharing the same `teamLeaderName`.

**Stats Cards:**

| Card | Description |
|------|-------------|
| Total Projects | All projects created by you or your team |
| Active Projects | Projects currently "In Progress" |
| Amount Due | Sum of pending + approved invoices |
| Total Spent | Sum of all paid invoices |

---

### Creating a Project

1. Click **Create Project** from the dashboard or Projects page
2. Complete the 6-step form:

**Step 1 — Basic Info**
- Title (minimum 5 characters)
- Summary / description (minimum 20 characters)

**Step 2 — Scope**
- Objectives: what the project aims to achieve
- Deliverables: list of expected outputs (at least one required)
- Tasks: specific work items
- Out-of-Scope: items explicitly excluded (prevents scope creep)

**Step 3 — Skills Required**
- Add required freelancer skills as tags
- These are used by the BidScoringEngine for Experience Match scoring

**Step 4 — Budget**
- Budget amount in USD (must be greater than 0)
- Payment type: **Fixed** or **Hourly**

**Step 5 — Timeline**
- Start Date and End Date
- Start date must be before end date

**Step 6 — Milestones**
- Review auto-generated milestones based on your timeline
- Add, edit, or remove milestones
- Each milestone needs a name and due date

3. Click **Publish** — the project appears in the Marketplace as **Open**

---

### Reviewing Bids

1. Navigate to **Projects** and click on a published project
2. Click **View Bids**
3. Bids are ranked by composite score (highest first)
4. For each bid you can see:
   - Freelancer name and headline
   - Composite score (0–100)
   - Per-metric breakdown bars
   - Bid amount and proposal text
   - Proposal quality self-rating

---

### Customizing Scoring Weights

You can adjust the relative importance of each scoring metric for your specific project:

1. On the bid ranking page, find the **Weight Customization** panel
2. Adjust sliders for each metric — the percentages must total 100%
3. Click **Update Weights**

> All existing bids are **immediately rescored** using the new weights. The ranking updates in real time.

**Default weights:**

| Metric | Default Weight |
|--------|---------------|
| Reliability | 30% |
| Budget Fit | 25% |
| Experience Match | 20% |
| Completion Rate | 15% |
| Proposal Quality | 10% |

---

### Accepting a Freelancer

1. Review bids and select the one you want to award
2. Click **Accept** on that bid
3. The system:
   - Sets bid status to **Accepted**, all others to **Rejected**
   - Sets project status to **In Progress**
   - Assigns the freelancer to the project
4. The freelancer's Active Projects list updates to include your project

---

### Approving Milestones

*This action is available to **Team Leaders** only.*

1. Navigate to **Projects** → open the active project
2. Milestones marked complete by the freelancer show a **Pending Approval** badge
3. Review the work and:
   - Click **Approve** — milestone status → Approved; freelancer can now generate an invoice
   - Click **Reject** — milestone reverts to Pending; freelancer receives it back for rework

---

### Invoice Management

**Approving Invoices (Team Leader):**

1. Navigate to **Payment History**
2. Pending invoices are listed with project, freelancer, milestone, and amount
3. Click **Approve Invoice** — status changes to **Approved**

**Processing Payments (Project Manager):**

1. Navigate to **Payment History** — Approved invoices are visible
2. Click **Mark Paid** — status changes to **Paid** with the current date recorded
3. The freelancer's earnings and dashboard chart update immediately

---

### Team Collaboration

FreelanceFlow supports a two-person team structure within a client organization:

| Role | Permissions |
|------|-------------|
| **Team Leader** | Create projects, view all team projects, approve milestones, approve invoices |
| **Project Manager** | View all team projects, view all invoices, process payments (Mark Paid) |

**Setting up team visibility:**

When a Project Manager registers, they enter the **Team Leader Name** in their profile. The system matches this string (case-insensitive) to find the team leader's account and grants shared visibility to all projects and invoices created by the team leader.

> Both team members can view the same projects and invoices without sharing login credentials.

**Updating team leader link:**

1. Go to **Profile**
2. Update the **Team Leader Name** field
3. Save — shared visibility updates immediately

---

### Client Profile

1. Click **Profile** in the navigation
2. Edit any field:
   - Name, Business Name, Location, Contact Info
   - Org Role (Team Leader / Project Manager)
   - Team Leader Name (Project Managers only)
   - Avatar

3. Click **Save** to update

> Changing Org Role from Project Manager to Team Leader will remove team sharing with any existing team leader.
