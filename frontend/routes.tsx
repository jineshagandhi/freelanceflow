import React from "react";
import { createBrowserRouter, Navigate } from "react-router";

import { Auth }                  from "./Auth";
import { Landing }               from "./Landing";
import { FreelancerLayout }      from "./components/layout/FreelancerLayout";
import { ClientLayout }          from "./components/layout/ClientLayout";
import { FreelancerDashboard }   from "./freelancer/Dashboard";
import { FreelancerMarketplace } from "./freelancer/Marketplace";
import { FreelancerProjects }    from "./freelancer/FreelancerProjects";
import { FreelancerInvoices }    from "./freelancer/Invoices";
import { FreelancerClients }     from "./freelancer/Clients";
import { FreelancerProfile }     from "./freelancer/FreelancerProfile";
import { ClientDashboard }       from "./client/ClientDashboard";
import { ClientCreateProject }   from "./client/CreateProject";
import { ClientProjects }        from "./client/ClientProjects";
import { ClientPaymentHistory }  from "./client/ClientPaymentHistory";
import { ProjectBidding }        from "./client/ProjectBidding";
import { ClientProfile }         from "./client/ClientProfile";

export const router = createBrowserRouter([
  { path: "/",     Component: Landing },
  { path: "/auth", Component: Auth    },

  {
    path: "/freelancer",
    Component: FreelancerLayout,
    children: [
      { index: true, element: <Navigate to="/freelancer/dashboard" replace /> },
      { path: "dashboard",   Component: FreelancerDashboard   },
      { path: "marketplace", Component: FreelancerMarketplace },
      { path: "projects",    Component: FreelancerProjects    },
      { path: "invoices",    Component: FreelancerInvoices    },
      { path: "clients",     Component: FreelancerClients     },
      { path: "profile",     Component: FreelancerProfile     },
    ],
  },

  {
    path: "/client",
    Component: ClientLayout,
    children: [
      { index: true, element: <Navigate to="/client/dashboard" replace /> },
      { path: "dashboard",      Component: ClientDashboard      },
      { path: "create-project", Component: ClientCreateProject  },
      { path: "projects",       Component: ClientProjects       },
      { path: "bidding",        Component: ProjectBidding       },
      { path: "payments",       Component: ClientPaymentHistory },
      { path: "profile",        Component: ClientProfile        },
    ],
  },

  { path: "*", element: <Navigate to="/" replace /> },
]);
