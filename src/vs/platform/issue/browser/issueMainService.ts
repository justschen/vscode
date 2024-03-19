/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* eslint-disable local/code-import-patterns */
/* eslint-disable local/code-layering */
import { safeInnerHtml } from 'vs/base/browser/dom';
import { DisposableStore } from 'vs/base/common/lifecycle';
import { IProcessEnvironment } from 'vs/base/common/platform';
import { URI } from 'vs/base/common/uri';
import { IDiagnosticsService, PerformanceInfo, SystemInfo } from 'vs/platform/diagnostics/common/diagnostics';
import { IIssueMainService, IssueReporterData, ProcessExplorerData } from 'vs/platform/issue/common/issue';
import { ILogService } from 'vs/platform/log/common/log';
import { INativeHostMainService } from 'vs/platform/native/electron-main/nativeHostMainService';
import { IProductService } from 'vs/platform/product/common/productService';
import { BrowserAuxiliaryWindowService, AuxiliaryWindow, IAuxiliaryWindowService } from 'vs/workbench/services/auxiliaryWindow/browser/auxiliaryWindowService';
import BaseHtml from 'vs/code/electron-sandbox/issue/issueReporterPage';


const processExplorerWindowState = 'issue.processExplorerWindowState';

interface IBrowserWindowOptions {
	backgroundColor: string | undefined;
	title: string;
	zoomLevel: number;
	alwaysOnTop: boolean;
}

// type IStrictWindowState = Required<Pick<IWindowState, 'x' | 'y' | 'width' | 'height'>>;

export class IssueMainService implements IIssueMainService {

	declare readonly _serviceBrand: undefined;

	private static readonly DEFAULT_BACKGROUND_COLOR = '#1E1E1E';

	private issueReporterWindow: AuxiliaryWindow | null = null;
	// private issueReporterParentWindow: BrowserWindow | null = null;

	// private processExplorerWindow: BrowserWindow | null = null;
	// private processExplorerParentWindow: BrowserWindow | null = null;

	constructor(
		private userEnv: IProcessEnvironment,
		@ILogService private readonly logService: ILogService,
		@IDiagnosticsService private readonly diagnosticsService: IDiagnosticsService,
		@INativeHostMainService private readonly nativeHostMainService: INativeHostMainService,
		@IProductService private readonly productService: IProductService,
		@IAuxiliaryWindowService private readonly auxWindowService: IAuxiliaryWindowService,
		readonly browserAuxiliaryWindowService: BrowserAuxiliaryWindowService
	) {
		this.issueReporterWindow?.onDidLayout(() => {
		});
	}

	async openReporter(data: IssueReporterData): Promise<void> {
		const disposables = new DisposableStore();

		// Auxiliary Window
		const auxiliaryWindow = disposables.add(await this.browserAuxiliaryWindowService.open());

		// Editor Part
		const editorPartContainer = document.createElement('div');
		editorPartContainer.classList.add('part', 'editor');
		editorPartContainer.setAttribute('role', 'main');
		editorPartContainer.style.position = 'relative';
		safeInnerHtml(editorPartContainer, BaseHtml());
		auxiliaryWindow.container.appendChild(editorPartContainer);
		console.log(data);
		// if (!this.issueReporterWindow) {
		//  this.issueReporterParentWindow = BrowserWindow.getFocusedWindow();
		//  if (this.issueReporterParentWindow) {
		//      const issueReporterDisposables = new DisposableStore();

		//      const issueReporterWindowConfigUrl = issueReporterDisposables.add(this.protocolMainService.createIPCObjectUrl<IssueReporterWindowConfiguration>());
		//      const position = this.getWindowPosition(this.issueReporterParentWindow, 700, 800);

		//      this.issueReporterWindow = this.createBrowserWindow(position, issueReporterWindowConfigUrl, {
		//          backgroundColor: data.styles.backgroundColor,
		//          title: localize('issueReporter', "Issue Reporter"),
		//          zoomLevel: data.zoomLevel,
		//          alwaysOnTop: false
		//      }, 'issue-reporter');

		//      // Store into config object URL
		//      issueReporterWindowConfigUrl.update({
		//          appRoot: this.environmentMainService.appRoot,
		//          windowId: this.issueReporterWindow.id,
		//          userEnv: this.userEnv,
		//          data,
		//          disableExtensions: !!this.environmentMainService.disableExtensions,
		//          os: {
		//              type: type(),
		//              arch: arch(),
		//              release: release(),
		//          },
		//          product
		//      });

		//      this.issueReporterWindow.loadURL(
		//          FileAccess.asBrowserUri(`vs/code/electron-sandbox/issue/issueReporter${this.environmentMainService.isBuilt ? '' : '-dev'}.html`).toString(true)
		//      );

		//      this.issueReporterWindow.on('close', () => {
		//          this.issueReporterWindow = null;
		//          issueReporterDisposables.dispose();
		//      });

		//      this.issueReporterParentWindow.on('closed', () => {
		//          if (this.issueReporterWindow) {
		//              this.issueReporterWindow.close();
		//              this.issueReporterWindow = null;
		//              issueReporterDisposables.dispose();
		//          }
		//      });
		//  }
		// }

		// else if (this.issueReporterWindow) {
		//  this.focusWindow(this.issueReporterWindow);
		// }
	}

	async openProcessExplorer(data: ProcessExplorerData): Promise<void> {

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
	$sendReporterMenu(extensionId: string, extensionName: string): Promise<IssueReporterData | undefined> {
		throw new Error('Method not implemented.');
	}
	$closeReporter(): Promise<void> {
		throw new Error('Method not implemented.');
	}


}

