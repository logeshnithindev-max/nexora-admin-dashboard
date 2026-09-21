"use client";

import { useEffect, useState } from "react";
import { useI18n } from "../../app/i18n";
import { ChevronIcon, GlobeIcon, LogoutIcon } from "../../app/icons";
import { Logo } from "./Logo";
import Login from "../auth/Login";
import Overview from "../sections/Overview";
import Onboarding from "../sections/Onboarding";
import Clients from "../sections/Clients";
import Events from "../sections/Events";
import Plans from "../sections/Plans";
import Billing from "../sections/Billing";
import Master from "../sections/Master";
import Usage from "../sections/Usage";
import { api } from "../../lib/api";
import { nav } from "../../lib/constants";

export default function DashboardApp() {
  const { locale, t, toggle } = useI18n();

  const [auth, setAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [collapsed, setCollapsed] = useState(false);

  const [data, setData] = useState({
    dashboard: {},
    clients: [],
    "subscription-plans": [],
    invoices: [],
    master: [],
    usage: [],
  });

  useEffect(() => {
    setCollapsed(
      localStorage.getItem("nexora-admin-sidebar") === "collapsed",
    );
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "nexora-admin-sidebar",
      collapsed ? "collapsed" : "expanded",
    );
  }, [collapsed]);

  async function load() {
    setLoading(true);

    try {
      await api("/api/workspaces");

      setAuth(true);

      const names = [
        "dashboard",
        "clients",
        "subscription-plans",
        "invoices",
        "usage",
      ];

      const values = await Promise.all(
        names.map((name) =>
          api(`/api/admin/${name}`).catch(() =>
            name === "dashboard" ? {} : [],
          ),
        ),
      );

      setData(
        Object.fromEntries(
          names.map((name, index) => [name, values[index]]),
        ),
      );
    } catch (error) {
      console.error("Dashboard loading error:", error);
      setAuth(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading && !auth) {
    return (
      <div className="boot">
        <Logo />
      </div>
    );
  }

  if (!auth) {
    return <Login done={load} />;
  }

  const views = {
    overview: <Overview data={data.dashboard} go={setTab} />,

    onboarding: (
      <Onboarding
        plans={data["subscription-plans"]}
        clients={data.clients}
        reload={load}
      />
    ),

    clients: (
      <Clients
        items={data.clients}
        reload={load}
      />
    ),

    events: (
      <Events
        clients={data.clients}
      />
    ),

    plans: (
      <Plans
        items={data["subscription-plans"]}
        reload={load}
      />
    ),

    billing: (
      <Billing
        items={data.invoices}
        clients={data.clients}
        reload={load}
      />
    ),

    master: (
      <Master />
    ),

    usage: (
      <Usage
        items={data.usage}
      />
    ),
  };

  console.log("ACTIVE TAB:", tab);
  console.log("MASTER DATA:", data.master);

  return (
    <main
      className={`${collapsed ? "menu-collapsed" : ""} ${
        locale === "ar" ? "rtl" : ""
      }`}
    >
      <aside className="sidebar">
        <Logo />

        <button
          className="collapse-button"
          title={collapsed ? t("shell.expand") : t("shell.collapse")}
          onClick={() => setCollapsed((value) => !value)}
        >
          <ChevronIcon
            right={collapsed !== (locale === "ar")}
          />
        </button>

        <nav>
          {nav.map(([id, NavIcon]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
              title={t(`nav.${id}`)}
            >
              <i>
                <NavIcon />
              </i>

              <span>
                {t(`nav.${id}`)}
              </span>
            </button>
          ))}
        </nav>

        <div className="help">
          <b>{t("shell.help")}</b>
          <p>{t("shell.helpText")}</p>
          <button>
            {t("shell.guide")} →
          </button>
        </div>

        <div className="profile">
          <i>NA</i>

          <span>
            <b>Nexora Admin</b>
            <small>{t("shell.operations")}</small>
          </span>

          <button
            title="Logout"
            onClick={() =>
              api("/api/login", {
                method: "DELETE",
              }).finally(() => {
                setAuth(false);
              })
            }
          >
            <LogoutIcon />
          </button>
        </div>
      </aside>

      <section className="content">
        <header>
          <span>
            Nexora　/　{t(`nav.${tab}`)}
          </span>

          <div className="header-actions">
            <button
              className="language-button"
              onClick={toggle}
            >
              <GlobeIcon />

              <span>
                {t("shell.language")}
              </span>
            </button>
          </div>
        </header>

        <div className="inner">
          {views[tab] || (
            <div className="empty-state">
              Page not found: {tab}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}