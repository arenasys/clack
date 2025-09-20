import {
  useClackState,
  getClackState,
  ClackEvents,
  useClackStateDynamic,
} from "../../../state";
import { IoIosArrowForward } from "react-icons/io";

import { Permissions } from "../../../types";

import { ClickWrapper } from "../../Common";

export default function ContextMenuPopup() {
  const contextMenuPopup = useClackState(
    ClackEvents.contextMenuPopup,
    (state) => state.gui.contextMenuPopup
  );
  const setContextMenuPopup = getClackState(
    (state) => state.gui.setContextMenuPopup
  );

  if (!contextMenuPopup) return <></>;

  return (
    <ClickWrapper
      passthrough={true}
      onClick={() => {
        console.log("Closing context menu");
        setContextMenuPopup(undefined);
      }}
    >
      {contextMenuPopup?.content}
    </ClickWrapper>
  );
}
