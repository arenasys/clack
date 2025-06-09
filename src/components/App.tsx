import { Chat, Input } from "./Chat";
import Users from "./Users";
import You from "./You";
import Channels from "./Channels";
import Client from "./Client";
import Header from "./Header";
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

function App() {
  return (
    <>
      <Client />
      <div className="monospace-preload">Clack</div>
      <div id="sidebar-container"></div>
      <div id="main-container">
        <div id="header-container">
          <div id="left-header-container">
            <h2 className="server-name">Clack</h2>
            <button className="server-dropdown-button">
              <RiArrowDownSLine className="dropdown-icon" />
            </button>
          </div>
          <div id="center-header-container">
            <Header />
          </div>
        </div>
        <div id="body-container">
          <div id="left-body-container">
            <div id="channel-container">
              <Channels />
            </div>
            <div id="you-container">
              <You />
            </div>
          </div>
          <div id="center-body-container">
            <div id="chat-container">
              <Chat />
            </div>
            <div id="input-container">
              <Input />
            </div>
          </div>
          <div id="right-body-container">
            <div id="user-container">
              <Users />
            </div>
          </div>
        </div>
      </div>
      <AttachmentModal />
      <ViewerModal />
      <DeleteMessageModal />
      <UserPopup />
      <EmojiPickerPopup />
      <ContextMenuPopup />
      <LoginScreen />
      <CaptchaScreen />
      <LoadingScreen />
      <ErrorModal />
      <TooltipPopup />
    </>
  );
}

export default App;
