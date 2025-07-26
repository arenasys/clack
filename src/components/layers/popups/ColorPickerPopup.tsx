import { useEffect, useState, useRef } from "react";
import {
  useClackState,
  getClackState,
  ClackEvents,
  useClackStateDynamic,
} from "../../../state";
import { UserAvatarBigSVG } from "../../Users";

import { IoMdCreate, IoIosArrowForward } from "react-icons/io";

import { FormatColor } from "../../../util";
import { ClickWrapper } from "../../Common";
import { UserPopupContainer } from "./UserPopup";
import { UserPresenceIcon } from "../../Users";
import { UserPresence } from "../../../types";
import { HexColorInput, HexColorPicker } from "react-colorful";

export default function ColorPickerPopup() {
  const setColorPickerPopup = getClackState(
    (state) => state.gui.setColorPickerPopup
  );
  const colorPickerPopup = useClackState(
    ClackEvents.colorPickerPopup,
    (state) => state.gui.colorPickerPopup
  );

  const [color, setColor] = useState("");

  function doSetColor(newColor: string) {
    setColor(newColor);
    if (colorPickerPopup != undefined) {
      colorPickerPopup.onChange(newColor);
    }
  }

  useEffect(() => {
    if (colorPickerPopup != undefined) {
      setColor(colorPickerPopup.color);
    }
  }, [colorPickerPopup]);

  if (colorPickerPopup == undefined) {
    return <></>;
  }

  return (
    <ClickWrapper
      passthrough={true}
      onClick={() => {
        if (colorPickerPopup == undefined) {
          return;
        }
        setColorPickerPopup(undefined);
      }}
    >
      <div className="layer-container layer-popup">
        <div
          className={`color-picker-popup-anchor`}
          style={{
            top: colorPickerPopup.position.y,
            left: colorPickerPopup.position.x + 8,
          }}
        >
          <div className="color-picker-popup">
            <HexColorPicker color={color} onChange={doSetColor} />
            <HexColorInput
              color={color}
              onChange={doSetColor}
              className={"text-input"}
              prefixed
            />
          </div>
        </div>
      </div>
    </ClickWrapper>
  );
}
