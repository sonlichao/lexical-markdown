"use strict";
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IS_APPLE_WEBKIT = exports.IS_CHROME = exports.IS_ANDROID = exports.IS_IOS = exports.IS_SAFARI = exports.CAN_USE_BEFORE_INPUT = exports.IS_FIREFOX = exports.IS_APPLE = exports.CAN_USE_DOM = void 0;
exports.CAN_USE_DOM = typeof window !== "undefined" &&
    typeof window.document !== "undefined" &&
    typeof window.document.createElement !== "undefined";
const documentMode = exports.CAN_USE_DOM && "documentMode" in document ? document.documentMode : null;
exports.IS_APPLE = exports.CAN_USE_DOM && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
exports.IS_FIREFOX = exports.CAN_USE_DOM && /^(?!.*Seamonkey)(?=.*Firefox).*/i.test(navigator.userAgent);
exports.CAN_USE_BEFORE_INPUT = exports.CAN_USE_DOM && "InputEvent" in window && !documentMode ? "getTargetRanges" in new window.InputEvent("input") : false;
exports.IS_SAFARI = exports.CAN_USE_DOM && /Version\/[\d.]+.*Safari/.test(navigator.userAgent);
exports.IS_IOS = exports.CAN_USE_DOM && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
exports.IS_ANDROID = exports.CAN_USE_DOM && /Android/.test(navigator.userAgent);
// Keep these in case we need to use them in the future.
// export const IS_WINDOWS: boolean = CAN_USE_DOM && /Win/.test(navigator.platform);
exports.IS_CHROME = exports.CAN_USE_DOM && /^(?=.*Chrome).*/i.test(navigator.userAgent);
// export const canUseTextInputEvent: boolean = CAN_USE_DOM && 'TextEvent' in window && !documentMode;
exports.IS_APPLE_WEBKIT = exports.CAN_USE_DOM && /AppleWebKit\/[\d.]+/.test(navigator.userAgent) && !exports.IS_CHROME;
