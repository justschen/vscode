/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ChatImplicitContext } from '../../browser/contrib/chatImplicitContext.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';

suite('ImplicitContext', function () {

	let store: DisposableStore;

	setup(function () {
		store = new DisposableStore();
	});

	teardown(function () {
		store.dispose();
	});

	ensureNoDisposablesAreLeakedInTestSuite();

	test('no selection in agent mode - just chat message', function () {
		// When agent mode is active with no selection, the implicit context should
		// not be automatically attached - just the chat message is sent
		const implicitContext = store.add(new ChatImplicitContext());

		// No value set - should represent just a chat message
		assert.strictEqual(implicitContext.value, undefined);
		assert.strictEqual(implicitContext.enabled, true);
		assert.strictEqual(implicitContext.isSelection, false);
	});

	test('with selection in agent mode - selection included', function () {
		// When agent mode is active with a selection, the implicit context (selection)
		// should be attached as part of the chat message
		const implicitContext = store.add(new ChatImplicitContext());
		const uri = URI.parse('file:///test.ts');
		const selectionRange = new Range(1, 1, 1, 20);

		// Set selection
		implicitContext.setValue({ uri, range: selectionRange }, true);

		assert.ok(implicitContext.value);
		assert.strictEqual(implicitContext.isSelection, true);
		assert.strictEqual(implicitContext.id, 'vscode.implicit.selection');
	});

	test('with file in ask mode - file context included', function () {
		// When ask mode is active with a file attached, the implicit context (file)
		// should be attached as part of the chat message
		const implicitContext = store.add(new ChatImplicitContext());
		const uri = URI.parse('file:///test.ts');

		// Set file URI
		implicitContext.setValue(uri, false);

		assert.ok(implicitContext.value);
		assert.strictEqual(implicitContext.isSelection, false);
		assert.strictEqual(implicitContext.id, 'vscode.implicit.file');
	});

	test('implicit context disabled - no attachment', function () {
		// When implicit context is explicitly disabled, no implicit context
		// should be attached even if available
		const implicitContext = store.add(new ChatImplicitContext());
		const uri = URI.parse('file:///test.ts');

		implicitContext.setValue(uri, false);
		implicitContext.enabled = false;

		assert.strictEqual(implicitContext.enabled, false);
		assert.ok(implicitContext.value); // Still has value but disabled
	});

	test('selection vs viewport context', function () {
		// Test that implicit context properly distinguishes between selections and viewport
		const implicitContext = store.add(new ChatImplicitContext());
		const uri = URI.parse('file:///test.ts');
		const selectionRange = new Range(2, 1, 4, 10);

		// Set as selection
		implicitContext.setValue({ uri, range: selectionRange }, true);
		assert.strictEqual(implicitContext.isSelection, true);
		assert.strictEqual(implicitContext.id, 'vscode.implicit.selection');

		// Set as viewport (not a selection)
		implicitContext.setValue({ uri, range: selectionRange }, false);
		assert.strictEqual(implicitContext.isSelection, false);
		assert.strictEqual(implicitContext.id, 'vscode.implicit.viewport');
	});

	test('to base entries conversion', function () {
		// Test that implicit context can be converted to base entries for chat requests
		const implicitContext = store.add(new ChatImplicitContext());
		const uri = URI.parse('file:///test.ts');

		implicitContext.setValue(uri, false);
		const entries = implicitContext.toBaseEntries();

		assert.strictEqual(entries.length, 1);
		assert.strictEqual(entries[0].kind, 'file');
		assert.strictEqual(entries[0].id, 'vscode.implicit.file');
	});

	test('change notification on value update', function () {
		// Test that value changes trigger notifications
		const implicitContext = store.add(new ChatImplicitContext());
		const uri = URI.parse('file:///test.ts');
		let notificationCount = 0;

		implicitContext.onDidChangeValue(() => {
			notificationCount++;
		});

		implicitContext.setValue(uri, false);
		assert.strictEqual(notificationCount, 1);

		implicitContext.setValue(uri, true);
		assert.strictEqual(notificationCount, 2);

		implicitContext.enabled = false;
		assert.strictEqual(notificationCount, 3);
	});

	test('model description for different context types', function () {
		// Test that model descriptions are appropriate for context type
		const implicitContext = store.add(new ChatImplicitContext());
		const uri = URI.parse('file:///test.ts');
		const range = new Range(1, 1, 5, 1);

		// File context
		implicitContext.setValue(uri, false);
		assert.strictEqual(implicitContext.modelDescription, 'User\'s active file');

		// Selection context
		implicitContext.setValue({ uri, range }, true);
		assert.strictEqual(implicitContext.modelDescription, 'User\'s active selection');

		// Viewport context
		implicitContext.setValue({ uri, range }, false);
		assert.strictEqual(implicitContext.modelDescription, 'User\'s current visible code');
	});

});
