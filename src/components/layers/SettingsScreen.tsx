import { useEffect, useRef, useMemo, useState } from "react";

import { HexColorPicker } from "react-colorful";

import {
  useClackState,
  getClackState,
  ClackEvents,
  useClackStateDynamic,
} from "../../state";

import { ClickWrapper, Modal, ModalHandle, TooltipWrapper } from "../Common";
import { FormatColor, ParseColor } from "../../util";

import { SettingsTab } from "../../state/gui";

import { MdLogout } from "react-icons/md";
import { IoMdLogOut } from "react-icons/io";
import { RiEmotionFill } from "react-icons/ri";
import { IoMdCreate, IoMdDownload } from "react-icons/io";

import { DefaultUserColor, User } from "../../types";

import { UserPopupContainer } from "./popups/UserPopup";
import { UserAvatarBigSVG } from "../Users";
import {
  MarkdownTextbox,
  MarkdownTextboxRef,
  MarkdownTextInput,
} from "../Input";

var isEditing = false;

export default function SettingsScreen() {
  const modalRef = useRef<ModalHandle>(null);

  const settingsTab = useClackState(
    ClackEvents.settingsTab,
    (state) => state.gui.settingsTab
  );
  const setSettingsTab = getClackState((state) => state.gui.setSettingsTab);

  const setGeneralModal = getClackState((state) => state.gui.setGeneralModal);

  const reset = getClackState((state) => state.reset);
  const logout = getClackState((state) => state.chat.logout);

  function DisplayIsEditing() {
    const el = document.getElementById("settings-save-popup");
    el.classList.add("shake");
    setTimeout(() => {
      el.classList.remove("shake");
    }, 500);
    return;
  }

  function TrySetSettingsTab(tab: SettingsTab) {
    if (isEditing) {
      DisplayIsEditing();
      return;
    }
    if (settingsTab !== tab) {
      setSettingsTab(tab);
    }
  }

  function TryClose() {
    if (isEditing) {
      DisplayIsEditing();
      return;
    }
    if (modalRef.current) {
      modalRef.current.close();
    }
  }

  function TryLogout() {
    if (isEditing) {
      DisplayIsEditing();
      return;
    }
    logout();
    reset();
  }

  if (settingsTab === undefined) {
    return <></>;
  }

  return (
    <Modal
      ref={modalRef}
      onClosing={() => {}}
      onClosed={() => {
        setSettingsTab(undefined);
      }}
      modalType="layer"
      closingTime={250}
    >
      <div className="layer-container">
        <div className="settings-screen">
          <div className="settings-sidebar-container">
            <div className="settings-sidebar thin-scrollbar">
              <div className="settings-sidebar-heading text-heading-small">
                User Settings
              </div>
              <div
                className={`settings-sidebar-tab ${
                  SettingsTab.MyAccount === settingsTab ? "current" : ""
                }`}
                onClick={() => {
                  TrySetSettingsTab(SettingsTab.MyAccount);
                }}
              >
                My Account
              </div>
              <div
                className={`settings-sidebar-tab ${
                  SettingsTab.Profile === settingsTab ? "current" : ""
                }`}
                onClick={() => {
                  TrySetSettingsTab(SettingsTab.Profile);
                }}
              >
                Profile
              </div>
              <div className="settings-sidebar-divider" />

              <div className="settings-sidebar-heading text-heading-small">
                App Settings
              </div>
              <div
                className={`settings-sidebar-tab ${
                  SettingsTab.Appearance === settingsTab ? "current" : ""
                }`}
                onClick={() => {
                  TrySetSettingsTab(SettingsTab.Appearance);
                }}
              >
                Appearance
              </div>
              <div
                className={`settings-sidebar-tab ${
                  SettingsTab.VoiceAndVideo === settingsTab ? "current" : ""
                }`}
                onClick={() => {
                  TrySetSettingsTab(SettingsTab.VoiceAndVideo);
                }}
              >
                Voice & Video
              </div>
              <div
                className={`settings-sidebar-tab ${
                  SettingsTab.Notifications === settingsTab ? "current" : ""
                }`}
                onClick={() => {
                  TrySetSettingsTab(SettingsTab.Notifications);
                }}
              >
                Notifications
              </div>

              <div className="settings-sidebar-divider" />
              <div
                className="settings-sidebar-tab logout"
                onClick={() => {
                  setGeneralModal({
                    title: "Log Out",
                    description: "Are you sure you want to log out?",
                    acceptLabel: "Log Out",
                    closeLabel: "Cancel",
                    onAccept: () => {
                      TryLogout();
                    },
                    onClose: () => {
                      modalRef.current?.focus();
                    },
                  });
                }}
              >
                Log Out
                <MdLogout className="settings-sidebar-tab-icon" />
              </div>
              <div className="settings-sidebar-divider" />
            </div>
          </div>
          <div className="settings-content-container">
            <div className="settings-content">
              {SettingsTab.Profile === settingsTab && <ProfileTab></ProfileTab>}
              {SettingsTab.MyAccount === settingsTab && (
                <MyAccountTab></MyAccountTab>
              )}

              <div
                className="settings-close"
                onClick={() => {
                  TryClose();
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

function SettingsHeading({
  text,
  required,
}: {
  text: string;
  required?: boolean;
}) {
  return <div className="settings-subheading text-heading-small">{text}</div>;
}

function SettingsTextInput({
  value,
  onChange,
  placeholder,
}: {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      className="settings-text-input text-input"
      value={value}
      placeholder={placeholder}
      onChange={(e) => {
        if (onChange) {
          onChange(e.target.value);
        }
      }}
    />
  );
}

function SettingsMarkdownTextInput({
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  const ref = useRef<MarkdownTextboxRef>(null);
  const [innerValue, setInnerValue] = useState<string>(value || "");

  function onValue(text: string) {
    setInnerValue(text);
    if (onChange) {
      onChange(text);
    }
  }

  useEffect(() => {
    if (value !== innerValue) {
      ref.current?.clear();
      ref.current?.insert(value || "");
    }
  }, [value]);
  return (
    <MarkdownTextInput
      ref={ref}
      value={value}
      onValue={onValue}
      placeholder={placeholder}
      maxLength={maxLength}
      className="settings-multiline-text-input"
      innerClassName="text-input"
    />
  );
}

function SettingsColorInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [hex, setHex] = useState<string>("");
  const setColorPickerPopup = getClackState(
    (state) => state.gui.setColorPickerPopup
  );

  function doSetColor(color: string) {
    setHex(color);
    if (onChange) {
      onChange(ParseColor(color));
    }
  }

  useEffect(() => {
    setHex(FormatColor(value));
  }, [value]);

  return (
    <div
      className="settings-color-input"
      style={{ backgroundColor: hex }}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setColorPickerPopup({
          position: {
            x: rect.right,
            y: rect.top,
          },
          color: hex,
          onChange: doSetColor,
        });
      }}
    >
      <IoMdCreate />
    </div>
  );
}

function SettingsSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="settings-section">
      {children}
      <div className="settings-seperator" />
    </div>
  );
}

function SettingsDescription({ children }: { children: React.ReactNode }) {
  return <div className="settings-description">{children}</div>;
}

function MyAccountTab() {
  const currentUser = useClackStateDynamic((state, events) => {
    events.push(ClackEvents.current);
    events.push(ClackEvents.user(state.chat.currentUser));
    return state.chat.users.get(state.chat.currentUser);
  });

  const setSettingsTab = getClackState((state) => state.gui.setSettingsTab);

  const currentColor =
    currentUser.profileColor < 0 ? DefaultUserColor : currentUser.profileColor;

  return (
    <>
      <div className="settings-tab-heading">My Account</div>

      <div className="settings-account-container">
        <div
          className="settings-account-banner"
          style={{ backgroundColor: FormatColor(currentColor) }}
        >
          <div className="settings-account-avatar">
            <UserAvatarBigSVG user={currentUser} size={100} />
          </div>
        </div>
        <div className="settings-account-heading">
          <div className="settings-account-label">
            {currentUser.displayName}
          </div>
          <button
            className="settings-account-edit-profile button"
            onClick={() => {
              setSettingsTab(SettingsTab.Profile);
            }}
          >
            Edit Profile
          </button>
        </div>
        <div className="settings-account-body">
          <div className="settings-account-body-row">
            <div>
              <div className="settings-account-body-label text-heading-small">
                Display Name
              </div>
              <div className="settings-account-body-value">
                {currentUser.displayName}
              </div>
            </div>
            <button
              className="button secondary"
              onClick={() => {
                setSettingsTab(SettingsTab.Profile);
              }}
            >
              Edit
            </button>
          </div>

          <div className="settings-account-body-row">
            <div>
              <div className="settings-account-body-label text-heading-small">
                Username
              </div>
              <div className="settings-account-body-value">
                {currentUser.userName}
              </div>
            </div>
            <button className="button secondary">Edit</button>
          </div>

          <div className="settings-account-body-row">
            <div>
              <div className="settings-account-body-label text-heading-small">
                Email
              </div>
              <div className="settings-account-body-value">{"Not set"}</div>
            </div>
            <button className="button secondary">Edit</button>
          </div>
        </div>
      </div>

      <div className="settings-heading">Passwords and Authentication</div>
      <SettingsSection>
        <button className="button">Change Password</button>
      </SettingsSection>

      <div className="settings-heading">Invite Codes</div>
      <SettingsSection>
        <div className="settings-description">
          Invite codes allow you to invite new users to the server.
        </div>
        <button className="button">View Codes</button>
      </SettingsSection>

      <div className="settings-heading">Danger Zone</div>
      <SettingsSection>
        <div className="settings-description">
          Disables your account and schedules the removal of all your data from
          the server.
        </div>
        <button className="button hollow">Delete Account</button>
      </SettingsSection>
    </>
  );
}

function AvatarSelector() {
  return <>WOW</>;
}

function ProfileTab() {
  const [_displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState("");
  const [profile, setProfile] = useState("");
  const [avatar, setAvatar] = useState(0);
  const [color, setColor] = useState(0);

  const avatarBlob = useRef<Blob>();
  const avatarBlobURL = useRef<string>();

  function setAvatarBlob(blob: Blob) {
    avatarBlob.current = blob;
    if (avatarBlobURL.current) {
      URL.revokeObjectURL(avatarBlobURL.current);
    }
    if (avatarBlob.current) {
      avatarBlobURL.current = URL.createObjectURL(avatarBlob.current);
      setAvatar(Date.now());
    }
  }

  const setAvatarModal = getClackState((state) => state.gui.setAvatarModal);

  const updateUser = getClackState((state) => state.chat.updateUser);

  const currentUser = useClackStateDynamic((state, events) => {
    events.push(ClackEvents.current);
    events.push(ClackEvents.user(state.chat.currentUser));
    return state.chat.users.get(state.chat.currentUser);
  });

  const displayName = _displayName || currentUser.userName || "";

  const currentDisplayName = currentUser.displayName;
  const currentStatus = currentUser.statusMessage || "";
  const currentProfile = currentUser.profileMessage || "";
  const currentAvatar = currentUser.avatarModified;
  const currentColor =
    currentUser.profileColor < 0 ? DefaultUserColor : currentUser.profileColor;

  function getModifiedUser() {
    var user = {
      ...currentUser,
      displayName: displayName,
      profileColor: color,
      avatarModified: avatar,
    };

    if (avatar != currentAvatar && avatarBlobURL.current) {
      user.avatarURL = avatarBlobURL.current;
    }

    if (status != currentStatus) {
      user.statusMessage = status;
    }

    if (profile != currentProfile) {
      user.profileMessage = profile;
    }

    return user;
  }

  function doSync() {}

  function doReset() {
    setDisplayName(currentDisplayName);
    setStatus(currentStatus);
    setProfile(currentProfile);
    setColor(currentColor);
    setAvatar(currentAvatar);
  }

  function doSave() {
    updateUser(getModifiedUser(), avatarBlob.current);
  }

  useEffect(() => {
    console.log("DO RESET");
    doReset();
  }, [currentUser]);

  const changed =
    displayName !== currentDisplayName ||
    status !== currentStatus ||
    profile !== currentProfile ||
    color !== currentColor ||
    avatar !== currentAvatar;

  isEditing = changed;

  doSync();
  const preview = useMemo(() => {
    return <UserPopupContainer key={profile} user={getModifiedUser()} />;
  }, [displayName, status, profile, color, currentUser, avatar]);

  return (
    <>
      <div className="settings-tab-heading">Profile</div>

      <div className="settings-two-column">
        <div className="settings-column">
          <SettingsSection>
            <SettingsHeading text="Name" />
            <SettingsTextInput
              value={_displayName}
              onChange={setDisplayName}
              placeholder={currentUser.userName}
            />
          </SettingsSection>

          <SettingsSection>
            <SettingsHeading text="Status" />
            <SettingsTextInput
              value={status}
              onChange={setStatus}
              placeholder=""
            />
          </SettingsSection>

          <SettingsSection>
            <SettingsHeading text="Description" />
            <SettingsMarkdownTextInput
              value={profile}
              onChange={setProfile}
              placeholder=""
              maxLength={250}
            />
          </SettingsSection>

          <SettingsSection>
            <SettingsHeading text="Avatar" />
            <div className="settings-button-row">
              <button
                className="button"
                onClick={() => {
                  setAvatarModal({
                    onAccept(avatar) {
                      setAvatarBlob(avatar);
                    },
                    onClose() {
                      setAvatarBlob(undefined);
                    },
                    size: 256,
                  });
                }}
              >
                Upload
              </button>
              <button
                className="button secondary"
                onClick={() => {
                  setAvatarBlob(undefined);
                  setAvatar(0);
                }}
              >
                Reset
              </button>
            </div>
          </SettingsSection>

          <SettingsSection>
            <SettingsHeading text="Color" />
            <SettingsColorInput value={color} onChange={setColor} />
          </SettingsSection>
        </div>
        <div className="settings-column">
          <SettingsHeading text="Preview" />
          <div className="settings-user-preview-container">{preview}</div>
        </div>
      </div>

      {changed && <SavePopup onReset={doReset} onSave={doSave} />}
    </>
  );
}

function SavePopup({
  onReset,
  onSave,
}: {
  onReset?: () => void;
  onSave?: () => void;
}) {
  return (
    <div className="settings-save-popup-anchor">
      <div id="settings-save-popup" className="settings-save-popup">
        <div className="settings-save-popup-label">
          You have unsaved changes.
        </div>
        <div className="settings-save-popup-buttons">
          <button
            className="settings-save-popup-button button link"
            onClick={() => {
              if (onReset) {
                onReset();
              }
            }}
          >
            Reset
          </button>
          <button
            className="settings-save-popup-button button"
            onClick={() => {
              if (onSave) {
                onSave();
              }
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
