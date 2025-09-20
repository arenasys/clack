import { useRef } from "react";

import { useClackState, getClackState, ClackEvents } from "../../state";

import { DashboardTab } from "../../state/gui";

import { Modal, ModalHandle } from "../Common";

export default function DashboardScreen() {
  const modalRef = useRef<ModalHandle>(null);

  const dashboardTab = useClackState(
    ClackEvents.dashboardTab,
    (state) => state.gui.dashboardTab
  );
  const setDashboardTab = getClackState((state) => state.gui.setDashboardTab);

  function trySetDashboardTab(tab: DashboardTab) {
    if (dashboardTab !== tab) {
      setDashboardTab(tab);
    }
  }

  function tryClose() {
    modalRef.current?.close();
  }

  const tabEntries: Array<{ tab: DashboardTab; label: string }> = [
    { tab: DashboardTab.Overview, label: "Overview" },
    { tab: DashboardTab.Members, label: "Members" },
    { tab: DashboardTab.Roles, label: "Roles" },
    { tab: DashboardTab.Channels, label: "Channels" },
  ];

  if (dashboardTab === undefined) {
    return <></>;
  }

  return (
    <Modal
      ref={modalRef}
      onClosing={() => {}}
      onClosed={() => {
        setDashboardTab(undefined);
      }}
      modalType="layer"
      closingTime={250}
    >
      <div className="layer-container">
        <div className="settings-screen">
          <div className="settings-sidebar-container">
            <div className="settings-sidebar thin-scrollbar">
              <div className="settings-sidebar-heading text-heading-small">
                Dashboard
              </div>
              {tabEntries.map(({ tab, label }) => (
                <div
                  key={tab}
                  className={`settings-sidebar-tab ${
                    dashboardTab === tab ? "current" : ""
                  }`}
                  onClick={() => {
                    trySetDashboardTab(tab);
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div className="settings-content-container">
            <div className="settings-content">
              {dashboardTab === DashboardTab.Overview && (
                <div className="settings-tab-heading">Overview</div>
              )}
              {dashboardTab === DashboardTab.Members && (
                <div className="settings-tab-heading">Members</div>
              )}
              {dashboardTab === DashboardTab.Roles && (
                <div className="settings-tab-heading">Roles</div>
              )}
              {dashboardTab === DashboardTab.Channels && (
                <div className="settings-tab-heading">Channels</div>
              )}

              <div
                className="settings-close"
                onClick={() => {
                  tryClose();
                }}
              >
                <div className="settings-close-button">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="16" y1="8" x2="8" y2="16"></line>
                    <line x1="8" y1="8" x2="16" y2="16"></line>
                  </svg>
                </div>
                <div className="settings-close-label">ESC</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
