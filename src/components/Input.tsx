// @refresh reset
import { useClackState, getClackState } from "../state";

import React, {
  useCallback,
  useMemo,
  useLayoutEffect,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  Slate,
  Editable,
  withReact,
  RenderElementProps,
  RenderLeafProps,
  ReactEditor,
} from "slate-react";
import {
  Text,
  Editor,
  createEditor,
  Range,
  Point,
  Path,
  Descendant,
  Operation,
  BaseEditor,
  Transforms,
  Element,
  Node,
} from "slate";
import { HistoryEditor, withHistory } from "slate-history";

import { isKeyHotkey } from "is-hotkey";

import { EmojiInline, EmojiSymbolToName, EmojiSymbolByName } from "../emoji";

import {
  GetLineDecoration,
  GetGlobalDecoration,
  SlatePart,
  SlateRange,
  SlateMatch,
  GetMatches,
  SyntaxMatcher,
  SyntaxStyle,
  SyntaxType,
} from "../syntax";

import twemoji from "@twemoji/api";

import { FormatColor } from "../util";
import { User, Role, Channel } from "../types";

type LineElement = {
  type: "line";
  children: (
    | TextElement
    | EmojiElement
    | UserMentionElement
    | RoleMentionElement
    | ChannelMentionElement
  )[];
};
type EmojiElement = {
  type: "emoji";
  emoji: string;
  children: TextElement[];
};
type UserMentionElement = {
  type: "userMention";
  user: User;
  children: TextElement[];
};
type RoleMentionElement = {
  type: "roleMention";
  role: Role;
  children: TextElement[];
};
type ChannelMentionElement = {
  type: "channelMention";
  channel: Channel;
  children: TextElement[];
};
/*type CodeLineElement = {
  type: "codeLine";
  children: TextElement[];
};*/
type TextElement = {
  text: string;
};

type InlineElement =
  | EmojiElement
  | UserMentionElement
  | RoleMentionElement
  | ChannelMentionElement;

function IsInlineElement(type: string): boolean {
  return (
    type === "emoji" ||
    type === "userMention" ||
    type === "roleMention" ||
    type === "channelMention"
  );
}

const emojiRegex = /(?<!\\):(\w+):/g;
const mentionRegex = /(?<=\s|^)(@|#)([\w]+)(?=[\s#@:])/g;
const inlineCodeRegex = /(?<!\\)(`{1,2})([\s\S]*?[^`])(\1)(?!`)/g; // syntax, codeRule
const codeBlockRegex = /(?<!\\)(`{3})([\s\S]*?)(\1)(?!`)/g;

enum PlaintextType {
  USER = 1,
  PARSE = 2,
  ENCODED = 3,
}

function ToPlaintext(element: InlineElement, type: PlaintextType): string {
  if (type == PlaintextType.USER) {
    switch (element.type) {
      case "emoji":
        return `:${EmojiSymbolToName(element.emoji)}:`;
      case "userMention":
        return `@${element.user.username}`;
      case "roleMention":
        return `@${element.role.name}`;
      case "channelMention":
        return `#${element.channel.name}`;
    }
  }
  if (type == PlaintextType.PARSE) {
    switch (element.type) {
      case "emoji":
        return element.emoji;
      case "userMention":
        return `@@${element.user.username} `;
      case "roleMention":
        return `#@${element.role.name} `;
      case "channelMention":
        return `##${element.channel.name} `;
    }
  }
  if (type == PlaintextType.ENCODED) {
    switch (element.type) {
      case "emoji":
        return element.emoji;
      case "userMention":
        return `<@${element.user.id}>`;
      case "roleMention":
        return `<@&${element.role.id}>`;
      case "channelMention":
        return `<#${element.channel.id}>`;
    }
  }
  return "";
}

declare module "slate" {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor;
    Element: LineElement | InlineElement;
    Text: TextElement;
  }
}

function GetFragmentString(
  fragment: Descendant[],
  type: PlaintextType
): string {
  var lines: string[] = [];
  for (const node of fragment) {
    var line = "";
    if (Element.isElement(node)) {
      if (node.type === "line") {
        for (const child of node.children) {
          if (Text.isText(child)) {
            line += child.text;
          } else if (Element.isElement(child)) {
            line += ToPlaintext(child, type);
          }
        }
      }
    }

    lines.push(line);
  }
  return lines.join("\n");
}

function GetElementParts(input: LineElement, path: Path): SlatePart[] {
  var parts: SlatePart[] = [];
  for (var i = 0; i < input.children.length; i++) {
    const child = input.children[i];
    const childPath = [...path, i];
    var childText = "";
    var childVoid = false;

    if (Text.isText(child)) {
      childText = child.text;
    } else if (Element.isElement(child)) {
      childText = ToPlaintext(child, PlaintextType.PARSE);
      childVoid = true;
    }

    parts.push({
      path: childPath,
      text: childText,
      void: childVoid,
    });
  }
  return parts;
}

function GetEditorParts(editor: FullEditor): SlatePart[] {
  var parts: SlatePart[] = [];
  const l = editor.children.length;

  for (var i = 0; i < l; i++) {
    const child = editor.children[i];
    if (Element.isElement(child) && child.type === "line") {
      parts.push(...GetElementParts(child, [i]));
      if (i < l - 1) {
        parts[parts.length - 1].text += "\n";
      }
    }
  }

  return parts;
}

function GetRegexMatches(parts: SlatePart[], regex: RegExp): SlateMatch[] {
  return GetMatches(parts, (text, callback) => {
    text.replace(regex, callback);
  });
}

function GetEmojiMatches(parts: SlatePart[]): SlateMatch[] {
  return GetMatches(parts, (text, callback) => {
    twemoji.replace(text, callback);
  });
}

function NormalizeElement(
  editor: BaseEditor & ReactEditor,
  path: Path,
  selectLeft: boolean = false,
  selectRight: boolean = false
): number {
  const parent = Editor.parent(editor, path);
  const [parentNode, _parentPath] = parent;

  const index = path[path.length - 1];
  const siblings = parentNode.children;

  if (index === 0 || !Text.isText(siblings[index - 1])) {
    //console.log("INSERTING BEFORE", path);
    Transforms.insertNodes(
      editor,
      { text: "" },
      { at: Path.previous(path), select: selectLeft }
    );
    return -1;
  }

  if (index === siblings.length - 1 || !Text.isText(siblings[index + 1])) {
    //console.log("INSERTING AFTER", path);
    Transforms.insertNodes(
      editor,
      { text: "" },
      { at: Path.next(path), select: selectRight }
    );
    return 1;
  }

  return 0;
}

function ReplaceRangeWithElement(
  editor: BaseEditor & ReactEditor,
  range: Range,
  elem: Node
) {
  var onLeft = false;
  var onRight = false;

  if (editor.selection && Range.isCollapsed(editor.selection)) {
    onLeft = Point.equals(editor.selection.anchor, range.anchor);
    onRight = Point.equals(editor.selection.focus, range.focus);
  }

  Transforms.delete(editor, {
    at: range,
  });

  Transforms.insertNodes(editor, elem, {
    at: range.anchor,
    select: onLeft || onRight,
  });

  const path = Path.next(range.anchor.path);
  if (NormalizeElement(editor, path, onLeft, onRight) == 0) {
    if (onLeft) {
      Transforms.move(editor, { distance: 1, unit: "offset", reverse: true });
    }
    if (onRight) {
      Transforms.move(editor, { distance: 1, unit: "offset" });
    }
  }
}

function IsInRanges(target: Path | Point | Range, ranges: Range[]): boolean {
  for (const range of ranges) {
    if (Range.includes(range, target)) {
      return true;
    }
  }
  return false;
}

function ReplaceMatches(
  matches: SlateMatch[],
  editor: BaseEditor & ReactEditor,
  parts: SlatePart[],
  excludedRanges: Range[],
  replacement: (match: SlateMatch) => Node | string | undefined
): boolean {
  for (const match of matches) {
    const e = replacement(match);
    if (e === undefined) continue;

    if (IsInRanges(match.range, excludedRanges)) continue;

    //console.log("REPLACING MATCH", parts, match);

    if (typeof e === "string") {
      Transforms.delete(editor, {
        at: match.range,
      });
      Transforms.insertText(editor, e, {
        at: match.range.anchor,
      });
    } else {
      ReplaceRangeWithElement(editor, match.range, e);
    }

    return true;
  }
  return false;
}

function GetCodeBlockRanges(editor: FullEditor): Range[] {
  return GetRegexMatches(GetEditorParts(editor), codeBlockRegex).map(
    (match) => {
      const inset = match.groups[0].length;
      return {
        anchor: {
          path: match.range.anchor.path,
          offset: match.range.anchor.offset + inset,
        },
        focus: {
          path: match.range.focus.path,
          offset: match.range.focus.offset - inset,
        },
      };
    }
  );
}

function GetInlineCodeMatches(parts: SlatePart[]): SlateMatch[] {
  return GetRegexMatches(parts, inlineCodeRegex);
}

function GetInlineCodeRanges(parts: SlatePart[]): Range[] {
  return GetRegexMatches(parts, inlineCodeRegex).map((match) => {
    const inset = match.groups[0].length;
    return {
      anchor: {
        path: match.range.anchor.path,
        offset: match.range.anchor.offset + inset,
      },
      focus: {
        path: match.range.focus.path,
        offset: match.range.focus.offset - inset,
      },
    };
  });
}

function GetCodeRanges(editor: FullEditor, lineParts: SlatePart[]): Range[] {
  return GetCodeBlockRanges(editor).concat(GetInlineCodeRanges(lineParts));
}

interface CustomEditor extends BaseEditor {
  decorations: any;
}

type FullEditor = BaseEditor & ReactEditor & HistoryEditor & CustomEditor;

const withCustom = (
  baseEditor: BaseEditor & ReactEditor & HistoryEditor
): FullEditor => {
  var editor: FullEditor = baseEditor as FullEditor;
  editor.decorations = [];

  const lookupUser = getClackState((state) => state.chat.lookupUser);
  const lookupRole = getClackState((state) => state.chat.lookupRole);
  const lookupChannel = getClackState((state) => state.chat.lookupChannel);

  const { normalizeNode, isInline, isVoid } = editor;

  editor.isInline = (element) =>
    IsInlineElement(element.type) ? true : isInline(element);
  editor.isVoid = (element) =>
    IsInlineElement(element.type) ? true : isVoid(element);

  editor.normalizeNode = (entry) => {
    const [node, path] = entry;

    // normalize inlines to always have text siblings on either side, required for selection to work.
    if (
      Element.isElement(node) &&
      (node.type === "emoji" || node.type === "userMention")
    ) {
      NormalizeElement(editor, path);
    }

    if (Element.isElement(node) && node.type === "line") {
      var altered = false;
      const parts = GetElementParts(node, path);
      const codeRanges = GetCodeRanges(editor, parts);

      if (!altered) {
        // replace inline elements inside code with their text representation
        for (const range of codeRanges) {
          for (let i = 0; i <= node.children.length; i++) {
            const child = node.children[i];
            const childPath = [...path, i];
            var text: string | undefined = undefined;
            if (
              Element.isElement(child) &&
              IsInlineElement(child.type) &&
              Range.includes(range, childPath)
            ) {
              text = ToPlaintext(child, PlaintextType.USER);
              console.log("COLLAPSING INLINE", child.type, text);
            }

            if (text !== undefined) {
              Transforms.insertNodes(
                editor,
                { text: text },
                { at: Path.next(childPath), select: false }
              );
              Transforms.removeNodes(editor, {
                at: childPath,
              });
              altered = true;
            }
          }
        }
      }

      // replace emoji names (:emoji:) with an emoji element
      if (!altered) {
        altered = ReplaceMatches(
          GetRegexMatches(parts, emojiRegex),
          editor,
          parts,
          codeRanges,
          (match) => {
            const name = match.groups[0];
            const emoji = EmojiSymbolByName(name);
            if (emoji === undefined) return undefined;

            return {
              type: "emoji",
              emoji: emoji,
              children: [{ text: "" }],
            };
          }
        );
      }

      // replace mentions (@user) with an inline mention element
      if (!altered) {
        altered = ReplaceMatches(
          GetRegexMatches(parts, mentionRegex),
          editor,
          parts,
          codeRanges,
          (match) => {
            const type = match.groups[0];
            const name = match.groups[1];
            if (type === "@") {
              const role = lookupRole(name, undefined);
              if (role !== undefined) {
                return {
                  type: "roleMention",
                  role: role,
                  children: [{ text: "" }],
                };
              }
              const user = lookupUser(name, undefined);
              if (user !== undefined) {
                return {
                  type: "userMention",
                  user: user,
                  children: [{ text: "" }],
                };
              }
            }
            if (type === "#") {
              const channel = lookupChannel(name, undefined);
              if (channel !== undefined) {
                return {
                  type: "channelMention",
                  channel: channel,
                  children: [{ text: "" }],
                };
              }
            }
            return undefined;
          }
        );
      }

      // replace emoji unicode (🔥) with an emoji element or name
      if (!altered) {
        altered = ReplaceMatches(
          GetEmojiMatches(parts),
          editor,
          parts,
          [],
          (match) => {
            var isEmojiElement =
              [
                ...Editor.nodes(editor, {
                  at: match.range,
                  match: (n) => Element.isElement(n) && n.type === "emoji",
                  mode: "all",
                }),
              ].length != 0;
            if (isEmojiElement) return;

            const emoji = match.text;
            const name = EmojiSymbolToName(emoji);
            if (name === undefined) return;

            if (IsInRanges(match.range, codeRanges)) {
              return `:${name}:`;
            } else {
              return {
                type: "emoji",
                emoji: emoji,
                children: [{ text: "" }],
              };
            }
          }
        );
      }
    }

    normalizeNode(entry);
  };

  return editor;
};

export interface MarkdownTextboxRef {
  clear: () => void;
  complete: (word: string, completion: string) => void;
  insert: (text: string) => void;
  setValue: (value: Descendant[]) => void;
  focus: () => void;
  blur: () => void;
  capture: (e: KeyboardEvent) => void;
}

export const MarkdownTextbox = forwardRef(function MarkdownTextbox(
  {
    value,
    placeholder,
    onValue,
  }: {
    value?: string | Descendant[];
    placeholder?: string;
    onValue: (text: string, cursor: number, value: Descendant[]) => void;
  },
  ref
) {
  const lastValue = useRef<string | undefined>(undefined);
  const cachedDecorations = useRef<SlateRange[] | undefined>(undefined);

  useImperativeHandle(ref, () => ({
    clear: () => {
      Transforms.delete(editor, {
        at: {
          anchor: Editor.start(editor, []),
          focus: Editor.end(editor, []),
        },
      });
    },
    complete: (word: string, completion: string) => {
      console.log("COMPLETION", word, completion);
      for (var i = 0; i < word.length; i++) {
        Editor.deleteBackward(editor, { unit: "character" });
      }
      Transforms.insertText(editor, completion);
      ReactEditor.focus(editor);
    },
    insert: (text: string) => {
      Transforms.insertText(editor, text);
    },
    setValue: (value: Descendant[]) => {
      setValue(value);
    },
    focus: () => {
      ReactEditor.focus(editor);
    },
    blur: () => {
      ReactEditor.blur(editor);
    },
    capture: (e: KeyboardEvent) => {
      // Used to capture unhandled key events

      if (e.defaultPrevented) return;
      if (e.altKey || e.ctrlKey) return;

      console.log("CAPTURE KEY", e.key, e.code, e);

      const isModifying =
        e.key === "Enter" || e.key === "Backspace" || e.key === "Delete";
      const isPrintable = e.key.length === 1;

      if (!isModifying && !isPrintable) {
        return;
      }

      ReactEditor.focus(editor);
    },
  }));

  const editor = useMemo(() => {
    return withCustom(withHistory(withReact(createEditor())));
  }, []);

  function getInitialValue(): Descendant[] {
    var v: Descendant[] = [];

    if (Array.isArray(value)) {
      v = value;
    } else {
      v = [
        {
          type: "line",
          children: [{ text: value ?? "" }],
        },
      ];
    }

    /*if (json !== undefined && json !== "") {
      v = JSON.parse(json);
    }*/

    if (editor.children.length === 0) {
      editor.children = v;
      editor.normalize({ force: true });
      //sendOnValue();
      return editor.children;
    }
    return v;
  }

  const renderLeaf = useCallback(
    (props: RenderLeafProps) => <CustomLeaf {...props} />,
    []
  );
  const renderElement = useCallback(
    (props: RenderElementProps) => <CustomElement {...props} editor={editor} />,
    []
  );

  const decorate = useCallback(([node, path]: [any, any]) => {
    if (Element.isElement(node) && node.type === "line") {
      const lineRanges = GetLineDecoration(GetElementParts(node, path));

      const globalRanges =
        cachedDecorations.current ??
        GetGlobalDecoration(GetEditorParts(editor));
      if (cachedDecorations.current == undefined) {
        cachedDecorations.current = globalRanges;
      }

      return lineRanges
        .filter((range) => {
          return globalRanges.every((globalRange) => {
            return !Range.includes(globalRange, range);
          });
        })
        .concat(globalRanges);

      return lineRanges;
    } else {
      return [];
    }
  }, []);

  function sendOnValue() {
    const content = GetFragmentString(editor.children, PlaintextType.ENCODED);
    var cursor = -1;
    if (
      editor.selection &&
      Range.isCollapsed(editor.selection) &&
      !isInsideCode(editor)
    ) {
      const cursorRange = Editor.range(editor, [], editor.selection?.focus);
      const cursorFragment = Editor.fragment(editor, cursorRange);
      const cursorString = GetFragmentString(
        cursorFragment,
        PlaintextType.ENCODED
      );
      cursor = cursorString.length;
    }

    onValue(content, cursor, editor.children);
  }

  function setValue(value: Descendant[]) {
    if (value.length === 0) {
      value = getInitialValue();
    }

    if (JSON.stringify(editor.children) === JSON.stringify(value)) {
      return;
    }

    lastValue.current = undefined;

    editor.children = value;
    editor.selection = null;
    if (editor.history) {
      editor.history.undos = [];
      editor.history.redos = [];
    }

    editor.onChange();
  }

  function isInsideInline(editor: BaseEditor & ReactEditor): boolean {
    const { selection } = editor;
    if (selection && Range.isCollapsed(selection)) {
      const entry = Editor.above(editor, {
        at: selection.focus,
        match: (n) => Element.isElement(n),
      });

      if (entry && IsInlineElement(entry[0].type)) {
        return true;
      }
    }

    return false;
  }

  function isInsideCode(editor: FullEditor): boolean {
    const { selection } = editor;
    if (selection && Range.isCollapsed(selection)) {
      if (
        GetCodeBlockRanges(editor).some((range) =>
          Range.includes(range, selection)
        )
      ) {
        return true;
      }

      for (var i = 0; i < editor.children.length; i++) {
        const line = editor.children[i];
        if (Element.isElement(line)) {
          if (line.type === "line") {
            const path = [i];
            const parts = GetElementParts(line, path);
            const matchs = GetInlineCodeMatches(parts);
            for (const match of matchs) {
              if (Range.includes(match.range, selection)) {
                console.log("IN CODE", match.range, selection);
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  }

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    const { selection } = editor;

    // Treat inlines as a single character, dont let the selection land inside it.
    // Double move the selection to get out the other side.
    // NOTE: Using isSelectable and isElementReadOnly cause bigger selection issues.

    if (selection && Range.isCollapsed(selection)) {
      const { nativeEvent } = event;
      const isLeft = isKeyHotkey("left", nativeEvent);
      const isRight = isKeyHotkey("right", nativeEvent);

      if (isLeft || isRight) {
        event.preventDefault();
        Transforms.move(editor, { unit: "offset", reverse: isLeft });

        if (isInsideInline(editor)) {
          Transforms.move(editor, { unit: "offset", reverse: isLeft });
        }
      }
    }
  };

  useEffect(() => {
    sendOnValue();
  });

  return (
    <div className="slate-editor">
      <Slate
        editor={editor}
        initialValue={getInitialValue()}
        onChange={(value) => {
          // prevent the selection from being set inside an emoji (can happen when merging nodes etc)
          if (isInsideInline(editor)) {
            Transforms.move(editor, { distance: 1, unit: "offset" });
          }

          const valueString = JSON.stringify(value);

          if (lastValue.current === undefined) {
            Transforms.select(editor, Editor.end(editor, []));
          }

          if (lastValue.current !== valueString) {
            Editor.normalize(editor, {
              force: true,
            });
            lastValue.current = valueString;
            cachedDecorations.current = undefined;
          }

          //setEditorState(valueString);
          sendOnValue();
        }}
        onSelectionChange={(selection) => {}}
      >
        <Editable
          decorate={decorate}
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          placeholder={placeholder ?? ""}
          onKeyDown={onKeyDown}
          onCopy={(event) => {
            event.preventDefault();
            if (!editor.selection || Range.isCollapsed(editor.selection))
              return;
            const fragment = Editor.fragment(editor, editor.selection);
            event.clipboardData.setData(
              "text/plain",
              GetFragmentString(fragment, PlaintextType.USER)
            );
          }}
          onPaste={(event) => {
            event.preventDefault();
            if (event.clipboardData.types.includes("text/plain")) {
              const text = event.clipboardData.getData("text/plain");
              if (text.length > 0) {
                Transforms.insertText(editor, text);
              }
            }
          }}
          scrollSelectionIntoView={() => {}}
        />
      </Slate>
    </div>
  );
});

function CustomLeaf({
  attributes,
  children,
  leaf,
}: {
  attributes: any;
  children: any;
  leaf: any;
}) {
  //console.log("LEAF", leaf);
  var classes = ["leaf"];

  if (leaf.styles !== undefined) {
    for (const style of leaf.styles) {
      classes.push(`leaf-${style}`);
    }
  }

  if (leaf.type && leaf.type !== SyntaxType.Content) {
    classes.push("leaf-syntax");

    if (leaf.type == SyntaxType.Language) {
      classes.push("leaf-language");
    }
    if (leaf.type == SyntaxType.Start) {
      classes.push("leaf-before");
    }
    if (leaf.type == SyntaxType.End) {
      classes.push("leaf-after");
    }
  }

  var spellcheck = true;
  if (
    leaf.styles &&
    (leaf.styles.includes(SyntaxStyle.Code) ||
      leaf.styles.includes(SyntaxStyle.CodeBlock) ||
      leaf.styles.includes(SyntaxStyle.URL))
  ) {
    spellcheck = false;
  }

  if (leaf.hljs) {
    classes.push("hljs");
    for (let i = 0; i < leaf.hljs.length; i++) {
      const keywords = ("hljs-" + leaf.hljs[i]).split(".");
      for (let j = 0; j < keywords.length; j++) {
        var keyword = keywords[j];
        for (var k = 0; k < j; k++) {
          keyword += "_";
        }
        classes.push(keyword);
      }
    }
  }

  return (
    <span {...attributes} spellCheck={spellcheck} className={classes.join(" ")}>
      {children}
    </span>
  );
}

function CustomElement({
  attributes,
  children,
  element,
  editor,
}: {
  attributes: any;
  children: any;
  element: any;
  editor: BaseEditor & ReactEditor & HistoryEditor;
}) {
  if (element.type === "line") {
    return (
      <div className="line" {...attributes}>
        {children}
      </div>
    );
  }

  const onInlineClick = (e: React.MouseEvent) => {
    // select over the element when you click on it (select just before and after the element)
    const path = ReactEditor.findPath(editor, element);
    const before = Editor.before(editor, path);
    const after = Editor.after(editor, path);
    if (!before || !after) return;

    var range: Range = {
      anchor: before,
      focus: after,
    };

    e.preventDefault();
    e.stopPropagation();

    Transforms.select(editor, range);
  };

  if (element.type === "emoji") {
    const emoji = element.emoji;
    return (
      <span
        {...attributes}
        contentEditable={false}
        className={"inline-emoji"}
        onClick={onInlineClick}
      >
        <EmojiInline text={emoji} />
        {children}
      </span>
    );
  }
  if (element.type === "userMention") {
    const user = element.user;
    return (
      <span
        {...attributes}
        contentEditable={false}
        className={"inline-mention"}
        onClick={onInlineClick}
      >
        {"@"}
        {user.nickname ?? user.username}
        {children}
      </span>
    );
  }
  if (element.type === "roleMention") {
    const role: Role = element.role;
    const color = FormatColor(role.color);
    const backgroundColor = FormatColor(role.color, 0.15);
    return (
      <span
        {...attributes}
        contentEditable={false}
        className={"inline-mention"}
        onClick={onInlineClick}
        style={{
          color: color,
          backgroundColor: backgroundColor,
        }}
      >
        {"@"}
        {role.name}
        {children}
      </span>
    );
  }
  if (element.type === "channelMention") {
    const channel: Channel = element.channel;
    return (
      <span
        {...attributes}
        contentEditable={false}
        className={"inline-mention"}
        onClick={onInlineClick}
      >
        <span className="inline-mention-hashtag">{"# "}</span>
        {channel.name}
        {children}
      </span>
    );
  }

  return <span {...attributes}>{children}</span>;
}
