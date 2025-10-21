/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { computeShouldShowSticky } from '../../browser/chatStickyScroll.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';

suite('ChatStickyScroll', () => {
	ensureNoDisposablesAreLeakedInTestSuite();

	test('computeShouldShowSticky - row fully visible (at top)', () => {
		const show = computeShouldShowSticky(200, 100, 200); // bottom = 300, scrollTop = 200 => bottom > scrollTop
		assert.strictEqual(show, false);
	});

	test('computeShouldShowSticky - row partially scrolled past top should still hide', () => {
		// Row top is just above scrollTop but not fully out of view
		// scrollTop 205, rowTop 200, height 100 => bottom=300 > scrollTop => not fully gone
		const show = computeShouldShowSticky(200, 100, 205);
		assert.strictEqual(show, false);
	});

	test('computeShouldShowSticky - row fully scrolled out above viewport', () => {
		// bottom (300) <= scrollTop (301) => fully out
		const show = computeShouldShowSticky(200, 100, 301);
		assert.strictEqual(show, true);
	});

	test('computeShouldShowSticky - large row must scroll fully out', () => {
		const show = computeShouldShowSticky(0, 400, 399); // bottom 400 > 399 => still visible
		assert.strictEqual(show, false);
		const show2 = computeShouldShowSticky(0, 400, 400); // bottom == scrollTop => gone
		assert.strictEqual(show2, true);
	});
});
