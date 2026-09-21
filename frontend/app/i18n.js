"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const messages = {
  en: {
    "nav.overview": "Overview",
    "nav.onboarding": "New workspace",
    "nav.clients": "Clients & projects",
    "nav.events": "Event schemas",
    "nav.plans": "Subscription plans",
    "nav.billing": "Billing",
    "nav.master": "Master",
    "nav.usage": "Usage & limits",
    "shell.help": "Need a hand?",
    "shell.helpText": "Open the operations guide or contact product.",
    "shell.guide": "Open guide",
    "shell.operations": "Operations",
    "shell.collapse": "Collapse menu",
    "shell.expand": "Expand menu",
    "shell.language": "العربية",
    "overview.tag": "LIVE OPERATIONS",
    "overview.title": "Your business, at a glance.",
    "overview.copy":
      "Commercial performance and workspace health across Nexora.",
    "overview.create": "Create workspace",
    "onboarding.tag": "WORKSPACE BUILDER",
    "onboarding.title": "Launch a client without the busywork.",
    "onboarding.copy":
      "Client, project, provider schema, databases and access in one guided flow.",
    "clients.tag": "ACCOUNTS",
    "clients.title": "Clients & projects.",
    "clients.copy":
      "Create workspaces through onboarding; edit or safely deactivate them here.",
    "events.tag": "TENANT SCHEMA",
    "events.title": "Events, properties & rules.",
    "events.copy":
      "Manage the schema inside each client's isolated MySQL workspace.",
    "plans.tag": "COMMERCIAL CATALOG",
    "plans.title": "Subscription plans.",
    "plans.copy":
      "Create standard or custom plans with global and channel-level limits.",
    "billing.tag": "REVENUE OPERATIONS",
    "billing.title": "Billing & approvals.",
    "billing.copy":
      "Create, edit, approve, reject or void invoices with flexible line items.",
    "usage.tag": "RESOURCE MONITOR",
    "usage.title": "Usage before it becomes overage.",
    "usage.copy": "Latest global and channel measurements for every client.",
  },
  ar: {
    "nav.overview": "نظرة عامة",
    "nav.onboarding": "مساحة عمل جديدة",
    "nav.clients": "العملاء والمشاريع",
    "nav.events": "مخططات الأحداث",
    "nav.plans": "خطط الاشتراك",
    "nav.billing": "الفواتير",
    "nav.usage": "الاستخدام والحدود",
    "shell.help": "هل تحتاج مساعدة؟",
    "shell.helpText": "افتح دليل العمليات أو تواصل مع فريق المنتج.",
    "shell.guide": "فتح الدليل",
    "shell.operations": "العمليات",
    "shell.collapse": "طي القائمة",
    "shell.expand": "توسيع القائمة",
    "shell.language": "English",
    "overview.tag": "العمليات المباشرة",
    "overview.title": "أعمالك في لمحة.",
    "overview.copy": "الأداء التجاري وصحة مساحات العمل في نكسورا.",
    "overview.create": "إنشاء مساحة عمل",
    "onboarding.tag": "منشئ مساحة العمل",
    "onboarding.title": "أطلق عميلاً دون خطوات معقدة.",
    "onboarding.copy":
      "العميل والمشروع ومخطط المزود وقواعد البيانات والصلاحيات في مسار واحد.",
    "clients.tag": "الحسابات",
    "clients.title": "العملاء والمشاريع.",
    "clients.copy": "أنشئ مساحات العمل وعدّلها أو عطّلها بأمان.",
    "events.tag": "مخطط العميل",
    "events.title": "الأحداث والخصائص والقواعد.",
    "events.copy": "إدارة المخطط داخل قاعدة بيانات MySQL المعزولة لكل عميل.",
    "plans.tag": "الكتالوج التجاري",
    "plans.title": "خطط الاشتراك.",
    "plans.copy": "إنشاء خطط قياسية أو مخصصة بحدود عامة وحدود لكل قناة.",
    "billing.tag": "عمليات الإيرادات",
    "billing.title": "الفواتير والموافقات.",
    "billing.copy":
      "إنشاء الفواتير وتعديلها والموافقة عليها أو رفضها وإلغاؤها.",
    "usage.tag": "مراقبة الموارد",
    "usage.title": "الاستخدام قبل تجاوز الحد.",
    "usage.copy": "أحدث قياسات الاستخدام العامة ولكل قناة لجميع العملاء.",
  },
};
const I18nContext = createContext({
  locale: "en",
  t: (key) => key,
  toggle: () => {},
});
export function I18nProvider({ children }) {
  const [locale, setLocale] = useState("en");
  useEffect(() => {
    const saved = localStorage.getItem("nexora-admin-locale");
    if (saved === "ar") setLocale("ar");
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    localStorage.setItem("nexora-admin-locale", locale);
  }, [locale]);
  const value = useMemo(
    () => ({
      locale,
      t: (key) => messages[locale][key] || messages.en[key] || key,
      toggle: () => setLocale((x) => (x === "en" ? "ar" : "en")),
    }),
    [locale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
export const useI18n = () => useContext(I18nContext);
