import React, { useState, useEffect } from "react";

import { useChatState, useChatStateShallow } from "../../state";

import HCaptcha from "@hcaptcha/react-hcaptcha";

export default function CaptchaScreen() {
  const captchaSiteKey = useChatState((state) => {
    return state.gateway.settings?.captchaSiteKey ?? "";
  });
  const needCaptcha = useChatState((state) => {
    return state.gateway.requestPendingCaptcha !== undefined;
  });
  const finishCaptcha = useChatState((state) => {
    return state.finishCaptcha;
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
