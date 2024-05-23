/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { safeInnerHtml } from 'vs/base/browser/dom';
import { mainWindow } from 'vs/base/browser/window';
import { DisposableStore } from 'vs/base/common/lifecycle';
import { URI } from 'vs/base/common/uri';
import BaseHtml from 'vs/workbench/browser/issues/issueReporterPage';
import 'vs/css!./media/issueReporter';
import { IMenuService, MenuId } from 'vs/platform/actions/common/actions';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { PerformanceInfo, SystemInfo } from 'vs/platform/diagnostics/common/diagnostics';
import { ExtensionIdentifier, ExtensionIdentifierSet } from 'vs/platform/extensions/common/extensions';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IIssueMainService, IssueReporterData, ProcessExplorerData } from 'vs/platform/issue/common/issue';
import product from 'vs/platform/product/common/product';
import { IssueWebReporter } from 'vs/workbench/browser/issues/issueReporterService';
import { AuxiliaryWindowMode, IAuxiliaryWindowService } from 'vs/workbench/services/auxiliaryWindow/browser/auxiliaryWindowService';
import { data } from 'vs/base/test/common/filters.perf.data';

export interface IssueReporterReturnData {
	issueBody: string;
	issueTitle: string;
}

export class IssueMainService implements IIssueMainService {

	readonly _serviceBrand: undefined;
	private timeout: NodeJS.Timeout | undefined;

	private issueReporterWindow: Window | null = null;
	private extensionIdentifierSet: ExtensionIdentifierSet = new ExtensionIdentifierSet();
	private extensionData: IssueReporterReturnData = { issueBody: '', issueTitle: '' };

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IAuxiliaryWindowService private readonly auxiliaryWindowService: IAuxiliaryWindowService,
		@IMenuService private readonly menuService: IMenuService,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
	) {

		// listen for messages from the main window
		mainWindow.addEventListener('message', async (event) => {
			if (event.data && event.data.sendChannel === 'vscode:triggerReporterMenu') {
				// creates menu from contributed
				const menu = this.menuService.createMenu(MenuId.IssueReporter, this.contextKeyService);

				// render menu and dispose
				const actions = menu.getActions({ renderShortTitle: true }).flatMap(entry => entry[1]);
				for (const action of actions) {
					try {
						if (action.item && 'source' in action.item && action.item.source?.id === event.data.extensionId) {
							this.extensionIdentifierSet.add(event.data.extensionId);
							await action.run();
						}
					} catch (error) {
						console.error(error);
					}
				}

				if (!this.extensionIdentifierSet.has(event.data.extensionId)) {
					// send undefined to indicate no action was taken
					const replyChannel = `vscode:triggerReporterMenuResponse`;
					mainWindow.postMessage({ replyChannel }, '*');
				}

				menu.dispose();
			}
		});

		mainWindow.addEventListener('message', async (event) => {
			if (event.data && event.data.replyChannel === 'vscode:triggerIssueData') {
				if (event.data.data.issueBody) {
					this.extensionData.issueBody = event.data.data.issueBody;
				}
				if (event.data.data.issueTitle) {
					this.extensionData.issueTitle = event.data.data.issueTitle;
				}
			}
		});
	}

	async openReporter(data: IssueReporterData): Promise<void> {
		if (data.extensionId && this.extensionIdentifierSet.has(data.extensionId)) {
			const replyChannel = `vscode:triggerReporterMenuResponse`;
			mainWindow.postMessage({ data, replyChannel }, '*');
			this.extensionIdentifierSet.delete(new ExtensionIdentifier(data.extensionId));
		}

		if (this.issueReporterWindow) {
			if (this.extensionData && (this.extensionData.issueBody || this.extensionData.issueTitle)) {
				this.issueReporterWindow.close();
				this.issueReporterWindow = null;
				data.issueBody = this.extensionData.issueBody ?? data.issueBody;
				data.issueTitle = this.extensionData.issueTitle ?? data.issueTitle;
				this.openAuxWindow(data);
				return;
			} else {
				this.issueReporterWindow.focus();
				return;
			}
		}

		this.openAuxWindow(data);
	}

	async openAuxWindow(data: IssueReporterData): Promise<void> {
		const disposables = new DisposableStore();

		// Auxiliary Window
		const auxiliaryWindow = disposables.add(await this.auxiliaryWindowService.open({ mode: AuxiliaryWindowMode.Normal }));

		this.issueReporterWindow = auxiliaryWindow.window;



		if (auxiliaryWindow) {
			await auxiliaryWindow.whenStylesHaveLoaded;
			auxiliaryWindow.window.document.title = 'Issue Reporter';
			auxiliaryWindow.window.document.body.classList.add('issue-reporter-body');

			// custom issue reporter wrapper
			const div = document.createElement('div');
			div.classList.add('monaco-workbench');

			// removes preset monaco-workbench
			auxiliaryWindow.container.remove();
			auxiliaryWindow.window.document.body.appendChild(div);
			safeInnerHtml(div, BaseHtml());

			// create issue reporter and instantiate
			const issueReporter = this.instantiationService.createInstance(IssueWebReporter, false, data, { type: '', arch: '', release: '' }, product, auxiliaryWindow.window);
			issueReporter.render();
		} else {
			console.error('Failed to open auxiliary window');
		}

		// handle closing issue reporter
		this.issueReporterWindow?.addEventListener('beforeunload', () => {
			auxiliaryWindow.window.close();
			this.issueReporterWindow = null;
		});
	}

	async openProcessExplorer(data: ProcessExplorerData): Promise<void> {
		throw new Error('Method not implemented.');
	}

	stopTracing(): Promise<void> {
		throw new Error('Method not implemented.');
	}
	getSystemStatus(): Promise<string> {
		throw new Error('Method not implemented.');
	}
	$getSystemInfo(): Promise<SystemInfo> {
		throw new Error('Method not implemented.');
	}
	$getPerformanceInfo(): Promise<PerformanceInfo> {
		throw new Error('Method not implemented.');
	}
	$reloadWithExtensionsDisabled(): Promise<void> {
		throw new Error('Method not implemented.');
	}
	$showConfirmCloseDialog(): Promise<void> {
		throw new Error('Method not implemented.');
	}
	$showClipboardDialog(): Promise<boolean> {
		throw new Error('Method not implemented.');
	}
	$getIssueReporterUri(extensionId: string): Promise<URI> {
		throw new Error('Method not implemented.');
	}
	$getIssueReporterData(extensionId: string): Promise<string> {
		throw new Error('Method not implemented.');
	}
	$getIssueReporterTemplate(extensionId: string): Promise<string> {
		throw new Error('Method not implemented.');
	}
	$getReporterStatus(extensionId: string, extensionName: string): Promise<boolean[]> {
		throw new Error('Method not implemented.');
	}

	async $sendIssueData(body: string, title: string): Promise<void> {
		const replyChannel = 'vscode:triggerIssueData';
		const debounceTime = 500;

		if (this.timeout) {
			clearTimeout(this.timeout);
		}

		this.timeout = setTimeout(() => {
			mainWindow.postMessage({ data: { issueBody: body, issueTitle: title }, replyChannel }, '*');
		}, debounceTime);
	}

	async $sendReporterMenu(extensionId: string, extensionName: string): Promise<IssueReporterData | undefined> {
		const sendChannel = `vscode:triggerReporterMenu`;
		mainWindow.postMessage({ sendChannel, extensionId, extensionName }, '*');

		const result = await new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				mainWindow.removeEventListener('message', listener);
				reject(new Error('Timeout exceeded'));
			}, 5000); // Set the timeout value in milliseconds (e.g., 5000 for 5 seconds)

			const listener = (event: MessageEvent) => {
				const replyChannel = `vscode:triggerReporterMenuResponse`;
				if (event.data && event.data.replyChannel === replyChannel) {
					clearTimeout(timeout);
					mainWindow.removeEventListener('message', listener);
					resolve(event.data.data);
				}
			};
			mainWindow.addEventListener('message', listener);
		});

		return result as IssueReporterData | undefined;
	}

	async $closeReporter(): Promise<void> {
		this.issueReporterWindow?.close();
	}
}
