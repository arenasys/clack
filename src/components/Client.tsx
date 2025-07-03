import { useClackState, getClackState, ClackEvents } from "../state";

import { useEffect } from "react";

import useWebSocket from "react-use-websocket";

export function Client() {
  const onResponse = getClackState((state) => state.chat.onResponse);
  const popRequest = getClackState((state) => state.chat.popRequest);
  const requests = useClackState(
    ClackEvents.requests,
    (state) => state.chat.requests
  );

  const uri = `ws://${window.location.host}/gateway`;
  const token = localStorage.getItem("token");
  const opts = token ? { protocols: [token] } : {};

  const { sendMessage, lastMessage } = useWebSocket(uri, opts);

  useEffect(() => {
    if (lastMessage !== null) {
      onResponse(JSON.parse(lastMessage.data));
    }
  }, [lastMessage]);

  if (requests.length === 0) return;
  const request = popRequest();
  sendMessage(JSON.stringify(request));

  return <></>;
}

export default Client;
