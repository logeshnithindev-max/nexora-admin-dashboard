import {
  AddIcon,
  BillingIcon,
  ClientsIcon,
  DashboardIcon,
  EventsIcon,
  PlansIcon,
  MasterIcon,
  // UsageIcon,
} from "../app/icons";

const today = new Date().toISOString().slice(0, 10);

export const workspaceInitial = {
  clientId: "",
  clientName: "",
  projectName: "",
  mode: "live",
  provider: "shopify",
  category: "growth",
  origins: "",
  adminName: "",
  adminEmail: "",
  planId: "",
  subscriptionStatus: "trial",
  trialEnd: "",
  sendMail: true,
};

export const nav = [
  ["overview", DashboardIcon],
  ["onboarding", AddIcon],
  ["clients", ClientsIcon],
  ["events", EventsIcon],
  ["plans", PlansIcon],
  ["billing", BillingIcon],
  ["master", MasterIcon],
  // ["usage", UsageIcon],
];

export { today };
