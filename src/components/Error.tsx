import React, { useEffect, useRef, useState } from "react";

export function Fallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  const msg = `${error.name}: ${error.message}`;

  const [copied, setCopied] = useState(false);

  return (
    <div className="error-boundary">
      <div className="error-boundary-title">{"Error"}</div>
      <div>{msg}</div>
      <div
        className="error-boundary-copy"
        onClick={() => {
          // This stack trace isnt sourcemapped, get the real trace from the console
          navigator.clipboard.writeText(error.stack ?? msg);
          setCopied(true);
        }}
        onMouseLeave={() => setCopied(false)}
      >
        <div className="error-boundary-title">
          {copied ? "Copied to clipboard" : "Press to copy"}
        </div>
      </div>
    </div>
  );
}

export function FallbackLayer({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="error-boundary-layer">
      <Fallback error={error} resetErrorBoundary={resetErrorBoundary} />
    </div>
  );
}

export function FallbackModal({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="error-boundary-modal">
      <Fallback error={error} resetErrorBoundary={resetErrorBoundary} />
    </div>
  );
}
