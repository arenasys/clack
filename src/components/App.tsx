import { Chat, Input } from "./Chat";
import Users from "./Users";
import You from "./You";
import Channels from "./Channels";
import Client from "./Client";
import Header from "./Header";
import { IconButton } from "./Common";
import AttachmentModal from "./layers/modals/AttachmentModal";
import ViewerModal from "./layers/modals/ViewerModal";
import DeleteMessageModal from "./layers/modals/DeleteMessageModal";
import ErrorModal from "./layers/modals/ErrorModal";
import TooltipPopup from "./layers/popups/TooltipPopup";
import ContextMenuPopup from "./layers/popups/ContextMenuPopup";
import UserPopup from "./layers/popups/UserPopup";
import EmojiPickerPopup from "./layers/popups/EmojiPickerPopup";
import LoadingScreen from "./layers/LoadingScreen";
import LoginScreen from "./layers/LoginScreen";
import CaptchaScreen from "./layers/CaptchaScreen";

import { RiArrowDownSLine } from "react-icons/ri";
import { ErrorBoundary } from "react-error-boundary";
import { Fallback, FallbackLayer } from "./Error";

function App() {
  return (
    <div id="root">
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
        <AttachmentModal />
      </ErrorBoundary>

      <ErrorBoundary FallbackComponent={FallbackLayer}>
        <ViewerModal />
      </ErrorBoundary>

      <ErrorBoundary FallbackComponent={FallbackLayer}>
        <DeleteMessageModal />
      </ErrorBoundary>

      <ErrorBoundary FallbackComponent={FallbackLayer}>
        <UserPopup />
      </ErrorBoundary>

      <ErrorBoundary FallbackComponent={FallbackLayer}>
        <EmojiPickerPopup />
      </ErrorBoundary>

      <ErrorBoundary FallbackComponent={FallbackLayer}>
        <ContextMenuPopup />
      </ErrorBoundary>

      <ErrorBoundary FallbackComponent={FallbackLayer}>
        <LoginScreen />
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
