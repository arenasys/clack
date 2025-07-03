import React, { useState, useEffect, useRef } from "react";

import { useClackState, getClackState, ClackEvents } from "../../state";
import { ChatAuthState } from "../../state/chat";
import { ErrorCode, ErrorCodeMessages } from "../../types";
import { SHA256 } from "../../util";

function Register() {
  const registerForm = useRef<HTMLFormElement>(null);

  const register = getClackState((state) => {
    return state.chat.register;
  });

  const switchAuthState = getClackState((state) => {
    return state.chat.switchAuthState;
  });

  const state = useClackState(ClackEvents.auth, (state) => {
    return state.chat.authState;
  });

  const submit = state == ChatAuthState.OkRegister;
  const pending = state == ChatAuthState.TryRegister || submit;

  const errorMessage = useClackState(ClackEvents.auth, (state) => {
    const code = state.chat.authError?.code;
    if (!code) {
      return "";
    } else {
      return ErrorCodeMessages[code];
    }
  });

  const usesEmail = useClackState(ClackEvents.settings, (state) => {
    return state.chat.settings!.usesEmail;
  });

  const usesInviteCodes = useClackState(ClackEvents.settings, (state) => {
    return state.chat.settings!.usesInviteCodes;
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
            switchAuthState(ChatAuthState.Login);
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

  const login = getClackState((state) => {
    return state.chat.login;
  });

  const switchAuthState = getClackState((state) => {
    return state.chat.switchAuthState;
  });

  const state = useClackState(ClackEvents.auth, (state) => {
    return state.chat.authState;
  });

  const submit = state == ChatAuthState.OkLogin;
  const pending = state == ChatAuthState.TryLogin || submit;

  const errorMessage = useClackState(ClackEvents.auth, (state) => {
    const code = state.chat.authError?.code;
    if (!code) {
      return "";
    } else {
      return ErrorCodeMessages[code];
    }
  });

  const siteName = useClackState(ClackEvents.settings, (state) => {
    return state.chat.settings!.siteName;
  });

  const loginMessage = useClackState(ClackEvents.settings, (state) => {
    return state.chat.settings!.loginMessage;
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
            switchAuthState(ChatAuthState.Register);
          }}
        >
          Register
        </div>
      </form>
    </>
  );
}

export default function LoginScreen() {
  const state = useClackState(ClackEvents.auth, (state) => {
    return state.chat.authState;
  });

  const login =
    state == ChatAuthState.Login ||
    state == ChatAuthState.TryLogin ||
    state == ChatAuthState.OkLogin;
  const register =
    state == ChatAuthState.Register ||
    state == ChatAuthState.TryRegister ||
    state == ChatAuthState.OkRegister;

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
