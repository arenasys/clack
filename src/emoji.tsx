import { useRef } from "react";

import twemoji from "@twemoji/api";

import { useChatState, useChatStateShallow } from "./state";
import { TooltipWrapper } from "./components/Common";

import { StringSearchScore } from "./util";

import CRC32 from "crc-32";

export interface EmojiEntry {
  names: string[];
  symbol: string;
  version: number;

  diversity?: string[];
  hasMultiDiversityParent?: boolean;
  hasDiversityParent?: boolean;

  diversityChildren?: EmojiDiversity[];
  hasMultiDiversity?: boolean;
  hasDiversity?: boolean;
}

export interface EmojiChild {
  names: string[];
  symbol: string;
  version: number;
}

export interface EmojiDiversity extends EmojiChild {
  diversity: string[];
  hasMultiDiversityParent?: boolean;
  hasDiversityParent?: boolean;
}

export interface EmojiParent extends EmojiChild {
  diversityChildren?: EmojiDiversity[];
  hasMultiDiversity?: boolean;
  hasDiversity?: boolean;
}

export interface EmojiMap {
  [category: string]: EmojiParent[];
}

export interface EmojiIndexEntry extends EmojiEntry {
  id: Snowflake;
  codePoint: string;
  index: number;
}
export interface EmojiIndex {
  [key: string | number]: EmojiIndexEntry;
}

export interface EmojiNames {
  [name: string]: string[];
}

import emojiMapRaw from "./assets/emoji_map.json";
export const emojiMap: EmojiMap = emojiMapRaw as EmojiMap;

import emojiNamesRaw from "./assets/emoji_names.json";
import { Snowflake } from "./models";
export const emojiNames: EmojiNames = emojiNamesRaw as EmojiNames;

export const emojiIndex: EmojiIndex = (() => {
  const idx: EmojiIndex = {};
  var i = 0;
  EmojiFind((emoji) => {
    const codePoint = EmojiToCodePoint(emoji.symbol);
    const entry = {
      ...emoji,
      codePoint: codePoint,
      index: i,
      id: (CRC32.str(codePoint) >>> 0).toString(),
    };
    idx[entry.names[0]] = entry;
    idx[entry.symbol] = entry;
    idx[entry.codePoint] = entry;
    idx[entry.index] = entry;
    idx[entry.id] = entry;
    i++;
    return false;
  }, true);
  return idx;
})();

export function EmojiToCodePoint(emoji: string): string {
  const vs = /\uFE0F/g;
  const zwj = String.fromCharCode(0x200d);

  // remove the useless variation-selectors (when raw has no zero-width-joiners)
  const processed = emoji.indexOf(zwj) < 0 ? emoji.replace(vs, "") : emoji;

  return twemoji.convert.toCodePoint(processed);
}

type EmojiMatch = { emoji: string; start: number; end: number };
export function FindEmojis(text: string): EmojiMatch[] {
  var matches: EmojiMatch[] = [];

  twemoji.replace(text, (match: string, ...args: any[]) => {
    const [, offset] = args;
    matches.push({ emoji: match, start: offset, end: offset + match.length });
    return match;
  });

  return matches;
}

export function EmojiFind(
  callback: (emoji: EmojiEntry) => boolean,
  includeChildren: boolean = false
): EmojiEntry | undefined {
  for (const category in emojiMap) {
    const emojis = emojiMap[category];
    for (const emoji of emojis) {
      if (callback(emoji)) return emoji;
      if (emoji.diversityChildren && includeChildren) {
        for (const diversity of emoji.diversityChildren) {
          if (callback(diversity)) return diversity;
        }
      }
    }
  }
}

export function EmojiLookupName(name: string): EmojiIndexEntry | undefined {
  return emojiIndex[name];
}

export function EmojiLookupSymbol(symbol: string): EmojiIndexEntry | undefined {
  return emojiIndex[symbol];
}

export function EmojiLookupIndex(index: number): EmojiIndexEntry | undefined {
  return emojiIndex[index];
}

export function EmojiLookupID(id: Snowflake): EmojiIndexEntry | undefined {
  return emojiIndex[id];
}

export function EmojiCountryByFlag(name: string): string | undefined {
  if (name.startsWith("flag_") && name.length == 7) {
    if (name in emojiNames) {
      if (emojiNames[name].length < 1) return undefined;
      return emojiNames[name][0];
    }
  }

  return undefined;
}

export function EmojiSymbolByName(name: string): string | undefined {
  return EmojiLookupName(name)?.symbol;
}

export function EmojiSymbolToName(emoji: string): string | undefined {
  const emojiObj = EmojiLookupSymbol(emoji);
  if (emojiObj) {
    return emojiObj.names[0];
  }
  return undefined;
}

export function EmojiSearchByPartialName(text: string): EmojiEntry[] {
  const emojis: [EmojiEntry, number][] = [];
  EmojiFind((emoji) => {
    const emojiName = emoji.names[0];

    var score = StringSearchScore(text, emojiName, "_");

    if (emoji.names.length > 1) {
      score = Math.max(
        score,
        ...emoji.names.map((name) => {
          return StringSearchScore(text, name, "_") * 0.5;
        })
      );
    }

    if (emojiName in emojiNames) {
      score = Math.max(
        score,
        ...emojiNames[emojiName]?.map((name) => {
          return StringSearchScore(text, name, " ") * 0.25;
        })
      );
    }

    if (score > 0) {
      emojis.push([emoji, score]);
    }

    return false;
  }, false);

  return emojis
    .sort((a, b) => {
      const d = b[1] - a[1];
      if (d !== 0) return d;
      const an = a[0].names[0];
      const bn = b[0].names[0];
      return an.localeCompare(bn, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    })
    .map((e) => e[0]);
}

export function EmojiInline({
  text,
  jumbo,
}: {
  text: string;
  jumbo?: boolean;
}) {
  const name = EmojiSymbolToName(text);

  return (
    <TooltipWrapper tooltip={`:${name}:`} direction="top" delay={500}>
      <EmojiSVG symbol={text} className={jumbo ? "jumbo" : ""} />
    </TooltipWrapper>
  );
}

export function EmojiInlineExternal({ text }: { text: string }) {
  return <EmojiSVG symbol={text} className={"external"} />;
}

export function EmojiSVG({
  symbol,
  className = "",
}: {
  symbol: string;
  className?: string;
}) {
  return (
    <img
      className={`emoji ${className}`}
      src={`/emoji/svg/${EmojiLookupSymbol(symbol)!.codePoint}.svg`}
      alt={symbol}
      draggable="false"
    />
  );
}

const ATLAS_COLS = 64;
const ATLAS_ROWS = 60;

export function EmojiPNG({
  symbol,
  size,
  className,
}: {
  symbol: string;
  size?: number;
  className?: string;
}) {
  const entry = emojiIndex[symbol];
  size = size || 40;

  const atlas = size >= 40 ? "80x80" : "40x40";

  return (
    <div
      style={{
        backgroundImage: `url(/emoji/png/${atlas}.png)`,
        backgroundSize: `${ATLAS_COLS * size}px ${ATLAS_ROWS * size}px`,
        backgroundPosition: `-${(entry.index % ATLAS_COLS) * size}px -${
          Math.floor(entry.index / ATLAS_COLS) * size
        }px`,
        width: `${size}px`,
        height: `${size}px`,
      }}
      className={className}
    ></div>
  );
}
