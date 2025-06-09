import React, { useState, useEffect } from "react";

import { useChatState, useChatStateShallow } from "../../state";
import { GatewayAuthState } from "../../gateway";

export default function LoadingScreen() {
  const isLoading = useChatState((state) => {
    if (state.gateway.authState == GatewayAuthState.Disconnected) return true;

    if (state.gateway.authState == GatewayAuthState.Loading) return true;

    return false;
  });
  const [showing, setShowing] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => {
        setShowing(false);
      }, 10);
    } else {
      setShowing(true);
    }
  }, [isLoading]);

  if (!showing) {
    return <></>;
  }
  return (
    <div className="layer-container">
      <div className="loading-screen">
        <svg
          className="loading-screen-spinner"
          width="100"
          height="100"
          viewBox="0 0 16 16"
        >
          <path
            d="m 7.4648437,2.5976563 h 1.0839844 c 0.3404235,1.3530155 1.5569009,2.3613281 3.0117189,2.3613281 0.295066,0 0.580509,-0.041542 0.851562,-0.1191407 l 0.542969,0.9394532 c -0.999169,0.9724358 -1.261276,2.5287336 -0.535156,3.7871094 0.146276,0.2534744 0.322834,0.4787547 0.523437,0.6738277 l -0.542968,0.941407 C 11.06029,10.805732 9.5847825,11.356367 8.859375,12.613281 8.7127346,12.866863 8.6054043,13.131988 8.5371094,13.402344 H 7.4492187 C 7.1039923,12.055199 5.8896311,11.054687 4.4394531,11.054688 4.1469373,11.054687 3.8634519,11.093977 3.59375,11.169922 L 3.0488281,10.228516 C 4.0448614,9.2563601 4.3074533,7.7022498 3.5820313,6.4453125 3.4343076,6.1886564 3.2543448,5.96207 3.0507813,5.765625 l 0.5410156,-0.9375 C 4.9340387,5.2085412 6.4140609,4.6575845 7.140625,3.3984375 7.2893555,3.1413479 7.396594,2.872055 7.4648437,2.5976563 Z M 8.0019531,4.7363281 C 6.2012544,4.7363281 4.7382812,6.199301 4.7382812,8 c 0,1.8009858 1.4635153,3.263672 3.2636719,3.263672 1.8006992,0 3.2636719,-1.4629729 3.2636719,-3.263672 0,-1.800985 -1.4635143,-3.2636719 -3.2636719,-3.2636719 z"
            fill="currentColor"
          />
        </svg>
      </div>
    </div>
  );
}
