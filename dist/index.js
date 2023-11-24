"use strict";
/** @module @lexical/markdown-dejiren */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNORDERED_LIST = exports.TRANSFORMERS = exports.TEXT_MATCH_TRANSFORMERS = exports.TEXT_FORMAT_TRANSFORMERS = exports.STRIKETHROUGH = exports.registerMarkdownShortcuts = exports.QUOTE = exports.ORDERED_LIST = exports.LINK = exports.ITALIC_UNDERSCORE = exports.ITALIC_STAR = exports.INLINE_CODE = exports.HIGHLIGHT = exports.HEADING = exports.ELEMENT_TRANSFORMERS = exports.CODE = exports.CHECK_LIST = exports.BOLD_UNDERSCORE = exports.BOLD_STAR = exports.BOLD_ITALIC_UNDERSCORE = exports.BOLD_ITALIC_STAR = exports.$convertToMarkdownString = exports.$convertFromMarkdownString = void 0;
const MarkdownExport_1 = require("./MarkdownExport");
const MarkdownImport_1 = require("./MarkdownImport");
const MarkdownShortcuts_1 = require("./MarkdownShortcuts");
Object.defineProperty(exports, "registerMarkdownShortcuts", { enumerable: true, get: function () { return MarkdownShortcuts_1.registerMarkdownShortcuts; } });
const MarkdownTransformers_1 = require("./MarkdownTransformers");
Object.defineProperty(exports, "BOLD_ITALIC_STAR", { enumerable: true, get: function () { return MarkdownTransformers_1.BOLD_ITALIC_STAR; } });
Object.defineProperty(exports, "BOLD_ITALIC_UNDERSCORE", { enumerable: true, get: function () { return MarkdownTransformers_1.BOLD_ITALIC_UNDERSCORE; } });
Object.defineProperty(exports, "BOLD_STAR", { enumerable: true, get: function () { return MarkdownTransformers_1.BOLD_STAR; } });
Object.defineProperty(exports, "BOLD_UNDERSCORE", { enumerable: true, get: function () { return MarkdownTransformers_1.BOLD_UNDERSCORE; } });
Object.defineProperty(exports, "CHECK_LIST", { enumerable: true, get: function () { return MarkdownTransformers_1.CHECK_LIST; } });
Object.defineProperty(exports, "CODE", { enumerable: true, get: function () { return MarkdownTransformers_1.CODE; } });
Object.defineProperty(exports, "HEADING", { enumerable: true, get: function () { return MarkdownTransformers_1.HEADING; } });
Object.defineProperty(exports, "HIGHLIGHT", { enumerable: true, get: function () { return MarkdownTransformers_1.HIGHLIGHT; } });
Object.defineProperty(exports, "INLINE_CODE", { enumerable: true, get: function () { return MarkdownTransformers_1.INLINE_CODE; } });
Object.defineProperty(exports, "ITALIC_STAR", { enumerable: true, get: function () { return MarkdownTransformers_1.ITALIC_STAR; } });
Object.defineProperty(exports, "ITALIC_UNDERSCORE", { enumerable: true, get: function () { return MarkdownTransformers_1.ITALIC_UNDERSCORE; } });
Object.defineProperty(exports, "LINK", { enumerable: true, get: function () { return MarkdownTransformers_1.LINK; } });
Object.defineProperty(exports, "ORDERED_LIST", { enumerable: true, get: function () { return MarkdownTransformers_1.ORDERED_LIST; } });
Object.defineProperty(exports, "QUOTE", { enumerable: true, get: function () { return MarkdownTransformers_1.QUOTE; } });
Object.defineProperty(exports, "STRIKETHROUGH", { enumerable: true, get: function () { return MarkdownTransformers_1.STRIKETHROUGH; } });
Object.defineProperty(exports, "UNORDERED_LIST", { enumerable: true, get: function () { return MarkdownTransformers_1.UNORDERED_LIST; } });
const ELEMENT_TRANSFORMERS = [MarkdownTransformers_1.HEADING, MarkdownTransformers_1.QUOTE, MarkdownTransformers_1.CODE, MarkdownTransformers_1.UNORDERED_LIST, MarkdownTransformers_1.ORDERED_LIST];
exports.ELEMENT_TRANSFORMERS = ELEMENT_TRANSFORMERS;
// Order of text format transformers matters:
//
// - code should go first as it prevents any transformations inside
// - then longer tags match (e.g. ** or __ should go before * or _)
const TEXT_FORMAT_TRANSFORMERS = [
    MarkdownTransformers_1.INLINE_CODE,
    MarkdownTransformers_1.BOLD_ITALIC_STAR,
    MarkdownTransformers_1.BOLD_ITALIC_UNDERSCORE,
    MarkdownTransformers_1.BOLD_STAR,
    MarkdownTransformers_1.BOLD_UNDERSCORE,
    MarkdownTransformers_1.HIGHLIGHT,
    MarkdownTransformers_1.ITALIC_STAR,
    MarkdownTransformers_1.ITALIC_UNDERSCORE,
    MarkdownTransformers_1.STRIKETHROUGH,
];
exports.TEXT_FORMAT_TRANSFORMERS = TEXT_FORMAT_TRANSFORMERS;
const TEXT_MATCH_TRANSFORMERS = [MarkdownTransformers_1.LINK];
exports.TEXT_MATCH_TRANSFORMERS = TEXT_MATCH_TRANSFORMERS;
const TRANSFORMERS = [
    ...ELEMENT_TRANSFORMERS,
    ...TEXT_FORMAT_TRANSFORMERS,
    ...TEXT_MATCH_TRANSFORMERS,
];
exports.TRANSFORMERS = TRANSFORMERS;
function $convertFromMarkdownString(markdown, transformers = TRANSFORMERS, node) {
    const importMarkdown = (0, MarkdownImport_1.createMarkdownImport)(transformers);
    return importMarkdown(markdown, node);
}
exports.$convertFromMarkdownString = $convertFromMarkdownString;
function $convertToMarkdownString(transformers = TRANSFORMERS, node) {
    const exportMarkdown = (0, MarkdownExport_1.createMarkdownExport)(transformers);
    return exportMarkdown(node);
}
exports.$convertToMarkdownString = $convertToMarkdownString;
