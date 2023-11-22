"use strict";
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMarkdownShortcuts = void 0;
const code_1 = require("@lexical/code");
const lexical_1 = require("lexical");
const invariant_1 = __importDefault(require("./invariant"));
const _1 = require(".");
const utils_1 = require("./utils");
function runElementTransformers(parentNode, anchorNode, anchorOffset, elementTransformers) {
    const grandParentNode = parentNode.getParent();
    if (!(0, lexical_1.$isRootOrShadowRoot)(grandParentNode) || parentNode.getFirstChild() !== anchorNode) {
        return false;
    }
    const textContent = anchorNode.getTextContent();
    // Checking for anchorOffset position to prevent any checks for cases when caret is too far
    // from a line start to be a part of block-level markdown trigger.
    //
    // TODO:
    // Can have a quick check if caret is close enough to the beginning of the string (e.g. offset less than 10-20)
    // since otherwise it won't be a markdown shortcut, but tables are exception
    if (textContent[anchorOffset - 1] !== " ") {
        return false;
    }
    for (const { regExp, replace } of elementTransformers) {
        const match = textContent.match(regExp);
        if (match && match[0].length === anchorOffset) {
            const nextSiblings = anchorNode.getNextSiblings();
            const [leadingNode, remainderNode] = anchorNode.splitText(anchorOffset);
            leadingNode.remove();
            const siblings = remainderNode ? [remainderNode, ...nextSiblings] : nextSiblings;
            replace(parentNode, siblings, match, false);
            return true;
        }
    }
    return false;
}
function runTextMatchTransformers(anchorNode, anchorOffset, transformersByTrigger) {
    let textContent = anchorNode.getTextContent();
    const lastChar = textContent[anchorOffset - 1];
    const transformers = transformersByTrigger[lastChar];
    if (transformers == null) {
        return false;
    }
    // If typing in the middle of content, remove the tail to do
    // reg exp match up to a string end (caret position)
    if (anchorOffset < textContent.length) {
        textContent = textContent.slice(0, anchorOffset);
    }
    for (const transformer of transformers) {
        const match = textContent.match(transformer.regExp);
        if (match === null) {
            continue;
        }
        const startIndex = match.index || 0;
        const endIndex = startIndex + match[0].length;
        let replaceNode;
        if (startIndex === 0) {
            [replaceNode] = anchorNode.splitText(endIndex);
        }
        else {
            [, replaceNode] = anchorNode.splitText(startIndex, endIndex);
        }
        replaceNode.selectNext(0, 0);
        transformer.replace(replaceNode, match);
        return true;
    }
    return false;
}
function runTextFormatTransformers(anchorNode, anchorOffset, textFormatTransformers) {
    const textContent = anchorNode.getTextContent();
    const closeTagEndIndex = anchorOffset - 1;
    const closeChar = textContent[closeTagEndIndex];
    // Quick check if we're possibly at the end of inline markdown style
    const matchers = textFormatTransformers[closeChar];
    if (!matchers) {
        return false;
    }
    for (const matcher of matchers) {
        const { tag } = matcher;
        const tagLength = tag.length;
        const closeTagStartIndex = closeTagEndIndex - tagLength + 1;
        // If tag is not single char check if rest of it matches with text content
        if (tagLength > 1) {
            if (!isEqualSubString(textContent, closeTagStartIndex, tag, 0, tagLength)) {
                continue;
            }
        }
        // Space before closing tag cancels inline markdown
        if (textContent[closeTagStartIndex - 1] === " ") {
            continue;
        }
        // Some tags can not be used within words, hence should have newline/space/punctuation after it
        const afterCloseTagChar = textContent[closeTagEndIndex + 1];
        if (matcher.intraword === false && afterCloseTagChar && !utils_1.PUNCTUATION_OR_SPACE.test(afterCloseTagChar)) {
            continue;
        }
        const closeNode = anchorNode;
        let openNode = closeNode;
        let openTagStartIndex = getOpenTagStartIndex(textContent, closeTagStartIndex, tag);
        // Go through text node siblings and search for opening tag
        // if haven't found it within the same text node as closing tag
        let sibling = openNode;
        while (openTagStartIndex < 0 && (sibling = sibling.getPreviousSibling())) {
            if ((0, lexical_1.$isLineBreakNode)(sibling)) {
                break;
            }
            if ((0, lexical_1.$isTextNode)(sibling)) {
                const siblingTextContent = sibling.getTextContent();
                openNode = sibling;
                openTagStartIndex = getOpenTagStartIndex(siblingTextContent, siblingTextContent.length, tag);
            }
        }
        // Opening tag is not found
        if (openTagStartIndex < 0) {
            continue;
        }
        // No content between opening and closing tag
        if (openNode === closeNode && openTagStartIndex + tagLength === closeTagStartIndex) {
            continue;
        }
        // Checking longer tags for repeating chars (e.g. *** vs **)
        const prevOpenNodeText = openNode.getTextContent();
        if (openTagStartIndex > 0 && prevOpenNodeText[openTagStartIndex - 1] === closeChar) {
            continue;
        }
        // Some tags can not be used within words, hence should have newline/space/punctuation before it
        const beforeOpenTagChar = prevOpenNodeText[openTagStartIndex - 1];
        if (matcher.intraword === false && beforeOpenTagChar && !utils_1.PUNCTUATION_OR_SPACE.test(beforeOpenTagChar)) {
            continue;
        }
        // Clean text from opening and closing tags (starting from closing tag
        // to prevent any offset shifts if we start from opening one)
        const prevCloseNodeText = closeNode.getTextContent();
        const closeNodeText = prevCloseNodeText.slice(0, closeTagStartIndex) + prevCloseNodeText.slice(closeTagEndIndex + 1);
        closeNode.setTextContent(closeNodeText);
        const openNodeText = openNode === closeNode ? closeNodeText : prevOpenNodeText;
        openNode.setTextContent(openNodeText.slice(0, openTagStartIndex) + openNodeText.slice(openTagStartIndex + tagLength));
        const selection = (0, lexical_1.$getSelection)();
        const nextSelection = (0, lexical_1.$createRangeSelection)();
        (0, lexical_1.$setSelection)(nextSelection);
        // Adjust offset based on deleted chars
        const newOffset = closeTagEndIndex - tagLength * (openNode === closeNode ? 2 : 1) + 1;
        nextSelection.anchor.set(openNode.__key, openTagStartIndex, "text");
        nextSelection.focus.set(closeNode.__key, newOffset, "text");
        // Apply formatting to selected text
        for (const format of matcher.format) {
            if (!nextSelection.hasFormat(format)) {
                nextSelection.formatText(format);
            }
        }
        // Collapse selection up to the focus point
        nextSelection.anchor.set(nextSelection.focus.key, nextSelection.focus.offset, nextSelection.focus.type);
        // Remove formatting from collapsed selection
        for (const format of matcher.format) {
            if (nextSelection.hasFormat(format)) {
                nextSelection.toggleFormat(format);
            }
        }
        if ((0, lexical_1.$isRangeSelection)(selection)) {
            nextSelection.format = selection.format;
        }
        return true;
    }
    return false;
}
function getOpenTagStartIndex(string, maxIndex, tag) {
    const tagLength = tag.length;
    for (let i = maxIndex; i >= tagLength; i--) {
        const startIndex = i - tagLength;
        if (isEqualSubString(string, startIndex, tag, 0, tagLength) && // Space after opening tag cancels transformation
            string[startIndex + tagLength] !== " ") {
            return startIndex;
        }
    }
    return -1;
}
function isEqualSubString(stringA, aStart, stringB, bStart, length) {
    for (let i = 0; i < length; i++) {
        if (stringA[aStart + i] !== stringB[bStart + i]) {
            return false;
        }
    }
    return true;
}
function registerMarkdownShortcuts(editor, transformers = _1.TRANSFORMERS) {
    const byType = (0, utils_1.transformersByType)(transformers);
    const textFormatTransformersIndex = (0, utils_1.indexBy)(byType.textFormat, ({ tag }) => tag[tag.length - 1]);
    const textMatchTransformersIndex = (0, utils_1.indexBy)(byType.textMatch, ({ trigger }) => trigger);
    for (const transformer of transformers) {
        const type = transformer.type;
        if (type === "element" || type === "text-match") {
            const dependencies = transformer.dependencies;
            for (const node of dependencies) {
                if (!editor.hasNode(node)) {
                    (0, invariant_1.default)(false, "MarkdownShortcuts: missing dependency %s for transformer. Ensure node dependency is included in editor initial config.", node.getType());
                }
            }
        }
    }
    const transform = (parentNode, anchorNode, anchorOffset) => {
        if (runElementTransformers(parentNode, anchorNode, anchorOffset, byType.element)) {
            return;
        }
        if (runTextMatchTransformers(anchorNode, anchorOffset, textMatchTransformersIndex)) {
            return;
        }
        runTextFormatTransformers(anchorNode, anchorOffset, textFormatTransformersIndex);
    };
    return editor.registerUpdateListener(({ tags, dirtyLeaves, editorState, prevEditorState }) => {
        // Ignore updates from undo/redo (as changes already calculated)
        if (tags.has("historic")) {
            return;
        }
        // If editor is still composing (i.e. backticks) we must wait before the user confirms the key
        if (editor.isComposing()) {
            return;
        }
        const selection = editorState.read(lexical_1.$getSelection);
        const prevSelection = prevEditorState.read(lexical_1.$getSelection);
        if (!(0, lexical_1.$isRangeSelection)(prevSelection) || !(0, lexical_1.$isRangeSelection)(selection) || !selection.isCollapsed()) {
            return;
        }
        const anchorKey = selection.anchor.key;
        const anchorOffset = selection.anchor.offset;
        const anchorNode = editorState._nodeMap.get(anchorKey);
        if (!(0, lexical_1.$isTextNode)(anchorNode) ||
            !dirtyLeaves.has(anchorKey) ||
            (anchorOffset !== 1 && anchorOffset > prevSelection.anchor.offset + 1)) {
            return;
        }
        editor.update(() => {
            // Markdown is not available inside code
            if (anchorNode.hasFormat("code")) {
                return;
            }
            const parentNode = anchorNode.getParent();
            if (parentNode === null || (0, code_1.$isCodeNode)(parentNode)) {
                return;
            }
            transform(parentNode, anchorNode, selection.anchor.offset);
        });
    });
}
exports.registerMarkdownShortcuts = registerMarkdownShortcuts;
