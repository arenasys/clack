import { useRef } from "react";

import twemoji from "@twemoji/api";

import { useChatState, useChatStateShallow } from "./state";
import { TooltipWrapper } from "./components/Common";

import fuzzysort from "fuzzysort";

export interface EmojiEntry {
  names: string[];
  symbol: string;
  version: number;
}

export interface EmojiDiversity extends EmojiEntry {
  diversity: string[];
  hasMultiDiversityParent?: boolean;
  hasDiversityParent?: boolean;
}

export interface EmojiParent extends EmojiEntry {
  diversityChildren?: EmojiDiversity[];
  hasMultiDiversity?: boolean;
  hasDiversity?: boolean;
}

export interface EmojiMap {
  [category: string]: EmojiParent[];
}

import emojiMapRaw from "./assets/emoji_map.json";

const emojiMap: EmojiMap = emojiMapRaw as EmojiMap;

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

export function ReplaceEmojis(text: string): JSX.Element {
  var last = 0;

  var elements: (JSX.Element | string)[] = [];

  for (const match of FindEmojis(text)) {
    elements.push(text.substring(last, match.start));
    elements.push(<EmojiInline text={match.emoji} />);
    last = match.end;
  }

  if (last < text.length) {
    elements.push(text.substring(last));
  }

  return <>{elements}</>;
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

export function EmojiLookupName(name: string): EmojiEntry | undefined {
  return EmojiFind((emoji) => {
    return emoji.names.includes(name);
  });
}

export function EmojiLookupSymbol(symbol: string): EmojiEntry | undefined {
  return EmojiFind((emoji) => {
    return emoji.symbol === symbol;
  });
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
    var score = fuzzysort.single(text, emoji.names[0]);
    //var score = StringSearchScore(text, emoji.names[0], "_");
    if (score && score.score > 0) {
      emojis.push([emoji, score.score]);
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

export function EmojiInline({ text }: { text: string }) {
  const codePoint = EmojiToCodePoint(text);
  const name = EmojiSymbolToName(text);

  return (
    <TooltipWrapper
      tooltip={`:${name}:`}
      tooltipDirection="top"
      tooltipDelay={500}
    >
      <img
        className="emoji"
        src={`/emoji/svg/${codePoint}.svg`}
        alt={text}
        draggable="false"
        data-slate-type="inline-emoji"
      />
    </TooltipWrapper>
  );
}
