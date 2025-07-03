import { format, isToday, isYesterday } from "date-fns";
import Rand from "rand-seed";
import { sha256 } from "js-sha256";
import Cookies from "universal-cookie";
import { AttachmentType } from "./types";

import {
  FaFile,
  FaFileImage,
  FaFileVideo,
  FaFileAudio,
  FaFileAlt,
  FaFileCode,
  FaFileArchive,
  FaFilePdf,
} from "react-icons/fa";

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

export function StringSearchScore(
  needle: string,
  haystack: string,
  divider: string | undefined = undefined
) {
  if (needle.length == 0) return 0.0;
  if (haystack.length == 0) return 0.0;
  needle = needle.toLowerCase();
  haystack = haystack.toLowerCase();
  var score = 0;
  const i = haystack.indexOf(needle);
  if (i >= 0) {
    score += needle.length / haystack.length;
    score += 1 - i / haystack.length;

    const next = haystack[i + needle.length];
    const prev = haystack[i - 1];
    if (next === undefined || next === divider) {
      score += 1.0;
    }
    if (prev === undefined || prev === divider) {
      score += 1.0;
    }
    if (haystack.length == needle.length) {
      score += 100.0;
    }
  }
  return score;
}

export function isInsideRect(
  x: number,
  y: number,
  rect: { x: number; y: number; width: number; height: number }
) {
  return (
    x >= rect.x &&
    x <= rect.x + rect.width &&
    y >= rect.y &&
    y <= rect.y + rect.height
  );
}

export function isInsideSelection(e: {
  clientX: number;
  clientY: number;
}): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  console.log("SELECTION RECT", rect, e);

  return isInsideRect(e.clientX, e.clientY, rect);
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

export function FormatDateTimeLong(date: Date) {
  return format(date, "EEEE, MMMM do, y 'at' h:mm a");
}

export function FormatTime(date: Date) {
  return format(date, "h:mm a");
}

export function FormatBytes(bytes?: number) {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  if (bytes == undefined) return "??";

  var size = bytes;
  for (var i = 0; i < sizes.length; i++) {
    if (size < 1024 || i == sizes.length - 1) {
      return `${parseFloat(size.toFixed(2))} ${sizes[i]}`;
    }
    size /= 1024;
  }

  return `??`;
}

export function FormatColor(color: number | undefined, alpha: number = 1.0) {
  if (color == undefined) return undefined;
  var result = `#${color.toString(16).padStart(6, "0")}`;
  if (alpha != 1.0) {
    result += Math.floor(alpha * 255)
      .toString(16)
      .padStart(2, "0");
  }
  return result;
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

export function MakeSnowflake() {
  const EPOCH = 1288834974657;

  const TIMESTAMP = BigInt(Date.now() - EPOCH) << 22n;
  const MACHINE = BigInt(1023) << 12n;
  const COUNTER = BigInt(snowflakeCounter % 4096);
  snowflakeCounter += 1;

  return (TIMESTAMP | MACHINE | COUNTER).toString();
}

export function ChooseFiles(): Promise<File[]> {
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

export function GetFileType(mimetype: string): AttachmentType {
  if (mimetype.startsWith("image/")) {
    return AttachmentType.Image;
  } else if (mimetype.startsWith("video/")) {
    return AttachmentType.Video;
  } else if (mimetype.startsWith("audio/")) {
    return AttachmentType.Audio;
  } else if (mimetype.startsWith("text/")) {
    return AttachmentType.Text;
  } else {
    return AttachmentType.File;
  }
}

export function GetFileIcon(name: string, mimetype: string) {
  if (mimetype.startsWith("image/")) {
    return <FaFileImage />;
  } else if (mimetype.startsWith("video/")) {
    return <FaFileVideo />;
  } else if (mimetype.startsWith("audio/")) {
    return <FaFileAudio />;
  } else if (mimetype.startsWith("text/")) {
    if (name.endsWith(".txt") || name.endsWith(".md")) {
      return <FaFileAlt />;
    } else {
      return <FaFileCode />;
    }
  } else if (mimetype.endsWith("zip")) {
    return <FaFileArchive />;
  } else if (mimetype.endsWith("pdf")) {
    return <FaFilePdf />;
  } else {
    return <FaFile />;
  }
}

export function GetTooltipPosition(
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

const rollRand = new Rand();

export function Roll(min: number, max: number, gen: Rand = rollRand) {
  return Math.floor(gen.next() * (max - min)) + min;
}
