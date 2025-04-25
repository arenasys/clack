/*import Prism from 'prismjs'
import 'prismjs/components/prism-markdown'*/

import { useChatState } from "../state";

import {
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
} from "slate-react";
import { Text, Editor, createEditor, Descendant } from "slate";
import { HistoryEditor, withHistory } from "slate-history";

import hljs from "highlight.js";

import { getRanges, getCodeLines } from "../markdown";

import _ from "underscore";

// TypeScript users only add this code
import { BaseEditor } from "slate";
import { Transforms, Element, Node } from "slate";
import { ReactEditor } from "slate-react";

type CustomTextLineElement = { type: "textLine"; children: CustomText[] };
type CustomCodeLineElement = { type: "codeLine"; children: CustomText[] };
type CustomText = { text: string };

declare module "slate" {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor;
    Element: CustomTextLineElement | CustomCodeLineElement;
    Text: CustomText;
  }
}

const withCustom = (editor: BaseEditor & ReactEditor & HistoryEditor) => {
  const { normalizeNode } = editor;

  editor.normalizeNode = (entry) => {
    const content = [...Node.texts(editor)].map(([node, path]) => {
      return { text: node.text, path: [...path] };
    });

    const codeLines = getCodeLines(content);

    for (let i = 0; i < editor.children.length; i++) {
      const isCodeLine = codeLines.includes(i);
      Transforms.setNodes(
        editor,
        { type: isCodeLine ? "codeLine" : "textLine" },
        { at: [i] }
      );
    }

    // If the element is a paragraph, ensure its children are valid.
    /*if (Element.isElement(node) && node.type === 'textLine') {
      for (const [child, childPath] of Node.children(editor, path)) {
        if (Element.isElement(child) && !editor.isInline(child)) {
          Transforms.unwrapNodes(editor, { at: childPath })
          return
        }
      }
    }*/

    // Fall back to the original `normalizeNode` to enforce other constraints.
    normalizeNode(entry);
  };

  return editor;
};

const MarkdownTextbox = forwardRef(function MarkdownTextbox(
  { onValue }: { onValue: (text: string) => void },
  ref
) {
  const setEditorState = useChatState((state) => {
    return state.setEditorState;
  });

  const currentChannel = useChatState((state) => {
    return state.gateway.currentChannel;
  });

  const currentChanneName = useChatState((state) => {
    if (state.gateway.currentChannel === undefined) return "unknown";
    return state.gateway.channels.get(state.gateway.currentChannel)!.name;
  });

  const currentEditor = useChatState((state) => state.gateway.currentEditor);

  function getValue(editor: string | undefined): Descendant[] {
    var value: Descendant[] = [{ type: "textLine", children: [{ text: "" }] }];
    if (editor !== undefined && editor !== "") {
      value = JSON.parse(editor);
    }
    return value;
  }

  const renderLeaf = useCallback(
    (props: RenderLeafProps) => <CustomLeaf {...props} />,
    []
  );
  const renderElement = useCallback(
    (props: RenderElementProps) => <CustomElement {...props} />,
    []
  );

  useImperativeHandle(ref, () => ({
    clear: () => {
      Transforms.delete(editor, {
        at: {
          anchor: Editor.start(editor, []),
          focus: Editor.end(editor, []),
        },
      });
    },
  }));

  const editor = useMemo(() => {
    return withCustom(withHistory(withReact(createEditor())));
  }, []);

  const decorate = useCallback(([node, path]: [any, any]) => {
    if (path.length > 1) return [];
    const content = [...Node.texts(node)].map(([node, node_path]) => {
      return { text: node.text, path: [...path, ...node_path] };
    });

    const ranges = [];
    if (path.length === 1) {
      ranges.push(...getRanges(content, false));
    } else if (path.length === 0) {
      ranges.push(...getRanges(content, true));
    }

    //console.log("RANGES", ranges);

    return ranges;
  }, []);

  function sendOnValue() {
    const content = [...Node.texts(editor)].map(([node, path]) => {
      return { text: node.text, path: [...path] };
    });

    onValue(
      content
        .map((line) => {
          return line.text;
        })
        .join("\n")
    );
  }

  function setValue(value: Descendant[]) {
    editor.children = value;
    editor.selection = null;
    if (editor.history) {
      editor.history.undos = [];
      editor.history.redos = [];
    }

    editor.onChange();
  }

  useEffect(() => {
    const newValue = getValue(currentEditor);
    if (
      JSON.stringify(editor.children) ===
      JSON.stringify(getValue(currentEditor))
    ) {
      return;
    }
    setValue(newValue);
  }, [currentChannel]);

  useEffect(() => {
    sendOnValue();
  });

  return (
    <Slate
      editor={editor}
      initialValue={getValue(currentEditor)}
      onChange={(value) => {
        console.log("CHANGE", value);
        setEditorState(JSON.stringify(value));
        sendOnValue();
      }}
    >
      <Editable
        decorate={decorate}
        renderElement={renderElement}
        renderLeaf={renderLeaf}
        placeholder={`Message #${currentChanneName}`}
      />
    </Slate>
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
  var classes = ["leaf"];

  //console.log("LEAF", leaf);

  if (leaf.bold) {
    classes.push("leaf-bold");
  }

  if (leaf.italic) {
    classes.push("leaf-italic");
  }

  if (leaf.underline) {
    classes.push("leaf-underline");
  }

  if (leaf.strike) {
    classes.push("leaf-strike");
  }

  if (leaf.inlineCode) {
    classes.push("leaf-inline-code");
  }

  if (leaf.title) {
    classes.push("leaf-title");
  }

  if (leaf.list) {
    classes.push("leaf-list");
  }

  if (leaf.hr) {
    classes.push("leaf-hr");
  }

  if (leaf.blockquote) {
    classes.push("leaf-blockquote");
  }

  if (leaf.codeBlock) {
    classes.push("leaf-code-block");
  }

  if (leaf.before) {
    classes.push("leaf-before");
  }

  if (leaf.after) {
    classes.push("leaf-after");
  }

  if (leaf.syntax) {
    classes.push("leaf-syntax");
  }

  if (leaf.prism) {
    for (let i = 0; i < leaf.prism.length; i++) {
      classes.push("prism-" + leaf.prism[i]);
    }
  }

  return (
    <span {...attributes} className={classes.join(" ")}>
      {children}
    </span>
  );
}

function CustomElement({
  attributes,
  children,
  element,
}: {
  attributes: any;
  children: any;
  element: any;
}) {
  //console.log("ELEMENT", element);

  const ref = useRef<HTMLDivElement>(null);

  /*useEffect(() => {
    if(ref.current === null) return;
    if(element.type === "codeLine")
    {
      hljs.highlightElement(ref.current);
    }
  }, [ref, attributes, children, element]);*/

  if (element.type === "codeLine") {
    return (
      <div className="codeLine language-python" {...attributes} ref={ref}>
        {children}
      </div>
    );
  }

  return <div {...attributes}>{children}</div>;
}

export default MarkdownTextbox;
