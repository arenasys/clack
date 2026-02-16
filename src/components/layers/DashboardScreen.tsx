import { useEffect, useMemo, useRef, useState } from "react";

import { useClackState, useClackStateDynamic, getClackState, ClackEvents } from "../../state";

import { DashboardTab } from "../../state/gui";

import { Role } from "../../types";
import { FormatColor } from "../../util";

import { IconButton, Modal, ModalHandle } from "../Common";

import { MdPeople, MdPerson } from "react-icons/md";
import { IoIosArrowForward, IoMdArrowBack, IoMdCreate, IoIosMore, IoMdAdd } from "react-icons/io";
import { RiDraggable } from "react-icons/ri";

import { select } from "slate";

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
              <div
                className={`settings-sidebar-tab ${
                  dashboardTab === DashboardTab.Users ? "current" : ""
                }`}
                onClick={() => {
                  trySetDashboardTab(DashboardTab.Users);
                }}
              >
                Users
              </div>
              <div
                className={`settings-sidebar-tab ${
                  dashboardTab === DashboardTab.Roles ? "current" : ""
                }`}
                onClick={() => {
                  trySetDashboardTab(DashboardTab.Roles);
                }}
              >
                Roles
              </div>
            </div>
          </div>
          <div className="settings-content-container">
            <div className="settings-content">
              {dashboardTab === DashboardTab.Users && <UsersTab />}
              {dashboardTab === DashboardTab.Roles && <RolesTab />}
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

function UsersTab() {
  return (
    <div className="settings-content-margin">
      <div className="settings-tab-heading">Users</div>
    </div>
  );
}

function RolesTab() {
  const roles = useClackState(ClackEvents.roleList, (state) =>
    state.chat.roles.getAll()
  );
  const [selectedRole, setSelectedRole] = useState(null);

  if (selectedRole !== null) {
    return (
      <div className="role-page">
        <div className="role-page-sidebar">
          <div className="role-page-sidebar-header">
            <div className="role-page-sidebar-back" onClick={ () => setSelectedRole(null) }>
              <IoMdArrowBack/>
              <span>Back</span>
            </div>
            <div className="role-page-sidebar-add" onClick={ () => {} }>
              <IoMdAdd/>
            </div>
          </div>
          <div className="role-page-sidebar-list thin-scrollbar">
            {roles.map((r) => (
              <div className={`role-page-sidebar-entry ${r.id === selectedRole ? "current" : ""}`} onClick={ () => setSelectedRole(r.id) } key={r.id}>
                <div
                  className="icon"
                  style={{
                    backgroundColor: FormatColor(r.color),
                  }}
                />
                <div className="name">{r.name}</div>
              </div>
            ))}
            <div className={`role-page-sidebar-entry ${"everyone" === selectedRole ? "current" : ""}`} onClick={ () => setSelectedRole("everyone") } key={"everyone"}>
                <div
                  className="icon"
                  style={{
                    backgroundColor: "#99aab5",
                  }}
                />
                <div className="name">@everyone</div>
              </div>
          </div>
        </div>
        <RolePage roleId={selectedRole}/>
      </div>
    );
  }

  return (
    <div className="settings-content-margin">
      <div className="settings-tab-heading">Roles</div>
      <div className="settings-description">
        Use roles to group users and manage their permissions.
      </div>

      <div className="roles-tab-default-role" onClick={() => setSelectedRole("everyone")}>
        <div className="roles-tab-default-role-icon people">
          <MdPeople />
        </div>
        <div className="roles-tab-default-role-content">
          <div className="roles-tab-default-role-heading">Default Role</div>
          <div className="roles-tab-default-role-subheading">
            @everyone - applies to all users
          </div>
        </div>
        <div className="roles-tab-default-role-icon arrow">
          <IoIosArrowForward />
        </div>
      </div>

      <div className="roles-tab-list-header">
        <div className="roles">Roles - {roles.length}</div>
        <div className="users">Users</div>
        <div className="controls"></div>
      </div>

      <div className="roles-tab-list">
        {roles.map((r) => (
          <RoleEntry role={r} key={r.id} onClick={() => { setSelectedRole(r.id) }} />
        ))}
      </div>
    </div>
  );
}

function RoleEntry({ role, onClick }: { role: Role, onClick: () => void }) {
  const userCount = useClackState(ClackEvents.userList, (state) => state.chat.userList.groups.get(role.id) ?? 0);

  return (
    <div draggable="true" className="roles-tab-list-entry" onClick={onClick} onDragStart={(e) => {
      if(e.nativeEvent.offsetX > 32) {
        e.preventDefault();
        return;
      }
      console.log("DRAG START", e);
      e.dataTransfer.setData("text/plain", role.id);
    }}>
      <div className="roles-tab-list-entry-handle">
        <RiDraggable />
      </div>
      <div className="roles-tab-list-entry-roles">
        <div
          className="icon"
          style={{
            backgroundColor: FormatColor(role.color),
          }}
        />
        <div className="name">{role.name}</div>
      </div>
      <div className="roles-tab-list-entry-users">
        <div className="count">{userCount}</div>
        <MdPerson className="icon" />
      </div>
      <div className="roles-tab-list-entry-controls">
        <IconButton tooltip="Edit" tooltipDirection="top" className="hidden" onClick={onClick} >
          <IoMdCreate />
        </IconButton>
        <IconButton tooltip="More" tooltipDirection="top" onClick={() => {console.log("MORE"); }} >
          <IoIosMore />
        </IconButton>
      </div>
    </div>
  );
}

function RolePage({ roleId }: { roleId: string }) {
  const [role, roleName, userCount] = useClackStateDynamic((state, events) => {
      events.push(ClackEvents.role(roleId));
      if (roleId === "everyone") {
        return [null, "@everyone", null];
      } else {
        var role = state.chat.roles.get(roleId);
        return [role, role?.name ?? "Unknown", state.chat.userList.groups.get(roleId) ?? 0];
      }
    }, [roleId]
  );

  const isDefault = role == null;

  const [tab, setTab] = useState(1);

  useEffect(() => {
    if (isDefault && tab != 1) {
      setTab(1);
    }
  }, [isDefault]);
  const effectiveTab = isDefault ? 1 : tab;

  const tabNames = ["Display", "Permissions", "Manage Members" + (userCount != null ? ` - ${userCount}` : "")];

  return (
    <div className="role-page-content">
      <div className="role-page-header">
        <div className="role-page-title-container">
          <div className="role-page-title">
            Edit Role - {roleName}
          </div>
        </div>
        <div className="role-page-tabs">
          {tabNames.map((name, i) => {
            var className = "tab";
            if (effectiveTab == i) {
              className += " current";
            }
            if (isDefault && i != 1) {
              className += " disabled";
            }
            return <div className={className} onClick={()=>setTab(i)} key={i}>{name}</div>
          })}
        </div>
      </div>
    </div>
  );

}