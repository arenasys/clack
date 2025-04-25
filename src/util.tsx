import { format, isToday, isYesterday } from "date-fns";

import { sha256 } from "js-sha256";
import Cookies from "universal-cookie";
import { FileType } from "./models";

export function BinarySearch(
  length: number,
  callback: (i: number) => number | null
): number | null {
  var s = 0;
  var e = length - 1;

  while (s <= e) {
    var m = Math.floor((s + e) / 2);
    const v = callback(m);

    if (v === null) return null;
    if (v == 0) return m;
    if (v < 0) e = m - 1;
    else s = m + 1;
  }

  return null;
}

export function FormatDateTime(date: Date) {
  if (isToday(date)) {
    return `Today at ${format(date, "h:mm a")}`;
  } else if (isYesterday(date)) {
    return `Yesterday at ${format(date, "h:mm a")}`;
  } else {
    return format(date, "M/d/yy, h:mm a");
  }
}

export function FormatTime(date: Date) {
  return format(date, "h:mm a");
}

export function FormatColor(color: number | undefined) {
  if (color == undefined) return undefined;
  return `#${color.toString(16).padStart(6, "0")}`;
}

const cookies = new Cookies(null, { path: "/" });

export function GetCookie(name: string): string | undefined {
  return cookies.get(name);
}

export function SetCookie(name: string, value: string) {
  cookies.set(name, value, { path: "/", sameSite: "strict" });
}

export async function SHA256(text: string): Promise<string> {
  /*const msgBuffer = new TextEncoder().encode(text);

  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);

  const hashArray = Array.from(new Uint8Array(hashBuffer));

  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");*/

  return sha256(text);
}

var snowflakeCounter = 0;

export function makeSnowflake() {
  const EPOCH = 1288834974657;

  const TIMESTAMP = BigInt(Date.now() - EPOCH) << 22n;
  const MACHINE = BigInt(1023) << 12n;
  const COUNTER = BigInt(snowflakeCounter % 4096);
  snowflakeCounter += 1;

  return (TIMESTAMP | MACHINE | COUNTER).toString();
}

export function chooseFiles(): Promise<File[]> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.addEventListener("change", () => {
      if (input.files) {
        resolve(Array.from(input.files));
      } else {
        resolve([]);
      }
    });

    input.addEventListener("error", (error) => reject(error));

    input.click();
  });
}

export function getFileType(file: File): FileType {
  if (file.type.startsWith("image/")) {
    return FileType.Image;
  } else if (file.type.startsWith("video/")) {
    return FileType.Video;
  } else if (file.type.startsWith("audio/")) {
    return FileType.Audio;
  } else if (file.type.startsWith("text/")) {
    return FileType.Text;
  } else {
    return FileType.File;
  }
}

export function getTooltipPosition(
  rect: DOMRect,
  dir: "top" | "bottom" | "left" | "right"
) {
  if (dir === "top") {
    return {
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    };
  } else if (dir === "bottom") {
    return {
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8,
    };
  } else if (dir === "left") {
    return {
      x: rect.left - 8,
      y: rect.top + rect.height / 2,
    };
  } else if (dir === "right") {
    return {
      x: rect.right + 8,
      y: rect.top + rect.height / 2,
    };
  }
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}
