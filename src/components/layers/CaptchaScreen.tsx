import React, { useState, useEffect } from "react";

import { useClackState, getClackState, ClackEvents } from "../../state";

import HCaptcha from "@hcaptcha/react-hcaptcha";

export default function CaptchaScreen() {
  const captchaSiteKey = useClackState(ClackEvents.settings, (state) => {
    return state.chat.settings?.captchaSiteKey ?? "";
  });
  const needCaptcha = useClackState(ClackEvents.captcha, (state) => {
    return state.chat.requestPendingCaptcha !== undefined;
  });
  const finishCaptcha = getClackState((state) => {
    return state.chat.finishCaptcha;
  });

  if (!needCaptcha) {
    return <></>;
  } else {
    return (
      <div
        className="layer-container captcha-layer"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          finishCaptcha(undefined);
        }}
      >
        <div className="captcha-popup">
          <div className="captcha-container">
            <div className="loader"></div>
          </div>
          <div className="captcha-container">
            <HCaptcha
              sitekey={captchaSiteKey}
              onVerify={(token, _) => {
                if (token !== undefined) {
                  finishCaptcha(token);
                }
              }}
            />
          </div>
        </div>
      </div>
    );
  }
}
