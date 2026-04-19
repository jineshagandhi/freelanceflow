# Code Directory Structure

Fully annotated directory tree of all source files in the FreelanceFlow repository.  
Build artifacts (`target/`, `node_modules/`, `dist/`) are excluded by `.gitignore`.

```
freelanceflow/
│
├── Dockerfile                          # Multi-stage Docker build (3 stages)
│                                       # Stage 1: node:20-alpine (React build)
│                                       # Stage 2: maven:3.9-eclipse-temurin-21 (JAR build)
│                                       # Stage 3: eclipse-temurin:21-jre-alpine (runtime)
│
├── .dockerignore                       # Excludes node_modules/, target/, .git/ from build context
├── .gitignore                          # Excludes build artifacts and IDE files
├── .gitattributes                      # Line-ending normalization for cross-platform dev
│
├── pom.xml                             # Maven build descriptor
│                                       # Java 21, Spring Boot 4.0.3, Spring Data MongoDB
│                                       # Lombok, Maven Surefire (tests)
│
├── mvnw                                # Maven wrapper script (Unix/Linux/Mac)
├── mvnw.cmd                            # Maven wrapper script (Windows)
│
├── HELP.md                             # Spring Boot getting-started reference (auto-generated)
├── README.md                           # Main project documentation
│
├── docs/                               # Project documentation
│   ├── USER_MANUAL.md                  # Step-by-step guide for Freelancers and Clients
│   ├── DEPLOYMENT.md                   # Docker + Render.com + MongoDB Atlas guide
│   ├── API_REFERENCE.md                # All REST endpoints with request/response details
│   ├── DATABASE_SCHEMA.md              # MongoDB collection schemas (all 5 collections)
│   ├── ARCHITECTURE.md                 # System design, module breakdown, data flow
│   └── CODE_STRUCTURE.md              # This file
│
├── .mvn/
│   └── wrapper/
│       └── maven-wrapper.properties    # Specifies Maven version for the wrapper
│
│
├── src/
│   ├── main/
│   │   ├── java/com/freelanceflow/
│   │   │   │
│   │   │   ├── backend/
│   │   │   │   └── FreelanceflowApplication.java
│   │   │   │       # @SpringBootApplication entry point
│   │   │   │       # Bootstraps Spring context, enables MongoDB auto-configuration
│   │   │   │
│   │   │   ├── controller/
│   │   │   │   │   # REST controllers and business logic engines
│   │   │   │   │
│   │   │   │   ├── AuthController.java
│   │   │   │   │   # Login business logic (credential validation)
│   │   │   │   │   # Called by UserRestController.login()
│   │   │   │   │
│   │   │   │   ├── SignupController.java
│   │   │   │   │   # POST /api/auth/signup
│   │   │   │   │   # Handles dual-role registration (freelancer + client)
│   │   │   │   │   # Sets orgRole and teamLeaderName for client accounts
│   │   │   │   │
│   │   │   │   ├── UserRestController.java
│   │   │   │   │   # POST /api/auth/login
│   │   │   │   │   # GET  /api/freelancer/dashboard (earnings, risk, forecast)
│   │   │   │   │   # GET  /api/invoices
│   │   │   │   │   # Delegates analytics computation to AnalyticsEngine
│   │   │   │   │
│   │   │   │   ├── ProfileController.java
│   │   │   │   │   # GET/PUT /api/freelancer/profile
│   │   │   │   │   # GET/PUT /api/client/profile
│   │   │   │   │   # PUT /api/client/profile auto-links team leader for project_managers
│   │   │   │   │
│   │   │   │   ├── AdminPatchController.java
│   │   │   │   │   # POST /api/admin/patch-user
│   │   │   │   │   # GET  /api/admin/user-info
│   │   │   │   │   # Migration endpoint: adds orgRole/teamLeaderName to legacy users
│   │   │   │   │
│   │   │   │   ├── BidController.java
│   │   │   │   │   # POST /api/bids/submit  — calls BidScoringEngine on submission
│   │   │   │   │   # GET  /api/bids/project — bids sorted by compositeScore DESC
│   │   │   │   │   # GET  /api/bids/count
│   │   │   │   │   # POST /api/bids/accept  — assigns freelancer + sets In Progress
│   │   │   │   │   # PUT  /api/bids/weights — saves custom weights, rescores all bids
│   │   │   │   │   # GET  /api/bids/weights
│   │   │   │   │
│   │   │   │   ├── FreelancerTabsController.java
│   │   │   │   │   # GET /api/marketplace          — Open projects with client risk scores
│   │   │   │   │   # GET /api/freelancer/projects  — Assigned projects with milestone progress
│   │   │   │   │   # GET /api/freelancer/invoices  — Invoices with payment status summaries
│   │   │   │   │   # GET /api/freelancer/my-clients — Clients with reliability scores
│   │   │   │   │
│   │   │   │   ├── ClientTabsController.java
│   │   │   │   │   # GET  /api/client/dashboard-summary — team-aggregated stats
│   │   │   │   │   # POST /api/client/create-project    — calls ProjectValidator first
│   │   │   │   │   # GET  /api/client/projects          — team-aware project listing
│   │   │   │   │   # GET  /api/client/invoices          — team-aware invoice listing
│   │   │   │   │
│   │   │   │   ├── MilestoneInvoiceController.java
│   │   │   │   │   # PUT  /api/freelancer/milestone/complete  — sets pendingApproval=true
│   │   │   │   │   # POST /api/freelancer/project/upload-srs  — multipart file upload
│   │   │   │   │   # POST /api/freelancer/invoice/generate    — creates invoice document
│   │   │   │   │   # PUT  /api/client/milestone/approve       — approve or reject
│   │   │   │   │   # GET  /api/client/project/srs             — get SRS file path
│   │   │   │   │   # PUT  /api/client/invoice/approve         — team_leader approves
│   │   │   │   │   # PUT  /api/client/invoice/pay             — project_manager marks paid
│   │   │   │   │
│   │   │   │   ├── TeamController.java
│   │   │   │   │   # GET /api/team/client-ids
│   │   │   │   │   # Finds all user IDs sharing the same teamLeaderName
│   │   │   │   │   # Used internally for team-aware project and invoice queries
│   │   │   │   │
│   │   │   │   ├── SpaController.java
│   │   │   │   │   # Maps all frontend routes (/auth, /freelancer/*, /client/*)
│   │   │   │   │   # to forward:/index.html for React Router to handle
│   │   │   │   │
│   │   │   │   ├── AnalyticsEngine.java
│   │   │   │   │   # calculateReliabilityScore(freelancerId) → int 0-100
│   │   │   │   │   # predictDeadlineRisk(freelancerId) → List<RiskAlert>
│   │   │   │   │   # predictNextMonthIncome(freelancerId) → double
│   │   │   │   │   # All methods are pure rule-based (no ML)
│   │   │   │   │
│   │   │   │   ├── ProjectService.java
│   │   │   │   │   # Coordinates project creation flow
│   │   │   │   │   # Called by ClientTabsController.createProject()
│   │   │   │   │
│   │   │   │   ├── ProjectRepository.java
│   │   │   │   │   # MongoDB repository interface for Project documents
│   │   │   │   │   # Used by ProjectService
│   │   │   │   │
│   │   │   │   ├── ProjectValidator.java
│   │   │   │   │   # Server-side validation for project creation
│   │   │   │   │   # Rules: title>=5, summary>=20, deliverables.length>=1,
│   │   │   │   │   #        startDate<endDate, budget>0
│   │   │   │   │   # Returns error message or null if valid
│   │   │   │   │
│   │   │   │   └── InvoiceDAO.java
│   │   │   │       # CRUD operations for the invoices collection
│   │   │   │       # getInvoicesForFreelancer(), getInvoicesForProject()
│   │   │   │       # createInvoice(), updateInvoiceStatus()
│   │   │   │
│   │   │   ├── dao/
│   │   │   │   │   # Data Access Objects using MongoDB Java Driver directly (no ORM)
│   │   │   │   │   # Each DAO injects MongoClient and queries the freelanceflow database
│   │   │   │   │
│   │   │   │   ├── BidDAO.java
│   │   │   │   │   # saveBid(Document) — insert bid
│   │   │   │   │   # hasFreelancerBid(projectId, freelancerId) — duplicate check
│   │   │   │   │   # getBidsForProject(projectId) — sorted by compositeScore DESC
│   │   │   │   │   # updateBidScore(bidId, score, breakdown) — for rescore on weight change
│   │   │   │   │   # acceptBid(bidId) / rejectBid(bidId)
│   │   │   │   │
│   │   │   │   ├── ClientDAO.java
│   │   │   │   │   # upsertClientRecord(freelancerId, clientId, metrics)
│   │   │   │   │   # getClientsForFreelancer(freelancerId)
│   │   │   │   │   # Updates avgPaymentDelayDays, overdueInvoiceCount when invoices are paid
│   │   │   │   │
│   │   │   │   └── ProjectDAO.java
│   │   │   │       # saveProject(Document) — insert project
│   │   │   │       # getProjectById(id)
│   │   │   │       # getProjectsByClientId(clientId)
│   │   │   │       # assignFreelancerToProject(projectId, freelancerId)
│   │   │   │       # updateProjectStatus(projectId, status)
│   │   │   │       # updateMilestone(projectId, milestoneIndex, fields)
│   │   │   │
│   │   │   ├── model/
│   │   │   │   │   # POJOs for MongoDB document mapping
│   │   │   │   │
│   │   │   │   ├── UserModel.java
│   │   │   │   │   # Fields: id, name, email, password, role, profession, headline,
│   │   │   │   │   #         skills, education, businessName, orgRole, teamLeaderName,
│   │   │   │   │   #         location, contactInfo, avatar
│   │   │   │   │
│   │   │   │   ├── Project.java
│   │   │   │   │   # Fields: all project fields including List<Map> milestones
│   │   │   │   │   # Used with ProjectRepository
│   │   │   │   │
│   │   │   │   ├── BidModel.java
│   │   │   │   │   # Fields: id, projectId, freelancerId, bidAmount, proposal,
│   │   │   │   │   #         proposalQuality, compositeScore, scoreBreakdown, status
│   │   │   │   │
│   │   │   │   └── LoginRequest.java
│   │   │   │       # DTO: email, password, role
│   │   │   │       # Used by UserRestController.login()
│   │   │   │
│   │   │   └── scoring/
│   │   │       └── BidScoringEngine.java
│   │   │           # calculateBidScore(bid, project, freelancerHistory, weights) → double
│   │   │           # computeReliability() — from ClientDAO data
│   │   │           # computeBudgetFit()   — bidAmount / projectBudget ratio
│   │   │           # computeExperienceMatch() — skill set intersection
│   │   │           # computeCompletionRate() — from InvoiceDAO / ProjectDAO history
│   │   │
│   │   └── resources/
│   │       ├── application.properties
│   │       │   # spring.application.name=freelanceflow
│   │       │   # spring.data.mongodb.uri=${MONGODB_URI:mongodb://localhost:27017/freelanceflow}
│   │       │   # server.port=${PORT:8080}
│   │       │   # spring.servlet.multipart.max-file-size=20MB
│   │       │
│   │       ├── static/                 # Compiled React SPA output (served by Spring Boot)
│   │       │   ├── index.html          # SPA entry point (React injects into <div id="root">)
│   │       │   └── assets/
│   │       │       ├── index-*.js      # Bundled JavaScript (Vite content-hash filename)
│   │       │       └── index-*.css     # Bundled CSS (Vite content-hash filename)
│   │       │
│   │       └── templates/              # Empty — no server-side templates (SPA pattern)
│   │
│   └── test/
│       ├── java/com/freelanceflow/backend/
│       │   └── FreelanceflowApplicationTests.java
│       │       # @SpringBootTest context load test
│       │       # Verifies application context starts without errors
│       └── resources/                  # Empty test resources
│
│
└── frontend/                           # React + TypeScript + Vite frontend source
    │
    ├── index.html                      # Vite entry HTML — contains <div id="root">
    ├── main.tsx                        # React entry: ReactDOM.createRoot().render(<App/>)
    ├── App.tsx                         # Root component wrapping AppContext + RouterProvider
    ├── routes.tsx                      # React Router 7 route definitions (all app routes)
    ├── AppContext.tsx                  # Auth state context (userId, name, role, orgRole, teamLeaderName)
    ├── Auth.tsx                        # Login / signup page with role selector tabs
    ├── Landing.tsx                     # Public marketing landing page
    │
    ├── vite.config.ts                  # Vite config:
    │                                   # - dev proxy: /api/* → http://localhost:8080
    │                                   # - build output: ../src/main/resources/static
    │
    ├── package.json                    # npm dependencies:
    │                                   # react, react-dom, react-router-dom
    │                                   # @radix-ui/* (UI primitives)
    │                                   # recharts (charts)
    │                                   # tailwindcss, lucide-react
    │
    ├── tailwind.css                    # Tailwind CSS 4 directives and custom utilities
    ├── theme.css                       # CSS custom properties for design tokens
    ├── fonts.css                       # Web font imports
    ├── index.css                       # Global base styles
    │
    ├── ATTRIBUTIONS.md                 # Open-source attribution:
    │                                   # shadcn/ui (MIT License)
    │                                   # Unsplash photos
    │
    ├── client/                         # Client-role page components
    │   ├── ClientDashboard.tsx         # Stats cards, team-aggregated summary
    │   ├── ClientProjects.tsx          # Project list, milestone approval/reject controls
    │   ├── CreateProject.tsx           # 6-step project creation form
    │   ├── ProjectBidding.tsx          # Ranked bid list with per-metric bars + weight sliders
    │   ├── BidModal.tsx                # Bid detail popup
    │   ├── ClientInvoices.tsx          # Invoice approval UI (team_leader actions)
    │   ├── ClientPaymentHistory.tsx    # Invoice payment UI (project_manager actions)
    │   └── ClientProfile.tsx           # Profile editor with orgRole and teamLeaderName fields
    │
    ├── freelancer/                     # Freelancer-role page components
    │   ├── Dashboard.tsx               # Recharts earnings chart, stats cards, risk alerts
    │   ├── Marketplace.tsx             # Open projects listing with search and filter
    │   ├── Projects.tsx                # Active project cards with milestone progress bars
    │   ├── FreelancerProjects.tsx      # Extended project management view
    │   ├── Invoices.tsx                # Invoice generation and status tracking
    │   ├── Clients.tsx                 # Client reliability profiles (score, delay, overdue)
    │   ├── BidModal.tsx                # Bid submission form (amount, proposal, quality rating)
    │   └── FreelancerProfile.tsx       # Profile editor with skills, profession, headline
    │
    └── components/
        ├── figma/
        │   └── ImageWithFallback.tsx   # <img> with graceful fallback placeholder
        │                               # Used for avatar images
        │
        ├── guards/
        │   └── AuthGuard.tsx           # Route guard component
        │                               # - Reads AppContext auth state
        │                               # - Redirects to /auth if not authenticated
        │                               # - Redirects to own dashboard if wrong role
        │
        ├── layout/
        │   ├── ClientLayout.tsx        # Client sidebar + top nav shell
        │   │                           # Navigation: Dashboard, Projects, Payments, Profile
        │   └── FreelancerLayout.tsx    # Freelancer sidebar + top nav shell
        │                               # Navigation: Dashboard, Marketplace, Projects,
        │                               #             Invoices, Clients, Profile
        │
        └── ui/                         # Radix UI + shadcn/ui component library
            │                           # 40+ accessible, unstyled primitive components
            │                           # Styled with Tailwind CSS utility classes
            │
            ├── accordion.tsx           # Expandable accordion
            ├── alert-dialog.tsx        # Accessible modal confirmation dialog
            ├── alert.tsx               # Inline alert message
            ├── avatar.tsx              # User avatar with fallback initials
            ├── badge.tsx               # Status badge / tag
            ├── button.tsx              # Button with variants (primary, outline, ghost)
            ├── card.tsx                # Card container with header/content/footer
            ├── checkbox.tsx            # Accessible checkbox
            ├── dialog.tsx              # Modal dialog
            ├── dropdown-menu.tsx       # Dropdown context menu
            ├── form.tsx                # Form field wrappers with validation support
            ├── input.tsx               # Text input field
            ├── label.tsx               # Form label
            ├── progress.tsx            # Progress bar (used for milestone completion)
            ├── select.tsx              # Dropdown select
            ├── table.tsx               # Data table
            ├── tabs.tsx                # Tabbed navigation
            ├── textarea.tsx            # Multi-line text input
            ├── tooltip.tsx             # Hover tooltip
            └── ...                     # (25+ additional Radix UI primitives)
```

---

## Key File Relationships

```
AppContext.tsx
    └── consumed by: Auth.tsx, AuthGuard.tsx, all page components

routes.tsx
    └── wraps all /freelancer/* and /client/* in AuthGuard

AuthGuard.tsx
    └── reads: AppContext
    └── renders: FreelancerLayout or ClientLayout (based on role)

BidController.java
    └── uses: BidDAO, BidScoringEngine, ProjectDAO

MilestoneInvoiceController.java
    └── uses: InvoiceDAO, ProjectDAO (via milestone array updates)

UserRestController.java
    └── uses: AuthController, AnalyticsEngine, InvoiceDAO

TeamController.java
    └── used by: ClientTabsController (project listing), MilestoneInvoiceController
```

---

## Build Outputs (gitignored)

| Path | Contents |
|------|---------|
| `target/` | Maven build output: `.class` files, fat JAR, test reports |
| `frontend/node_modules/` | npm package cache (~300MB) |
| `frontend/dist/` | Vite production build output (JS + CSS bundles) |
| `.settings/` | Eclipse IDE project settings |
| `.classpath`, `.project`, `.factorypath` | Eclipse project metadata |
