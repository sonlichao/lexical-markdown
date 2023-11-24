"use strict";
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMarkdownExport = void 0;
const lexical_1 = require("lexical");
const utils_1 = require("./utils");
function createMarkdownExport(transformers) {
    const byType = (0, utils_1.transformersByType)(transformers);
    // Export only uses text formats that are responsible for single format
    // e.g. it will filter out *** (bold, italic) and instead use separate ** and *
    const textFormatTransformers = byType.textFormat.filter((transformer) => transformer.format.length === 1);
    return (node) => {
        const output = [];
        const children = (node || (0, lexical_1.$getRoot)()).getChildren();
        for (const child of children) {
            const result = exportTopLevelElements(child, byType.element, textFormatTransformers, byType.textMatch);
            if (result != null) {
                output.push(result);
            }
        }
        return output.join("\n\n");
    };
}
exports.createMarkdownExport = createMarkdownExport;
function exportTopLevelElements(node, elementTransformers, textTransformersIndex, textMatchTransformers) {
    for (const transformer of elementTransformers) {
        const result = transformer.export(node, (_node) => exportChildren(_node, textTransformersIndex, textMatchTransformers));
        if (result != null) {
            return result;
        }
    }
    if ((0, lexical_1.$isElementNode)(node)) {
        return exportChildren(node, textTransformersIndex, textMatchTransformers);
    }
    else if ((0, lexical_1.$isDecoratorNode)(node)) {
        return node.getTextContent();
    }
    else {
        return null;
    }
}
function exportChildren(node, textTransformersIndex, textMatchTransformers) {
    const output = [];
    const children = node.getChildren();
    mainLoop: for (const child of children) {
        for (const transformer of textMatchTransformers) {
            const result = transformer.export(child, (parentNode) => exportChildren(parentNode, textTransformersIndex, textMatchTransformers), (textNode, textContent) => exportTextFormat(textNode, textContent, textTransformersIndex));
            if (result != null) {
                output.push(result);
                continue mainLoop;
            }
        }
        if ((0, lexical_1.$isLineBreakNode)(child)) {
            output.push("\n");
        }
        else if ((0, lexical_1.$isTextNode)(child)) {
            output.push(exportTextFormat(child, child.getTextContent(), textTransformersIndex));
        }
        else if ((0, lexical_1.$isElementNode)(child)) {
            output.push(exportChildren(child, textTransformersIndex, textMatchTransformers));
        }
        else if ((0, lexical_1.$isDecoratorNode)(child)) {
            output.push(child.getTextContent());
        }
    }
    return output.join("");
}
function exportTextFormat(node, textContent, textTransformers) {
    // This function handles the case of a string looking like this: "   foo   "
    // Where it would be invalid markdown to generate: "**   foo   **"
    // We instead want to trim the whitespace out, apply formatting, and then
    // bring the whitespace back. So our returned string looks like this: "   **foo**   "
    const frozenString = textContent.trim();
    let output = frozenString;
    const applied = new Set();
    for (const transformer of textTransformers) {
        const format = transformer.format[0];
        const tag = transformer.tag;
        if (hasFormat(node, format) && !applied.has(format)) {
            // Multiple tags might be used for the same format (*, _)
            applied.add(format);
            // Prevent adding opening tag is already opened by the previous sibling
            const previousNode = getTextSibling(node, true);
            if (!hasFormat(previousNode, format)) {
                output = tag + output;
            }
            // Prevent adding closing tag if next sibling will do it
            const nextNode = getTextSibling(node, false);
            if (!hasFormat(nextNode, format)) {
                output += tag;
            }
        }
    }
    // Replace trimmed version of textContent ensuring surrounding whitespace is not modified
    return textContent.replace(frozenString, output);
}
// Get next or previous text sibling a text node, including cases
// when it's a child of inline element (e.g. link)
function getTextSibling(node, backward) {
    let sibling = backward ? node.getPreviousSibling() : node.getNextSibling();
    if (!sibling) {
        const parent = node.getParentOrThrow();
        if (parent.isInline()) {
            sibling = backward ? parent.getPreviousSibling() : parent.getNextSibling();
        }
    }
    while (sibling) {
        if ((0, lexical_1.$isElementNode)(sibling)) {
            if (!sibling.isInline()) {
                break;
            }
            const descendant = backward ? sibling.getLastDescendant() : sibling.getFirstDescendant();
            if ((0, lexical_1.$isTextNode)(descendant)) {
                return descendant;
            }
            else {
                sibling = backward ? sibling.getPreviousSibling() : sibling.getNextSibling();
            }
        }
        if ((0, lexical_1.$isTextNode)(sibling)) {
            return sibling;
        }
        if (!(0, lexical_1.$isElementNode)(sibling)) {
            return null;
        }
    }
    return null;
}
function hasFormat(node, format) {
    return (0, lexical_1.$isTextNode)(node) && node.hasFormat(format);
}
