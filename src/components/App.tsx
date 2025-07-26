import { Chat, Input } from "./Chat";
import Users from "./Users";
import You from "./You";
import Channels from "./Channels";
import Client from "./Client";
import Header from "./Header";
import { IconButton } from "./Common";

import AttachmentModal from "./layers/modals/AttachmentModal";
import ViewerModal from "./layers/modals/ViewerModal";
import MessageDeleteModal from "./layers/modals/MessageDeleteModal";
import MessageReactionsModal from "./layers/modals/MessageReactionsModal";
import ErrorModal from "./layers/modals/ErrorModal";
import GeneralModal from "./layers/modals/GeneralModal";
import DropModal from "./layers/modals/DropModal";

import TooltipPopup from "./layers/popups/TooltipPopup";
import ContextMenuPopup from "./layers/popups/ContextMenuPopup";
import UserPopup from "./layers/popups/UserPopup";
import ReactionTooltipPopup from "./layers/popups/ReactionTooltipPopup";
import YouPopup from "./layers/popups/YouPopup";
import EmojiPickerPopup from "./layers/popups/EmojiPickerPopup";
import ColorPickerPopup from "./layers/popups/ColorPickerPopup";

import LoadingScreen from "./layers/LoadingScreen";
import LoginScreen from "./layers/LoginScreen";
import CaptchaScreen from "./layers/CaptchaScreen";
import SettingsScreen from "./layers/SettingsScreen";

import { RiArrowDownSLine } from "react-icons/ri";
import { ErrorBoundary } from "react-error-boundary";
import { Fallback, FallbackLayer } from "./Error";
import { ClackEvents, useClackState } from "../state";
import AvatarModal from "./layers/modals/AvatarModal";

function App() {
  const key = useClackState(ClackEvents.reset, (state) => {
    return state.key;
  });

  return (
    <div id="root" key={key}>
      <Client />
      <div className="monospace-preload">Clack</div>
      <div id="sidebar-container"></div>
      <div id="main-container">
        <div id="header-container">
          <div id="left-header-container">
            <h2 className="server-name">Clack</h2>
            <IconButton className="server-dropdown-button foreground">
              <RiArrowDownSLine className="icon" />
            </IconButton>
          </div>
          <div id="center-header-container">
            <ErrorBoundary FallbackComponent={Fallback}>
              <Header />
            </ErrorBoundary>
          </div>
        </div>
        <div id="body-container">
          <div id="left-body-container">
            <div id="channel-container">
              <ErrorBoundary FallbackComponent={Fallback}>
                <Channels />
              </ErrorBoundary>
            </div>
            <div id="you-container">
              <ErrorBoundary FallbackComponent={Fallback}>
                <You />
              </ErrorBoundary>
            </div>
          </div>
          <div id="center-body-container">
            <div id="chat-container">
              <ErrorBoundary FallbackComponent={Fallback}>
                <Chat />
              </ErrorBoundary>
            </div>
            <div id="input-container">
              <ErrorBoundary FallbackComponent={Fallback}>
                <Input />
              </ErrorBoundary>
            </div>
          </div>
          <div id="right-body-container">
            <div id="user-container">
              <ErrorBoundary FallbackComponent={Fallback}>
                <Users />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </div>

      <ErrorBoundary FallbackComponent={FallbackLayer}>
        <ReactionTooltipPopup />
      </ErrorBoundary>

      <ErrorBoundary FallbackComponent={FallbackLayer}>
        <YouPopup />
      </ErrorBoundary>

      <ErrorBoundary FallbackComponent={FallbackLayer}>
        <AttachmentModal />
      </ErrorBoundary>

      <ErrorBoundary FallbackComponent={FallbackLayer}>
        <ViewerModal />
      </ErrorBoundary>

      <ErrorBoundary FallbackComponent={FallbackLayer}>
        <MessageDeleteModal />
      </ErrorBoundary>

      <ErrorBoundary FallbackComponent={FallbackLayer}>
        <MessageReactionsModal />
      </ErrorBoundary>

      <ErrorBoundary FallbackComponent={FallbackLayer}>
        <DropModal />
      </ErrorBoundary>

      <ErrorBoundary FallbackComponent={FallbackLayer}>
        <UserPopup />
      </ErrorBoundary>

      <ErrorBoundary FallbackComponent={FallbackLayer}>
        <SettingsScreen />
      </ErrorBoundary>

      <ErrorBoundary FallbackComponent={FallbackLayer}>
        <LoginScreen />
      </ErrorBoundary>

      <ErrorBoundary FallbackComponent={FallbackLayer}>
        <EmojiPickerPopup />
      </ErrorBoundary>

      <ErrorBoundary FallbackComponent={FallbackLayer}>
        <ColorPickerPopup />
      </ErrorBoundary>

      <ErrorBoundary FallbackComponent={FallbackLayer}>
        <ContextMenuPopup />
      </ErrorBoundary>

      <ErrorBoundary FallbackComponent={FallbackLayer}>
        <GeneralModal />
      </ErrorBoundary>

      <ErrorBoundary FallbackComponent={FallbackLayer}>
        <AvatarModal />
      </ErrorBoundary>

      <ErrorBoundary FallbackComponent={FallbackLayer}>
        <CaptchaScreen />
      </ErrorBoundary>

      <ErrorBoundary FallbackComponent={FallbackLayer}>
        <LoadingScreen />
      </ErrorBoundary>

      <ErrorBoundary FallbackComponent={FallbackLayer}>
        <ErrorModal />
      </ErrorBoundary>

      <ErrorBoundary FallbackComponent={FallbackLayer}>
        <TooltipPopup />
      </ErrorBoundary>
    </div>
  );
}

export default App;
