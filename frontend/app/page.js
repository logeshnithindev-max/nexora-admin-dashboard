"use client";

import { I18nProvider } from "./i18n";
import DashboardApp from "../components/layout/DashboardApp";

export default function App() {
  return (
    <I18nProvider>
      <DashboardApp />
    </I18nProvider>
  );
}
