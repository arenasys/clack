import React, { useState, useEffect, useRef } from "react";

import { useChatState, useChatStateShallow } from "../../state";
import { GatewayAuthState } from "../../gateway";
import { ErrorCode, ErrorCodeMessages } from "../../events";
import { SHA256 } from "../../util";

function Register() {
  const registerForm = useRef<HTMLFormElement>(null);

  const register = useChatState((state) => {
    return state.register;
  });

  const switchAuthState = useChatState((state) => {
    return state.switchAuthState;
  });

  const state = useChatState((state) => {
    return state.gateway.authState;
  });

  const submit = state == GatewayAuthState.OkRegister;
  const pending = state == GatewayAuthState.TryRegister || submit;

  const errorMessage = useChatState((state) => {
    const code = state.gateway.authError?.code;
    if (!code) {
      return "";
    } else {
      return ErrorCodeMessages[code];
    }
  });

  const usesEmail = useChatState((state) => {
    return state.gateway.site!.usesEmail;
  });

  const usesInviteCodes = useChatState((state) => {
    return state.gateway.site!.usesInviteCodes;
  });

  useEffect(() => {
    if (registerForm.current && submit) {
      registerForm.current.requestSubmit();
    }
  }, [submit]);

  return (
    <>
      <div className="login-container-title">Create an Account</div>
      <div className="login-container-spacer" />
      <form
        ref={registerForm}
        onSubmit={(e) => {
          if (submit) {
            return;
          }
          e.preventDefault();

          const form = e.currentTarget;
          const formData = new FormData(form);
          const data = Object.fromEntries(formData.entries());

          const username = data.username as string;
          const password = data.password as string;
          const email = data.email as string | undefined;
          const inviteCode = data.invitecode as string | undefined;

          SHA256(password).then((hashedPassword) => {
            register(username, hashedPassword, email, inviteCode);
          });
        }}
        action="/register"
        method="post"
        noValidate
      >
        <div>
          <div className="login-container-label">
            Username <span className="required">*</span>
          </div>
          <input
            name="username"
            autoComplete="off"
            className="login-container-input"
            type="text"
            required
          />
        </div>

        <div className="login-container-spacer" />

        <div>
          <div className="login-container-label">
            Password <span className="required">*</span>
          </div>
          <input
            name="password"
            autoComplete="new-password"
            className="login-container-input"
            type="password"
            required
          />
        </div>

        {usesEmail && (
          <>
            <div className="login-container-spacer" />

            <div>
              <div className="login-container-label">
                Email
                <span className="required">*</span>
              </div>
              <input
                name="email"
                autoComplete="email"
                className="login-container-input"
                type="email"
                required
              />
            </div>
          </>
        )}

        {usesInviteCodes && (
          <>
            <div className="login-container-spacer" />
            <div>
              <div className="login-container-label">
                Invite Code <span className="required">*</span>
              </div>
              <input
                name="invitecode"
                autoComplete="off"
                className="login-container-input"
                type="text"
                required
              />
            </div>
          </>
        )}

        <div className="login-container-spacer error">
          <div className="login-container-error">{errorMessage}</div>
        </div>

        <div>
          <button className="login-container-button" disabled={pending}>
            Register
            {pending ? <div className="loader inline right"></div> : <></>}
          </button>
        </div>
        <div
          className="login-container-register link"
          onClick={() => {
            switchAuthState(GatewayAuthState.Login);
          }}
        >
          Back
        </div>
      </form>
    </>
  );
}

function Login() {
  const loginForm = useRef<HTMLFormElement>(null);

  const login = useChatState((state) => {
    return state.login;
  });

  const switchAuthState = useChatState((state) => {
    return state.switchAuthState;
  });

  const state = useChatState((state) => {
    return state.gateway.authState;
  });

  const submit = state == GatewayAuthState.OkLogin;
  const pending = state == GatewayAuthState.TryLogin || submit;

  const errorMessage = useChatState((state) => {
    const code = state.gateway.authError?.code;
    if (!code) {
      return "";
    } else {
      return ErrorCodeMessages[code];
    }
  });

  const siteName = useChatState((state) => {
    return state.gateway.site!.siteName;
  });

  const loginMessage = useChatState((state) => {
    return state.gateway.site!.loginMessage;
  });

  useEffect(() => {
    if (loginForm.current && submit) {
      loginForm.current.requestSubmit();
    }
  }, [submit]);

  return (
    <>
      <div className="login-container-title name">{siteName}</div>
      <div className="login-container-subtitle">{loginMessage}</div>
      <div className="login-container-spacer" />
      <form
        ref={loginForm}
        onSubmit={(e) => {
          if (submit) {
            return;
          }
          e.preventDefault();

          const data = Object.fromEntries(
            new FormData(e.currentTarget).entries()
          );

          const username = data.username as string;
          const password = data.password as string;

          SHA256(password).then((hashedPassword) => {
            login(username, hashedPassword);
          });
        }}
        action="/login"
        method="post"
        noValidate
      >
        <div>
          <div className="login-container-label">
            Username <span className="required">*</span>
          </div>
          <input
            name="username"
            autoComplete="off"
            className="login-container-input"
            type="text"
            required
          />
        </div>

        <div className="login-container-spacer" />

        <div>
          <div className="login-container-label">
            Password <span className="required">*</span>
            <a className="right reset link">Forgot password?</a>
          </div>
          <input
            name="password"
            autoComplete="current-password"
            className="login-container-input"
            type="password"
            required
          />
        </div>

        <div className="login-container-spacer error">
          <div className="login-container-error">{errorMessage}</div>
        </div>

        <div>
          <button
            className="login-container-button"
            type="submit"
            disabled={pending}
          >
            Log in
            {pending ? <div className="loader inline right"></div> : <></>}
          </button>
        </div>
        <div
          className="login-container-register link"
          onClick={() => {
            switchAuthState(GatewayAuthState.Register);
          }}
        >
          Register
        </div>
      </form>
    </>
  );
}

export default function LoginLayer() {
  const state = useChatStateShallow((state) => {
    return state.gateway.authState;
  });

  const login =
    state == GatewayAuthState.Login ||
    state == GatewayAuthState.TryLogin ||
    state == GatewayAuthState.OkLogin;
  const register =
    state == GatewayAuthState.Register ||
    state == GatewayAuthState.TryRegister ||
    state == GatewayAuthState.OkRegister;

  const showing = login || register;

  if (!showing) {
    return <></>;
  }

  return (
    <div className="layer-container">
      <div className="login-screen">
        <div className="login-container">
          {register ? <Register /> : <Login />}
        </div>
      </div>
    </div>
  );
}
