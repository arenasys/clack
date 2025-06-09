import React, { useEffect, useRef } from "react";
import { Range, Point, Path, Descendant, last } from "slate";

import { FindEmojis, EmojiInline, EmojiInlineExternal } from "./emoji";
import { GetChatStateLookups, ChatStateLookups } from "./state";
import { FormatColor } from "./util";

import hljs from "highlight.js";

export enum SyntaxStyle {
  CodeBlock = "codeblock",
  Code = "code",
  Italics = "italics",
  Bold = "bold",
  Underline = "underline",
  Strikethrough = "strikethrough",
  Escape = "escape",
  UserMention = "userMention",
  RoleMention = "roleMention",
  ChannelMention = "channelMention",
  URL = "url",
}

export enum SyntaxType {
  Content = "content",
  Start = "start",
  End = "end",
  Submatch = "submatch",
  Language = "language",
}

export type SyntaxMatcher = (
  text: string,
  callback: (match: string, ...args: any[]) => string
) => void;

export type SyntaxRule = {
  regex: RegExp;
  chr: string;
  style: SyntaxStyle;
  ranges: (match: string, offset: number, groups: string[]) => SyntaxRange[];
  html: ({
    children,
    lookups,
    params,
  }: {
    children: JSX.Element;
    lookups: ChatStateLookups;
    params: { [key: string]: string };
  }) => JSX.Element;
};

export type SyntaxRange = {
  type: SyntaxType;
  styles: SyntaxStyle[];
  start: number;
  end: number;
  hljs?: string[];
};

export type SlatePart = {
  path: Path;
  text: string;
  void?: boolean;
};

export type SlateRange = {
  type: SyntaxType;
  styles: SyntaxStyle[];
  anchor: Point;
  focus: Point;
  hljs?: string[];
};

export type SlatePartMap = {
  text: string;
  path: Path;
  start: number;
  end: number;
};

export type SlateMatch = {
  range: Range;
  text: string;
  groups: string[];
};

function commonRanges(
  offset: number,
  groups: string[],
  rule: SyntaxRule,
  submatch: boolean = true
): SyntaxRange[] {
  var ranges: SyntaxRange[] = [];

  const [start, content] = groups;

  ranges.push({
    styles: [rule.style],
    type: SyntaxType.Start,
    start: offset,
    end: offset + start.length,
  });

  ranges.push({
    type: submatch ? SyntaxType.Submatch : SyntaxType.Content,
    styles: [rule.style],
    start: offset + start.length,
    end: offset + start.length + content.length,
  });

  ranges.push({
    type: SyntaxType.End,
    styles: [rule.style],
    start: offset + start.length + content.length,
    end: offset + start.length + content.length + start.length,
  });

  return ranges;
}

function codeBlockRanges(
  offset: number,
  groups: string[],
  highlight: boolean = false
): SyntaxRange[] {
  var ranges: SyntaxRange[] = [];

  const style = codeBlockRule.style;
  const [start, content, end] = groups;

  ranges.push({
    styles: [style],
    type: SyntaxType.Start,
    start: offset,
    end: offset + start.length,
  });

  offset += start.length;

  var language = "";
  var lines = content;
  if (content.includes("\n")) {
    language = content.split("\n")[0] + "\n";
    lines = content.slice(language.length);
  }

  const validLanguage =
    highlight && hljs.getLanguage(language.trim()) !== undefined;

  if (language.length !== 0) {
    ranges.push({
      type: SyntaxType.Language,
      styles: [style],
      start: offset,
      end: offset + language.length,
      hljs: validLanguage ? ["language"] : undefined,
    });
    offset += language.length;
  }

  if (validLanguage) {
    type Node = { children: (Node | string)[]; scope?: string };
    const highlight: Node = (
      hljs.highlight(lines, { language: language.trim() })._emitter as any
    ).stack[0];

    const highlightRanges: SyntaxRange[] = [];

    function walk(node: Node, o: number, scopes: string[] = []): number {
      scopes = scopes.slice();
      if (node.scope !== undefined) {
        scopes.push(node.scope);
      }
      for (const child of node.children) {
        if (typeof child === "string") {
          highlightRanges.push({
            type: SyntaxType.Content,
            styles: [style],
            start: o,
            end: o + child.length,
            hljs: scopes.length !== 0 ? scopes.slice() : [],
          });
          o += child.length;
        } else {
          o = walk(child, o, scopes.slice());
        }
      }
      return o;
    }
    walk(highlight, offset);
    ranges.push(...highlightRanges);
  } else {
    ranges.push({
      type: SyntaxType.Content,
      styles: [style],
      start: offset,
      end: offset + lines.length,
    });
  }
  offset += lines.length;

  if (end.length !== 0) {
    ranges.push({
      type: SyntaxType.End,
      styles: [style],
      start: offset,
      end: offset + end.length,
    });
    offset += end.length;
  }

  return ranges;
}

export const codeBlockRule: SyntaxRule = {
  chr: "```",
  style: SyntaxStyle.CodeBlock,
  regex: /^(```)([\s\S]*?)(```|$)/,
  ranges: (_, offset, groups) => {
    return codeBlockRanges(offset, groups, false);
  },
  html: ({ children, lookups, params }) => {
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
      if (ref.current && params.language) {
        const lang = params.language.trim();
        if (hljs.getLanguage(lang)) {
          hljs.highlightElement(ref.current);
        }
      }
    }, [ref.current]);

    return (
      <pre>
        <code ref={ref} className={`${params.language ?? ""}`}>
          {children}
        </code>
      </pre>
    );
  },
};

export const codeBlockHighlightRule: SyntaxRule = {
  chr: codeBlockRule.chr,
  style: codeBlockRule.style,
  regex: codeBlockRule.regex,
  ranges: (_, offset, groups) => {
    return codeBlockRanges(offset, groups, true);
  },
  html: codeBlockRule.html,
};

export const codeRule: SyntaxRule = {
  chr: "`",
  style: SyntaxStyle.Code,
  regex: /^(`{1,2})([\s\S]*?[^`])(\1)(?!`)/g,
  ranges: (_, offset, groups) => {
    return commonRanges(offset, groups, codeRule, false);
  },
  html: ({ children, lookups, params }) => {
    return <code className="inline">{children}</code>;
  },
};

export const italicsRule: SyntaxRule = {
  chr: "*",
  style: SyntaxStyle.Italics,
  regex: /^(\*)((?:\\[\s\S]|[^\\])+?)(\*)(?!\*)/,
  ranges: (_, offset, groups) => {
    return commonRanges(offset, groups, italicsRule);
  },
  html: ({ children, lookups, params }) => {
    return <i>{children}</i>;
  },
};

export const italicsAltRule: SyntaxRule = {
  chr: "_",
  style: SyntaxStyle.Italics,
  regex: /^(\_)((?:\\[\s\S]|[^\\])+?)(\_)(?!\_)/,
  ranges: (_, offset, groups) => {
    return commonRanges(offset, groups, italicsAltRule);
  },
  html: italicsRule.html,
};

export const boldRule: SyntaxRule = {
  chr: "**",
  style: SyntaxStyle.Bold,
  regex: /^(\*\*)((?:\\[\s\S]|[^\\])+?)(\*\*)(?!\*)/,
  ranges: (_, offset, groups) => {
    return commonRanges(offset, groups, boldRule);
  },
  html: ({ children, lookups, params }) => {
    return <b>{children}</b>;
  },
};

export const underlineRule: SyntaxRule = {
  chr: "__",
  style: SyntaxStyle.Underline,
  regex: /^(__)((?:\\[\s\S]|[^\\])+?)(__)(?!_)/,
  ranges: (_, offset, groups) => {
    return commonRanges(offset, groups, underlineRule);
  },
  html: ({ children, lookups, params }) => {
    return <u>{children}</u>;
  },
};

export const strikethroughRule: SyntaxRule = {
  chr: "~~",
  style: SyntaxStyle.Strikethrough,
  regex: /^(~~)((?:\\[\s\S]|[^\\])+?)(~~)(?!~)/,
  ranges: (_, offset, groups) => {
    return commonRanges(offset, groups, strikethroughRule);
  },
  html: ({ children, lookups, params }) => {
    return <s>{children}</s>;
  },
};

export const escapeRule: SyntaxRule = {
  chr: "\\",
  style: SyntaxStyle.Escape,
  regex: /^(\\)([`\*\_~@])/,
  ranges: (match: string, offset: number, groups: string[]) => {
    const ranges: SyntaxRange[] = [
      {
        type: SyntaxType.Start,
        styles: [escapeRule.style],
        start: offset,
        end: offset + groups[0].length,
      },
      {
        type: SyntaxType.Content,
        styles: [],
        start: offset + groups[0].length,
        end: offset + match.length,
      },
    ];
    return ranges;
  },
  html: ({ children, lookups, params }) => {
    return <span>{children}</span>;
  },
};

export const userMentionRule: SyntaxRule = {
  chr: "<@",
  style: SyntaxStyle.UserMention,
  regex: /^<@([0-9]+)>/,
  ranges: (match: string, offset: number, groups: string[]) => {
    const ranges: SyntaxRange[] = [
      {
        type: SyntaxType.Content,
        styles: [userMentionRule.style],
        start: offset,
        end: offset + match.length,
      },
    ];
    return ranges;
  },
  html: ({ children, lookups, params }) => {
    const text = children.props.children[0];
    const id = userMentionRule.regex.exec(text)?.[1];
    if (id !== undefined) {
      const user = lookups.lookupUser(undefined, id);
      console.log("USER", id, user);
      if (user !== undefined) {
        return (
          <span
            className="inline-mention inline-button"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              lookups.setUserPopup({
                id: user.id,
                user: user,
                position: {
                  x: rect.right + 8,
                  y: rect.top,
                },
                direction: "right",
              });
            }}
          >{`@${user.nickname ?? user.username}`}</span>
        );
      }
    }
    return (
      <span className="inline-mention inline-button">{"@Unknown User"}</span>
    );
  },
};

export const roleMentionRule: SyntaxRule = {
  chr: "<@&",
  style: SyntaxStyle.RoleMention,
  regex: /^<@&([0-9]+)>/,
  ranges: (match: string, offset: number, groups: string[]) => {
    const ranges: SyntaxRange[] = [
      {
        type: SyntaxType.Content,
        styles: [roleMentionRule.style],
        start: offset,
        end: offset + match.length,
      },
    ];
    return ranges;
  },
  html: ({ children, lookups, params }) => {
    const text = children.props.children[0];
    const id = roleMentionRule.regex.exec(text)?.[1];
    if (id !== undefined) {
      const role = lookups.lookupRole(undefined, id);
      if (role !== undefined) {
        const color = FormatColor(role.color);
        const backgroundColor = FormatColor(role.color, 0.15);
        return (
          <span
            className="inline-mention inline-button"
            style={{
              backgroundColor: backgroundColor,
              color: color,
            }}
          >{`@${role.name}`}</span>
        );
      }
    }
    return (
      <span className="inline-mention inline-button">{"@Unknown Role"}</span>
    );
  },
};

export const channelMentionRule: SyntaxRule = {
  chr: "<#",
  style: SyntaxStyle.ChannelMention,
  regex: /^<#([0-9]+)>/,
  ranges: (match: string, offset: number, groups: string[]) => {
    const ranges: SyntaxRange[] = [
      {
        type: SyntaxType.Content,
        styles: [channelMentionRule.style],
        start: offset,
        end: offset + match.length,
      },
    ];
    return ranges;
  },
  html: ({ children, lookups, params }) => {
    const text = children.props.children[0];
    const id = channelMentionRule.regex.exec(text)?.[1];
    var name = "Unknown Channel";
    if (id !== undefined) {
      const channel = lookups.lookupChannel(undefined, id);
      if (channel !== undefined) {
        name = channel.name;
      }
    }
    return (
      <span className="inline-mention inline-button">
        <span className="inline-mention-hashtag">{"# "}</span>
        {`${name}`}
      </span>
    );
  },
};

export const urlRule: SyntaxRule = {
  chr: "http",
  style: SyntaxStyle.URL,
  regex: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
  ranges: (match: string, offset: number, groups: string[]) => {
    const ranges: SyntaxRange[] = [
      {
        type: SyntaxType.Content,
        styles: [urlRule.style],
        start: offset,
        end: offset + match.length,
      },
    ];
    return ranges;
  },
  html: ({ children, lookups, params }) => {
    const text = children.props.children[0];
    return (
      <a href={text} target="_blank" rel="noopener noreferrer">
        {text}
      </a>
    );
  },
};

export const lineRuleOrdering: SyntaxRule[] = [
  escapeRule,
  codeRule,
  underlineRule,
  boldRule,
  italicsRule,
  italicsAltRule,
  strikethroughRule,
  urlRule,
];

export const globalRuleOrdering: SyntaxRule[] = [
  escapeRule,
  codeBlockHighlightRule,
];

export const fullRuleOrdering: SyntaxRule[] = [
  escapeRule,
  codeBlockRule,
  codeRule,
  underlineRule,
  boldRule,
  italicsRule,
  italicsAltRule,
  strikethroughRule,
  userMentionRule,
  roleMentionRule,
  channelMentionRule,
  urlRule,
];

export const ruleMap = {
  [SyntaxStyle.CodeBlock]: codeBlockRule,
  [SyntaxStyle.Code]: codeRule,
  [SyntaxStyle.Italics]: italicsRule,
  [SyntaxStyle.Bold]: boldRule,
  [SyntaxStyle.Underline]: underlineRule,
  [SyntaxStyle.Strikethrough]: strikethroughRule,
  [SyntaxStyle.Escape]: escapeRule,
  [SyntaxStyle.UserMention]: userMentionRule,
  [SyntaxStyle.RoleMention]: roleMentionRule,
  [SyntaxStyle.ChannelMention]: channelMentionRule,
  [SyntaxStyle.URL]: urlRule,
};

function ParseMatch(
  match: string,
  ...args: any[]
): [string, number, string[]] | undefined {
  const offsetIndex = args.findIndex((arg) => typeof arg === "number");
  if (offsetIndex === -1) return;

  const matchOffset: number = args[offsetIndex];
  const matchGroups: string[] = args.slice(0, offsetIndex);
  if (matchOffset === undefined) return;

  return [match, matchOffset, matchGroups];
}

function ParseRanges(
  text: string,
  types: SyntaxStyle[] = [],
  rules: SyntaxRule[] = lineRuleOrdering
): SyntaxRange[] {
  var ranges: SyntaxRange[] = [];
  var offset = 0;
  var lastRange = 0;

  function AddPlaintext(start: number, end: number) {
    ranges.push({
      type: SyntaxType.Content,
      styles: types,
      start: start,
      end: end,
    });
  }

  while (text.length > offset) {
    const subtext = text.slice(offset);
    var found = false;

    for (const rule of rules) {
      if (subtext.length === 0 || !subtext.startsWith(rule.chr)) {
        continue;
      }

      var regex = rule.regex;

      subtext.replace(regex, (match: string, ...args: any[]) => {
        const [_, matchOffset, matchGroups] = ParseMatch(match, ...args)!;

        for (const range of rule.ranges(match, matchOffset, matchGroups)) {
          const rangeTypes = [...types, ...range.styles];

          if (!found) {
            found = true;

            if (offset + matchOffset > lastRange) {
              AddPlaintext(lastRange, offset + matchOffset);
            }
          }

          lastRange = Math.max(lastRange, range.end + offset);

          if (range.type === SyntaxType.Submatch) {
            const suboffset = range.start + offset;
            const subsubtext = text.slice(
              range.start + offset,
              range.end + offset
            );
            for (const subrange of ParseRanges(subsubtext, rangeTypes, rules)) {
              ranges.push({
                type: subrange.type,
                styles: subrange.styles,
                start: subrange.start + suboffset,
                end: subrange.end + suboffset,
              });
            }
          } else {
            ranges.push({
              type: range.type,
              styles: rangeTypes,
              start: range.start + offset,
              end: range.end + offset,
              hljs: range.hljs,
            });
          }
        }
        return match;
      });
      if (found) {
        break;
      }
    }
    offset = Math.max(offset + 1, lastRange);
  }

  if (lastRange < offset) {
    AddPlaintext(lastRange, offset);
  }

  //console.log("RANGES", text, types, ranges);

  return ranges;
}

function OffsetToPoint(
  parts: SlatePartMap[],
  offset: number
): Point | undefined {
  for (const part of parts) {
    if (part.start <= offset && part.end >= offset) {
      return {
        path: part.path,
        offset: offset - part.start,
      };
    }
  }
  return undefined;
}

function PartsToMap(parts: SlatePart[]): [SlatePartMap[], string] {
  var text = "";
  var partMap: SlatePartMap[] = [];

  for (const part of parts) {
    if (part.text.length === 0) {
      continue;
    }

    var start = text.length;
    var end = start + part.text.length;

    if (part.void === true) {
      start += 1;
      end -= 1;
    }

    partMap.push({
      text: part.text,
      path: part.path,
      start: start,
      end: end,
    });
    text += part.text;
  }

  return [partMap, text];
}

function GetDecorations(parts: SlatePart[], rules: SyntaxRule[]): SlateRange[] {
  const [partMap, text] = PartsToMap(parts);

  var ranges: SyntaxRange[] = ParseRanges(text, [], rules);
  var slateRanges: SlateRange[] = [];

  for (const range of ranges) {
    if (range.styles.length === 0) {
      continue;
    }

    const start = OffsetToPoint(partMap, range.start);
    const end = OffsetToPoint(partMap, range.end);

    if (start === undefined || end === undefined) {
      console.log("Invalid range", range);
      continue;
    }

    slateRanges.push({
      type: range.type,
      styles: [...new Set(range.styles)],
      hljs: range.hljs?.slice(),
      anchor: start,
      focus: end,
    });
  }

  return slateRanges;
}

export function GetLineDecoration(parts: SlatePart[]): SlateRange[] {
  return GetDecorations(parts, lineRuleOrdering);
}

export function GetGlobalDecoration(parts: SlatePart[]): SlateRange[] {
  console.log("GetGlobalDecoration");
  return GetDecorations(parts, globalRuleOrdering);
}

export function GetMatches(
  parts: SlatePart[],
  find: SyntaxMatcher
): SlateMatch[] {
  var matches: SlateMatch[] = [];

  const [partMap, text] = PartsToMap(parts);

  find(text, (match: string, ...args: any[]) => {
    const [_, matchOffset, matchGroups] = ParseMatch(match, ...args)!;

    const start = OffsetToPoint(partMap, matchOffset);
    const end = OffsetToPoint(partMap, matchOffset + match.length);

    //console.log("MATCH", text, match, matchOffset, start, end);

    if (start === undefined || end === undefined) {
      return match;
    }

    matches.push({
      range: {
        anchor: start,
        focus: end,
      },
      text: match,
      groups: matchGroups,
    });

    return match;
  });

  return matches;
}

export function SyntaxContent({ text }: { text: string }) {
  const lookups = GetChatStateLookups();

  var ranges: SyntaxRange[] = ParseRanges(text, [], fullRuleOrdering);

  var elements = [];

  var lang = "";
  var i = 0;

  for (const range of ranges) {
    if (range.type == SyntaxType.Language) {
      lang = text.slice(range.start, range.end).trim();
    }
    if (range.type == SyntaxType.Content) {
      const elementText = text.slice(range.start, range.end);

      var elementChildren: (JSX.Element | string)[] = [];

      var last = 0;
      for (const match of FindEmojis(elementText)) {
        if (match.start > last) {
          elementChildren.push(elementText.substring(last, match.start));
        }
        const jumbo = match.start == 0 && match.end == text.length;
        elementChildren.push(
          <EmojiInline text={match.emoji} jumbo={jumbo} key={`range-${i++}`} />
        );
        last = match.end;
      }

      if (last < elementText.length) {
        elementChildren.push(elementText.substring(last));
      }

      var element: JSX.Element = <>{elementChildren}</>;
      for (const type of range.styles) {
        const rule = ruleMap[type];
        if (rule === undefined) {
          continue;
        }
        element = (
          <rule.html
            lookups={lookups}
            params={{ language: lang }}
            key={`range-${i++}`}
          >
            {element}
          </rule.html>
        );
      }

      elements.push(element);
    }
  }

  var ret = (
    <>{elements.map((e, i) => React.cloneElement(e, { key: `range-${i}` }))}</>
  );

  return ret;
}

export function EmojiContent({ text }: { text: string }) {
  var children: (JSX.Element | string)[] = [];
  var last = 0;
  var i = 0;
  for (const match of FindEmojis(text)) {
    if (match.start > last) {
      children.push(text.substring(last, match.start));
    }
    children.push(
      <EmojiInlineExternal text={match.emoji} key={`range-${i++}`} />
    );
    last = match.end;
  }

  if (last < text.length) {
    children.push(text.substring(last));
  }

  return <>{children}</>;
}
