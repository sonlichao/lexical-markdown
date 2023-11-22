"use strict";
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LINK = exports.ITALIC_UNDERSCORE = exports.ITALIC_STAR = exports.STRIKETHROUGH = exports.BOLD_UNDERSCORE = exports.BOLD_STAR = exports.BOLD_ITALIC_UNDERSCORE = exports.BOLD_ITALIC_STAR = exports.HIGHLIGHT = exports.INLINE_CODE = exports.ORDERED_LIST = exports.CHECK_LIST = exports.UNORDERED_LIST = exports.CODE = exports.QUOTE = exports.HEADING = void 0;
const code_1 = require("@lexical/code");
const link_1 = require("@lexical/link");
const list_1 = require("@lexical/list");
const rich_text_1 = require("@lexical/rich-text");
const lexical_1 = require("lexical");
const createBlockNode = (createNode) => {
    return (parentNode, children, match) => {
        const node = createNode(match);
        node.append(...children);
        parentNode.replace(node);
        node.select(0, 0);
    };
};
// Amount of spaces that define indentation level
// TODO: should be an option
const LIST_INDENT_SIZE = 4;
const listReplace = (listType) => {
    return (parentNode, children, match) => {
        const previousNode = parentNode.getPreviousSibling();
        const nextNode = parentNode.getNextSibling();
        const listItem = (0, list_1.$createListItemNode)(listType === "check" ? match[3] === "x" : undefined);
        if ((0, list_1.$isListNode)(nextNode) && nextNode.getListType() === listType) {
            const firstChild = nextNode.getFirstChild();
            if (firstChild !== null) {
                firstChild.insertBefore(listItem);
            }
            else {
                // should never happen, but let's handle gracefully, just in case.
                nextNode.append(listItem);
            }
            parentNode.remove();
        }
        else if ((0, list_1.$isListNode)(previousNode) && previousNode.getListType() === listType) {
            previousNode.append(listItem);
            parentNode.remove();
        }
        else {
            const list = (0, list_1.$createListNode)(listType, listType === "number" ? Number(match[2]) : undefined);
            list.append(listItem);
            parentNode.replace(list);
        }
        listItem.append(...children);
        listItem.select(0, 0);
        const indent = Math.floor(match[1].length / LIST_INDENT_SIZE);
        if (indent) {
            listItem.setIndent(indent);
        }
    };
};
const listExport = (listNode, exportChildren, depth) => {
    const output = [];
    const children = listNode.getChildren();
    let index = 0;
    for (const listItemNode of children) {
        if ((0, list_1.$isListItemNode)(listItemNode)) {
            if (listItemNode.getChildrenSize() === 1) {
                const firstChild = listItemNode.getFirstChild();
                if ((0, list_1.$isListNode)(firstChild)) {
                    output.push(listExport(firstChild, exportChildren, depth + 1));
                    continue;
                }
            }
            const indent = " ".repeat(depth * LIST_INDENT_SIZE);
            const listType = listNode.getListType();
            const prefix = listType === "number"
                ? `${listNode.getStart() + index}. `
                : listType === "check"
                    ? `- [${listItemNode.getChecked() ? "x" : " "}] `
                    : "- ";
            output.push(indent + prefix + exportChildren(listItemNode));
            index++;
        }
    }
    return output.join("\n");
};
exports.HEADING = {
    dependencies: [rich_text_1.HeadingNode],
    export: (node, exportChildren) => {
        if (!(0, rich_text_1.$isHeadingNode)(node)) {
            return null;
        }
        const level = Number(node.getTag().slice(1));
        return "#".repeat(level) + " " + exportChildren(node);
    },
    regExp: /^(#{1,6})\s/,
    replace: createBlockNode((match) => {
        const tag = ("h" + match[1].length);
        return (0, rich_text_1.$createHeadingNode)(tag);
    }),
    type: "element",
};
exports.QUOTE = {
    dependencies: [rich_text_1.QuoteNode],
    export: (node, exportChildren) => {
        if (!(0, rich_text_1.$isQuoteNode)(node)) {
            return null;
        }
        const lines = exportChildren(node).split("\n");
        const output = [];
        for (const line of lines) {
            output.push("> " + line);
        }
        return output.join("\n");
    },
    regExp: /^>\s/,
    replace: (parentNode, children, _match, isImport) => {
        if (isImport) {
            const previousNode = parentNode.getPreviousSibling();
            if ((0, rich_text_1.$isQuoteNode)(previousNode)) {
                previousNode.splice(previousNode.getChildrenSize(), 0, [(0, lexical_1.$createLineBreakNode)(), ...children]);
                previousNode.select(0, 0);
                parentNode.remove();
                return;
            }
        }
        const node = (0, rich_text_1.$createQuoteNode)();
        node.append(...children);
        parentNode.replace(node);
        node.select(0, 0);
    },
    type: "element",
};
exports.CODE = {
    dependencies: [code_1.CodeNode],
    export: (node) => {
        if (!(0, code_1.$isCodeNode)(node)) {
            return null;
        }
        const textContent = node.getTextContent();
        return "```" + (node.getLanguage() || "") + (textContent ? "\n" + textContent : "") + "\n" + "```";
    },
    regExp: /^```(\w{1,10})?\s/,
    replace: createBlockNode((match) => {
        return (0, code_1.$createCodeNode)(match ? match[1] : undefined);
    }),
    type: "element",
};
exports.UNORDERED_LIST = {
    dependencies: [list_1.ListNode, list_1.ListItemNode],
    export: (node, exportChildren) => {
        return (0, list_1.$isListNode)(node) ? listExport(node, exportChildren, 0) : null;
    },
    regExp: /^(\s*)[-*+]\s/,
    replace: listReplace("bullet"),
    type: "element",
};
exports.CHECK_LIST = {
    dependencies: [list_1.ListNode, list_1.ListItemNode],
    export: (node, exportChildren) => {
        return (0, list_1.$isListNode)(node) ? listExport(node, exportChildren, 0) : null;
    },
    regExp: /^(\s*)(?:-\s)?\s?(\[(\s|x)?\])\s/i,
    replace: listReplace("check"),
    type: "element",
};
exports.ORDERED_LIST = {
    dependencies: [list_1.ListNode, list_1.ListItemNode],
    export: (node, exportChildren) => {
        return (0, list_1.$isListNode)(node) ? listExport(node, exportChildren, 0) : null;
    },
    regExp: /^(\s*)(\d{1,})\.\s/,
    replace: listReplace("number"),
    type: "element",
};
exports.INLINE_CODE = {
    format: ["code"],
    tag: "`",
    type: "text-format",
};
exports.HIGHLIGHT = {
    format: ["highlight"],
    tag: "==",
    type: "text-format",
};
exports.BOLD_ITALIC_STAR = {
    format: ["bold", "italic"],
    tag: "***",
    type: "text-format",
};
exports.BOLD_ITALIC_UNDERSCORE = {
    format: ["bold", "italic"],
    intraword: false,
    tag: "___",
    type: "text-format",
};
exports.BOLD_STAR = {
    format: ["bold"],
    tag: "**",
    type: "text-format",
};
exports.BOLD_UNDERSCORE = {
    format: ["bold"],
    intraword: false,
    tag: "__",
    type: "text-format",
};
exports.STRIKETHROUGH = {
    format: ["strikethrough"],
    tag: "~~",
    type: "text-format",
};
exports.ITALIC_STAR = {
    format: ["italic"],
    tag: "*",
    type: "text-format",
};
exports.ITALIC_UNDERSCORE = {
    format: ["italic"],
    intraword: false,
    tag: "_",
    type: "text-format",
};
// Order of text transformers matters:
//
// - code should go first as it prevents any transformations inside
// - then longer tags match (e.g. ** or __ should go before * or _)
exports.LINK = {
    dependencies: [link_1.LinkNode],
    export: (node, exportChildren, exportFormat) => {
        if (!(0, link_1.$isLinkNode)(node)) {
            return null;
        }
        const title = node.getTitle();
        const linkContent = title
            ? `[${node.getTextContent()}](${node.getURL()} "${title}")`
            : `[${node.getTextContent()}](${node.getURL()})`;
        const firstChild = node.getFirstChild();
        // Add text styles only if link has single text node inside. If it's more
        // then one we ignore it as markdown does not support nested styles for links
        if (node.getChildrenSize() === 1 && (0, lexical_1.$isTextNode)(firstChild)) {
            return exportFormat(firstChild, linkContent);
        }
        else {
            return linkContent;
        }
    },
    importRegExp: /(?:\[([^[]+)\])(?:\((?:([^()\s]+)(?:\s"((?:[^"]*\\")*[^"]*)"\s*)?)\))/,
    regExp: /(?:\[([^[]+)\])(?:\((?:([^()\s]+)(?:\s"((?:[^"]*\\")*[^"]*)"\s*)?)\))$/,
    replace: (textNode, match) => {
        const [, linkText, linkUrl, linkTitle] = match;
        const linkNode = (0, link_1.$createLinkNode)(linkUrl, { title: linkTitle });
        const linkTextNode = (0, lexical_1.$createTextNode)(linkText);
        linkTextNode.setFormat(textNode.getFormat());
        linkNode.append(linkTextNode);
        textNode.replace(linkNode);
    },
    trigger: ")",
    type: "text-match",
};
