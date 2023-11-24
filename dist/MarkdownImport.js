"use strict";
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMarkdownImport = void 0;
const code_1 = require("@lexical/code");
const list_1 = require("@lexical/list");
const rich_text_1 = require("@lexical/rich-text");
const utils_1 = require("@lexical/utils");
const lexical_1 = require("lexical");
const environment_1 = require("./environment");
const utils_2 = require("./utils");
const MARKDOWN_EMPTY_LINE_REG_EXP = /^\s{0,3}$/;
const CODE_BLOCK_REG_EXP = /^```(\w{1,10})?\s?$/;
function createMarkdownImport(transformers) {
    const byType = (0, utils_2.transformersByType)(transformers);
    const textFormatTransformersIndex = createTextFormatTransformersIndex(byType.textFormat);
    return (markdownString, node) => {
        const lines = markdownString.split("\n");
        const linesLength = lines.length;
        const root = node || (0, lexical_1.$getRoot)();
        root.clear();
        for (let i = 0; i < linesLength; i++) {
            const lineText = lines[i];
            // Codeblocks are processed first as anything inside such block
            // is ignored for further processing
            // TODO:
            // Abstract it to be dynamic as other transformers (add multiline match option)
            const [codeBlockNode, shiftedIndex] = importCodeBlock(lines, i, root);
            if (codeBlockNode != null) {
                i = shiftedIndex;
                continue;
            }
            importBlocks(lineText, root, byType.element, textFormatTransformersIndex, byType.textMatch);
        }
        // Removing empty paragraphs as md does not really
        // allow empty lines and uses them as dilimiter
        const children = root.getChildren();
        for (const child of children) {
            if (isEmptyParagraph(child)) {
                child.remove();
            }
        }
        if ((0, lexical_1.$getSelection)() !== null) {
            root.selectEnd();
        }
    };
}
exports.createMarkdownImport = createMarkdownImport;
function isEmptyParagraph(node) {
    if (!(0, lexical_1.$isParagraphNode)(node)) {
        return false;
    }
    const firstChild = node.getFirstChild();
    return (firstChild == null ||
        (node.getChildrenSize() === 1 &&
            (0, lexical_1.$isTextNode)(firstChild) &&
            MARKDOWN_EMPTY_LINE_REG_EXP.test(firstChild.getTextContent())));
}
function importBlocks(lineText, rootNode, elementTransformers, textFormatTransformersIndex, textMatchTransformers) {
    const lineTextTrimmed = lineText.trim();
    const textNode = (0, lexical_1.$createTextNode)(lineTextTrimmed);
    const elementNode = (0, lexical_1.$createParagraphNode)();
    elementNode.append(textNode);
    rootNode.append(elementNode);
    for (const { regExp, replace } of elementTransformers) {
        const match = lineText.match(regExp);
        if (match) {
            textNode.setTextContent(lineText.slice(match[0].length));
            replace(elementNode, [textNode], match, true);
            break;
        }
    }
    importTextFormatTransformers(textNode, textFormatTransformersIndex, textMatchTransformers);
    // If no transformer found and we left with original paragraph node
    // can check if its content can be appended to the previous node
    // if it's a paragraph, quote or list
    if (elementNode.isAttached() && lineTextTrimmed.length > 0) {
        const previousNode = elementNode.getPreviousSibling();
        if ((0, lexical_1.$isParagraphNode)(previousNode) || (0, rich_text_1.$isQuoteNode)(previousNode) || (0, list_1.$isListNode)(previousNode)) {
            let targetNode = previousNode;
            if ((0, list_1.$isListNode)(previousNode)) {
                const lastDescendant = previousNode.getLastDescendant();
                if (lastDescendant == null) {
                    targetNode = null;
                }
                else {
                    targetNode = (0, utils_1.$findMatchingParent)(lastDescendant, list_1.$isListItemNode);
                }
            }
            if (targetNode != null && targetNode.getTextContentSize() > 0) {
                targetNode.splice(targetNode.getChildrenSize(), 0, [(0, lexical_1.$createLineBreakNode)(), ...elementNode.getChildren()]);
                elementNode.remove();
            }
        }
    }
}
function importCodeBlock(lines, startLineIndex, rootNode) {
    const openMatch = lines[startLineIndex].match(CODE_BLOCK_REG_EXP);
    if (openMatch) {
        let endLineIndex = startLineIndex;
        const linesLength = lines.length;
        while (++endLineIndex < linesLength) {
            const closeMatch = lines[endLineIndex].match(CODE_BLOCK_REG_EXP);
            if (closeMatch) {
                const codeBlockNode = (0, code_1.$createCodeNode)(openMatch[1]);
                const textNode = (0, lexical_1.$createTextNode)(lines.slice(startLineIndex + 1, endLineIndex).join("\n"));
                codeBlockNode.append(textNode);
                rootNode.append(codeBlockNode);
                return [codeBlockNode, endLineIndex];
            }
        }
    }
    return [null, startLineIndex];
}
// Processing text content and replaces text format tags.
// It takes outermost tag match and its content, creates text node with
// format based on tag and then recursively executed over node's content
//
// E.g. for "*Hello **world**!*" string it will create text node with
// "Hello **world**!" content and italic format and run recursively over
// its content to transform "**world**" part
function importTextFormatTransformers(textNode, textFormatTransformersIndex, textMatchTransformers) {
    const textContent = textNode.getTextContent();
    const match = findOutermostMatch(textContent, textFormatTransformersIndex);
    if (!match) {
        // Once text format processing is done run text match transformers, as it
        // only can span within single text node (unline formats that can cover multiple nodes)
        importTextMatchTransformers(textNode, textMatchTransformers);
        return;
    }
    let currentNode, remainderNode, leadingNode;
    // If matching full content there's no need to run splitText and can reuse existing textNode
    // to update its content and apply format. E.g. for **_Hello_** string after applying bold
    // format (**) it will reuse the same text node to apply italic (_)
    if (match[0] === textContent) {
        currentNode = textNode;
    }
    else {
        const startIndex = match.index || 0;
        const endIndex = startIndex + match[0].length;
        if (startIndex === 0) {
            [currentNode, remainderNode] = textNode.splitText(endIndex);
        }
        else {
            [leadingNode, currentNode, remainderNode] = textNode.splitText(startIndex, endIndex);
        }
    }
    currentNode.setTextContent(match[2]);
    const transformer = textFormatTransformersIndex.transformersByTag[match[1]];
    if (transformer) {
        for (const format of transformer.format) {
            if (!currentNode.hasFormat(format)) {
                currentNode.toggleFormat(format);
            }
        }
    }
    // Recursively run over inner text if it's not inline code
    if (!currentNode.hasFormat("code")) {
        importTextFormatTransformers(currentNode, textFormatTransformersIndex, textMatchTransformers);
    }
    // Run over leading/remaining text if any
    if (leadingNode) {
        importTextFormatTransformers(leadingNode, textFormatTransformersIndex, textMatchTransformers);
    }
    if (remainderNode) {
        importTextFormatTransformers(remainderNode, textFormatTransformersIndex, textMatchTransformers);
    }
}
function importTextMatchTransformers(textNode_, textMatchTransformers) {
    let textNode = textNode_;
    mainLoop: while (textNode) {
        for (const transformer of textMatchTransformers) {
            const match = textNode.getTextContent().match(transformer.importRegExp);
            if (!match) {
                continue;
            }
            const startIndex = match.index || 0;
            const endIndex = startIndex + match[0].length;
            let replaceNode, leftTextNode, rightTextNode;
            if (startIndex === 0) {
                [replaceNode, textNode] = textNode.splitText(endIndex);
            }
            else {
                [leftTextNode, replaceNode, rightTextNode] = textNode.splitText(startIndex, endIndex);
            }
            if (leftTextNode) {
                importTextMatchTransformers(leftTextNode, textMatchTransformers);
            }
            if (rightTextNode) {
                textNode = rightTextNode;
            }
            transformer.replace(replaceNode, match);
            continue mainLoop;
        }
        break;
    }
}
// Finds first "<tag>content<tag>" match that is not nested into another tag
function findOutermostMatch(textContent, textTransformersIndex) {
    const openTagsMatch = textContent.match(textTransformersIndex.openTagsRegExp);
    if (openTagsMatch == null) {
        return null;
    }
    for (const match of openTagsMatch) {
        // Open tags reg exp might capture leading space so removing it
        // before using match to find transformer
        const tag = match.replace(/^\s/, "");
        const fullMatchRegExp = textTransformersIndex.fullMatchRegExpByTag[tag];
        if (fullMatchRegExp == null) {
            continue;
        }
        const fullMatch = textContent.match(fullMatchRegExp);
        const transformer = textTransformersIndex.transformersByTag[tag];
        if (fullMatch != null && transformer != null) {
            if (transformer.intraword !== false) {
                return fullMatch;
            }
            // For non-intraword transformers checking if it's within a word
            // or surrounded with space/punctuation/newline
            const { index = 0 } = fullMatch;
            const beforeChar = textContent[index - 1];
            const afterChar = textContent[index + fullMatch[0].length];
            if ((!beforeChar || utils_2.PUNCTUATION_OR_SPACE.test(beforeChar)) &&
                (!afterChar || utils_2.PUNCTUATION_OR_SPACE.test(afterChar))) {
                return fullMatch;
            }
        }
    }
    return null;
}
function createTextFormatTransformersIndex(textTransformers) {
    const transformersByTag = {};
    const fullMatchRegExpByTag = {};
    const openTagsRegExp = [];
    const escapeRegExp = `(?<![\\\\])`;
    for (const transformer of textTransformers) {
        const { tag } = transformer;
        transformersByTag[tag] = transformer;
        const tagRegExp = tag.replace(/(\*|\^|\+)/g, "\\$1");
        openTagsRegExp.push(tagRegExp);
        if (environment_1.IS_SAFARI || environment_1.IS_IOS || environment_1.IS_APPLE_WEBKIT) {
            fullMatchRegExpByTag[tag] = new RegExp(`(${tagRegExp})(?![${tagRegExp}\\s])(.*?[^${tagRegExp}\\s])${tagRegExp}(?!${tagRegExp})`);
        }
        else {
            fullMatchRegExpByTag[tag] = new RegExp(`(?<![\\\\${tagRegExp}])(${tagRegExp})((\\\\${tagRegExp})?.*?[^${tagRegExp}\\s](\\\\${tagRegExp})?)((?<!\\\\)|(?<=\\\\\\\\))(${tagRegExp})(?![\\\\${tagRegExp}])`);
        }
    }
    return {
        // Reg exp to find open tag + content + close tag
        fullMatchRegExpByTag,
        // Reg exp to find opening tags
        openTagsRegExp: new RegExp((environment_1.IS_SAFARI || environment_1.IS_IOS || environment_1.IS_APPLE_WEBKIT ? "" : `${escapeRegExp}`) + "(" + openTagsRegExp.join("|") + ")", "g"),
        transformersByTag,
    };
}
