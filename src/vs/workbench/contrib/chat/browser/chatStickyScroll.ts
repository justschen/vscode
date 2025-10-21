/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from '../../../../base/browser/dom.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import './media/chatStickyScroll.css';

/**
 * Determines whether to show the sticky preview of the latest chat message.
 * Unified semantics:
 *  - Legacy (rowTop,rowHeight,scrollTop): show when the latest item is completely above the viewport.
 *  - With viewport height: show when the item is entirely above or below the viewport.
 *  - Tall message heuristic: keep sticky when a very tall message is partially outside the viewport.
 */
export function computeShouldShowSticky(rowTop: number, rowHeight: number, scrollTop: number, viewportHeight?: number): boolean {
	const rowBottom = rowTop + rowHeight;
	const viewportTop = scrollTop;
	if (viewportHeight === undefined) {
		return rowBottom <= viewportTop;
	}
	const viewportBottom = viewportTop + viewportHeight;
	const fullyAbove = rowBottom <= viewportTop;
	const fullyBelow = rowTop >= viewportBottom;
	if (fullyAbove || fullyBelow) {
		return true;
	}
	if (rowHeight > viewportHeight) {
		const tolerance = 4;
		const topOutside = rowTop < viewportTop - tolerance;
		const bottomOutside = rowBottom > viewportBottom + tolerance;
		return topOutside || bottomOutside;
	}
	return false;
}

export interface IChatStickyRequestSnapshot {
	id: string;
	top: number;
	height: number;
	sourceRow?: HTMLElement;
}

export class ChatStickyScroll extends Disposable {
	private static readonly MAX_CACHED_CLONES = 6;

	private readonly container: HTMLElement;
	private readonly getScrollTop: () => number;
	private readonly getViewportHeight: () => number;
	private readonly getSnapshot?: () => IChatStickyRequestSnapshot | undefined;

	private overlayDom: HTMLElement | undefined;
	private isVisible = false;
	private lastRequestId: string | undefined;
	private lastHeight = -1;
	private readonly cloneCache = new Map<string, HTMLElement>();

	constructor(listContainer: HTMLElement, getScrollTop: () => number, getViewportHeight: () => number, getSnapshot?: () => IChatStickyRequestSnapshot | undefined) {
		super();
		this.container = listContainer;
		this.getScrollTop = getScrollTop;
		this.getViewportHeight = getViewportHeight;
		this.getSnapshot = getSnapshot;
	}

	public updateSticky(): void {
		const snapshot = this.getSnapshot ? this.getSnapshot() : undefined;
		if (!snapshot) {
			this.hide();
			return;
		}

		const { id, top, sourceRow } = snapshot;
		const height = Math.max(1, snapshot.height);

		if (sourceRow) {
			this.cloneCache.set(id, this.prepareClone(sourceRow));
			this.pruneCloneCache();
		}

		const template = this.cloneCache.get(id);
		if (!template) {
			this.hide();
			return;
		}

		const scrollTop = this.getScrollTop();
		const viewportHeight = this.getViewportHeight();
		if (!computeShouldShowSticky(top, height, scrollTop, viewportHeight)) {
			this.hide();
			return;
		}

		if (!this.isVisible || id !== this.lastRequestId || height !== this.lastHeight) {
			this.render(template, height);
			this.lastRequestId = id;
			this.lastHeight = height;
		} else {
			this.applyHeight(height);
			this.show();
		}
	}

	private prepareClone(sourceRow: HTMLElement): HTMLElement {
		const clone = sourceRow.cloneNode(true) as HTMLElement;
		clone.removeAttribute('id');
		clone.setAttribute('data-chat-sticky-clone', 'true');
		return clone;
	}

	private ensureRoot(): HTMLElement {
		if (!this.overlayDom) {
			const overlay = dom.$('.chat-sticky-last-message');
			overlay.setAttribute('aria-hidden', 'true');
			overlay.style.pointerEvents = 'none';
			this.container.appendChild(overlay);
			this.overlayDom = overlay;
		}
		return this.overlayDom;
	}

	private applyHeight(height: number): void {
		// const overlay = this.ensureRoot();
		// const capped = Math.min(height, 200);
		// const value = `${capped}px`;
		// overlay.style.setProperty('--chat-sticky-height', value);
	}

	private render(template: HTMLElement, height: number): void {
		const overlay = this.ensureRoot();
		this.applyHeight(height);
		dom.clearNode(overlay);
		overlay.appendChild(template.cloneNode(true));
		this.show();
	}

	private show(): void {
		const overlay = this.overlayDom;
		if (!overlay) {
			return;
		}
		overlay.classList.add('visible');
		this.isVisible = true;
	}

	private hide(): void {
		const overlay = this.overlayDom;
		if (!overlay) {
			this.isVisible = false;
			return;
		}
		if (this.isVisible) {
			overlay.classList.remove('visible');
		}
		this.isVisible = false;
		this.lastRequestId = undefined;
	}

	private pruneCloneCache(): void {
		while (this.cloneCache.size > ChatStickyScroll.MAX_CACHED_CLONES) {
			const oldest = this.cloneCache.keys().next().value as string | undefined;
			if (oldest === undefined) {
				break;
			}
			this.cloneCache.delete(oldest);
		}
	}
}
