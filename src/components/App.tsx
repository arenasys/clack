import { Chat, Input } from "./Chat";
import Users from "./Users";
import You from "./You";
import Channels from "./Channels";
import Client from "./Client";
import Header from "./Header";
import AttachmentLayer from "./layers/modals/AttachmentModal";
import ViewerLayer from "./layers/modals/ViewerModal";
import TooltipPopupLayer from "./layers/popups/TooltipPopup";
import UserPopupLayer from "./layers/popups/UserPopup";
import LoadingLayer from "./layers/LoadingScreen";
import LoginLayer from "./layers/LoginScreen";
import CaptchaLayer from "./layers/CaptchaScreen";

import { RiArrowDownSLine } from "react-icons/ri";

function App() {
  return (
    <>
      <Client />
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
      <AttachmentLayer />
      <ViewerLayer />
      <TooltipPopupLayer />
      <UserPopupLayer />
      <LoginLayer />
      <CaptchaLayer />
      <LoadingLayer />
    </>
  );
}

export default App;
