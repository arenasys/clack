import { Range, Path } from "slate";
import SimpleMarkdown, {
  State,
  Capture,
  Parser,
  ParserRule,
  Output,
  reactElement,
  MatchFunction,
  SingleASTNode,
} from "simple-markdown";

import hljs from "highlight.js";
import "highlight.js/styles/github-dark-dimmed.min.css";

/*
import Prism from 'prismjs'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-php'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-java'
*/

/*
var anyScopeRegex = function (regex: RegExp) {
  var match: MatchFunction = function (source, _) {
    return regex.exec(source);
  };
  match.regex = regex;
  return match;
};
*/

export const Rules = {
  //newline: SimpleMarkdown.defaultRules.newline,
  /*paragraph: SimpleMarkdown.defaultRules.paragraph,*/
  escape: {
    ...SimpleMarkdown.defaultRules.escape,
    match: (source: string, state: State, lookbehind: string) =>
      !1 === state.allowEscape
        ? null
        : SimpleMarkdown.defaultRules.escape.match(source, state, lookbehind),
  },
  /*Array: {
    react: function (
      arr: SingleASTNode[],
      output: Output<React.ReactNode>,
      state: State
    ) {
      var oldKey = state.key;
      var result: Array<React.ReactNode> = [];

      for (var i = 0, key = 0; i < arr.length; i++, key++) {
        state.key = "" + i;
        result.push(output(arr[i], state));
      }

      state.key = oldKey;
      return result;
    },
  },*/
  text: {
    ...SimpleMarkdown.defaultRules.text,
    /*match: anyScopeRegex(/^.*(?:\n|$)/),*/
    react: function (node: any, output: any, state: any) {
      return reactElement("span", state.key, { children: node.content });
    },
  },
  blockQuote: {
    ...SimpleMarkdown.defaultRules.blockQuote,
    //requiredFirstCharacters: [" ", ">"],
    match(source: string, state: State) {
      let { prevCapture: r, inQuote: i, nested: a } = state;
      const M =
        /^( *>>> +([\s\S]*))|^( *>(?!>>) +[^\n]*(\n *>(?!>>) +[^\n]*)*\n?)/;
      if (i || a) return null;
      if (null == r) return M.exec(source);
      let s = r[0];
      return /^$|\n *$/.test(s) ? M.exec(source) : null;
    },

    parse(capture: Capture, recurseParse: Parser, state: State) {
      let i = capture[0],
        a = !!/^ *>>> ?/.exec(i),
        s = a ? /^ *>>> ?/ : /^ *> ?/gm,
        o = i.replace(s, ""),
        l = state.inQuote || !1,
        u = state.inline || !1;
      (state.inQuote = !0), !a && (state.inline = !0);
      let c = recurseParse(o, state);
      return (
        (state.inQuote = l),
        (state.inline = u),
        0 === c.length && c.push({ type: "text", content: " " }),
        { content: c, type: "blockQuote" }
      );
    },
  },
  bold: SimpleMarkdown.defaultRules.strong,
  italic: SimpleMarkdown.defaultRules.em,
  underline: SimpleMarkdown.defaultRules.u,
  //br: SimpleMarkdown.defaultRules.br,
  inlineCode: SimpleMarkdown.defaultRules.inlineCode,
  codeBlock: {
    ...SimpleMarkdown.defaultRules.codeBlock,
    order: SimpleMarkdown.defaultRules.codeBlock.order,
    //requiredFirstCharacters: ["`"],
    match: (source: string) =>
      /^```(?:([a-z0-9_+\-.#]+?)\n)?\n*([^\n][^]*?)?\n*(```(\n?)|(?=$))/i.exec(
        source
      ),
    parse(capture: Capture, _: Parser, state: State) {
      var i, a;
      //console.log("CAP", capture)
      return {
        lang: null !== (i = capture[1]) && void 0 !== i ? i : "",
        content: null !== (a = capture[2]) && void 0 !== a ? a : "",
        match: capture[0],
        inQuote: state.inQuote || state.formatInline || !1,
      };
    },
    react: function (node: any, output: any, state: any) {
      const lang = !node.lang ? "plaintext" : node.lang;
      const className = "codeBlock " + "language-" + lang;
      const htmlContent = hljs.highlight(node.content, {
        language: lang,
      }).value;

      return reactElement("pre", state.key, {
        children: reactElement("code", null, {
          dangerouslySetInnerHTML: { __html: htmlContent },
          className: className,
        }),
      });
    },
  },
  strike: {
    ...SimpleMarkdown.defaultRules.del,
    //order: SimpleMarkdown.defaultRules.u.order,
    //requiredFirstCharacters: ["~"],
    match: SimpleMarkdown.inlineRegex(/^~~([\s\S]+?)~~(?!_)/),
    parse: SimpleMarkdown.defaultRules.u.parse,
  },
  link: {
    ...SimpleMarkdown.defaultRules.url,
    react: function (node: any, output: any, state: any) {
      return reactElement("a", state.key, {
        href: node.target,
        children: node.target,
        title: node.target,
        rel: "noopener noreferrer",
        target: "_blank",
      });
    },
  },
};

export const MultilineRules = {
  //newline: Rules.newline,
  /*paragraph: Rules.paragraph,*/
  escape: Rules.escape,
  text: Rules.text,
  codeBlock: Rules.codeBlock,
};

function getInclusion(input: string, offset: number, node: any): number {
  switch (node.type) {
    case "italic":
      return 1;
    case "bold":
    case "underline":
    case "strike":
      return 2;
    case "inlineCode": {
      const index = input.slice(offset).indexOf(node.content);
      var inclusion = 1;
      if (
        input[offset + index - 2] === "`" &&
        input[offset + index + node.content.length + 1] === "`"
      ) {
        inclusion = 2;
      }
      return inclusion;
    }
    case "codeBlock":
      return 3;
    default:
      return 0;
  }
}

function syntaxHighlightRanges(
  text: string,
  getPoint: (offset: number) => any,
  offset: number
) {
  const ranges = [];
  // create "tokens" with "prismjs" and put them in "ranges"

  //const result = hljs.highlight(text, {language: 'python'});

  //console.log("HLJS", result);

  return [];

  /*
    const tokens = Prism.tokenize(text, Prism.languages.python);
    let start = 0;
    for (const token of tokens) {
        const length = token.length;
        const end = start + length;

        if (typeof token !== 'string') {
          const types = [token.type];
          if(token.alias instanceof Array) types.push(...token.alias);
          else if(token.alias) types.push(token.alias);
        ranges.push({
            anchor: getPoint(offset + start),
            focus: getPoint(offset + end),
            prism: types,
        });
        }
        start = end;
    }
    return ranges;
    */
}

function codeBlockRanges(
  input: string,
  getPoint: (offset: number) => any,
  offset: number,
  node: any
): { ranges: Range[]; offset: number } {
  const ranges = [];

  var startIndex = input.slice(offset).indexOf(node.match);
  var endIndex = startIndex + node.match.length;

  var isComplete = node.match.endsWith("```");
  var hasLang = node.match.includes("\n");

  var tmpOffset = offset + startIndex;

  ranges.push({
    anchor: getPoint(tmpOffset),
    focus: getPoint(tmpOffset + 3),
    codeBlock: true,
    before: true,
  });
  tmpOffset += 3;

  let lang = "";
  if (hasLang) {
    const langEnd = input.slice(tmpOffset).indexOf("\n");
    lang = input.slice(tmpOffset, tmpOffset + langEnd);
    ranges.push({
      anchor: getPoint(tmpOffset),
      focus: getPoint(tmpOffset + langEnd),
      codeBlockLang: true,
    });
    tmpOffset += langEnd + 1;
  }

  var contentEnd = isComplete ? endIndex - 3 : endIndex;

  ranges.push({
    anchor: getPoint(tmpOffset),
    focus: getPoint(offset + contentEnd),
    codeBlock: true,
  });

  const text = input.slice(tmpOffset, offset + contentEnd);
  if (text.length > 0) {
    ranges.push(...syntaxHighlightRanges(text, getPoint, tmpOffset));
  }

  if (isComplete) {
    ranges.push({
      anchor: getPoint(offset + contentEnd),
      focus: getPoint(offset + endIndex),
      codeBlock: true,
      after: true,
    });
  }

  return {
    ranges: ranges,
    offset: offset + endIndex,
  };
}

function inlineCodeRanges(
  input: string,
  getPoint: (offset: number) => any,
  offset: number,
  node: any
): { ranges: Range[]; offset: number } {
  const ranges = [];
  const index = input.slice(offset).indexOf(node.content);

  var inclusion = getInclusion(input, offset, node);

  ranges.push({
    anchor: getPoint(offset + index - inclusion),
    focus: getPoint(offset + index),
    inlineCode: true,
    before: true,
  });

  ranges.push({
    anchor: getPoint(offset + index),
    focus: getPoint(offset + index + node.content.length),
    inlineCode: true,
  });

  ranges.push({
    anchor: getPoint(offset + index + node.content.length),
    focus: getPoint(offset + index + node.content.length + inclusion),
    inlineCode: true,
    after: true,
  });

  return {
    ranges: ranges,
    offset: offset + index + node.content.length + inclusion,
  };
}

export function getRanges(
  input: { text: string; path: number[] }[],
  multiLine: boolean
): Range[] {
  let content = "";
  let index: number[] = [];

  for (let i = 0; i < input.length; i++) {
    index.push(content.length);
    content += input[i].text + "\n";
  }

  function getPoint(offset: number) {
    let last = 0;
    for (let i = 0; i < index.length; i++) {
      if (offset >= index[i]) last = i;
      else break;
    }

    //console.log("GET POINT", offset, index[last], index);
    return { path: input[last].path, offset: offset - index[last] };
  }

  //console.log("CONTENT", input, index);

  const rules = multiLine ? MultilineRules : Rules;
  const parser = SimpleMarkdown.parserFor(rules);
  const ast = parser(content, { inline: true });

  //console.log("AST", ast);

  if (ast.length === 0) return [];

  let ranges: any[] = [];
  let offset = 0;

  function walk(node: any, active: {}) {
    const type = node.type == "text" ? "plaintext" : node.type;

    const inclusion = getInclusion(content, offset, node);

    //console.log("WALK", type, node.content, inclusion, input.slice(offset, offset + node.content.length + inclusion*2));

    if (node.content instanceof Array) {
      ranges.push({
        anchor: getPoint(offset),
        focus: getPoint(offset + inclusion),
        [type]: true,
        syntax: true,
        before: true,
        ...active,
      });
      offset += inclusion;
      for (let i = 0; i < node.content.length; i++) {
        walk(node.content[i], { [type]: true, ...active });
      }
      ranges.push({
        anchor: getPoint(offset),
        focus: getPoint(offset + inclusion),
        [type]: true,
        syntax: true,
        after: true,
        ...active,
      });
      offset += inclusion;
    } else if (node.content) {
      if (Object.keys(active).length === 0 && type === "plaintext") {
        offset += node.content.length;
        return;
      }

      if (type === "codeBlock") {
        let out = codeBlockRanges(content, getPoint, offset, node);
        ranges.push(...out.ranges);
        offset = out.offset;
      } else if (type === "inlineCode") {
        let out = inlineCodeRanges(content, getPoint, offset, node);
        ranges.push(...out.ranges);
        offset = out.offset;
      } else {
        const index = content.slice(offset).indexOf(node.content);
        const inclusion = getInclusion(content, offset, node);

        //console.log("INC", type, node.content, inclusion, input.slice(offset, offset + node.content.length + inclusion*2));
        ranges.push({
          anchor: getPoint(offset + index),
          focus: getPoint(offset + index + node.content.length),
          [type]: true,
          ...active,
        });

        offset += index + node.content.length + 2 * inclusion;
      }
    }
  }

  ast.forEach((node: any) => walk(node, {}));

  return ranges;
}

export function getCodeLines(
  input: { text: string; path: number[] }[]
): number[] {
  const ranges = getRanges(input, true);
  let codeLines = [];

  for (let i = 0; i < ranges.length; i++) {
    let range: any = ranges[i];
    if (
      range.codeBlock &&
      !range.codeBlockLang &&
      !range.before &&
      !range.after
    ) {
      for (let j = range.anchor.path[0]; j < range.focus.path[0]; j++) {
        codeLines.push(j);
      }
    }
  }

  //console.log("CODELINES", codeLines);

  return codeLines;
}

export function markdownToReact(input: string) {
  const parser = SimpleMarkdown.parserFor(Rules);

  const output = SimpleMarkdown.outputFor(Rules, "react", {});

  const ast = parser(input, { inline: true });

  return output(ast);
}
