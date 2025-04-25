import { useChatState } from "../state";

import { useEffect } from "react";

import useWebSocket from "react-use-websocket";

export function Client() {
  const onResponse = useChatState((state) => state.onResponse);
  const requests = useChatState((state) => state.requests);
  const popRequest = useChatState((state) => state.popRequest);

  const uri = `ws://${window.location.host}/gateway`;
  const token = localStorage.getItem("token");
  const opts = token ? { protocols: [token] } : {};

  const { sendMessage, lastMessage } = useWebSocket(uri, opts);

  useEffect(() => {
    if (lastMessage !== null) {
      onResponse(JSON.parse(lastMessage.data));
    }
  }, [lastMessage]);

  useEffect(() => {
    if (requests.length === 0) return;
    const request = popRequest();
    console.log("Sending request", request);
    sendMessage(JSON.stringify(request));
  }, [requests]);

  return <></>;
}

export default Client;
