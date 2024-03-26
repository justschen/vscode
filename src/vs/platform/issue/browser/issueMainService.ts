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
import { getZoomLevel } from 'vs/base/browser/browser';
import { mainWindow } from 'vs/base/browser/window';
import { getIssueReporterStyles } from 'vs/workbench/services/issue/browser/issueService';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IWorkbenchAssignmentService } from 'vs/workbench/services/assignment/common/assignmentService';
import { IWorkspaceTrustManagementService } from 'vs/platform/workspace/common/workspaceTrust';
import { IAuthenticationService } from 'vs/workbench/services/authentication/common/authentication';
import { IIntegrityService } from 'vs/workbench/services/integrity/common/integrity';
import { IssueReporter } from 'vs/code/browser/issue/issueReporterService';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';



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
		readonly browserAuxiliaryWindowService: BrowserAuxiliaryWindowService,
		@IThemeService private readonly themeService: IThemeService,
		@IWorkbenchAssignmentService private readonly experimentService: IWorkbenchAssignmentService,
		@IWorkspaceTrustManagementService private readonly workspaceTrustManagementService: IWorkspaceTrustManagementService,
		@IAuthenticationService private readonly authenticationService: IAuthenticationService,
		@IIntegrityService private readonly integrityService: IIntegrityService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
	) {
		this.issueReporterWindow?.onDidLayout(() => {
		});
	}

	async openReporter(data: IssueReporterData): Promise<void> {
		const theme = this.themeService.getColorTheme();
		const experiments = await this.experimentService.getCurrentExperiments();

		let githubAccessToken = '';
		try {
			const githubSessions = await this.authenticationService.getSessions('github');
			const potentialSessions = githubSessions.filter(session => session.scopes.includes('repo'));
			githubAccessToken = potentialSessions[0]?.accessToken;
		} catch (e) {
			// Ignore
		}

		// air on the side of caution and have false be the default
		let isUnsupported = false;
		try {
			isUnsupported = !(await this.integrityService.isPure()).isPure;
		} catch (e) {
			// Ignore
		}

		const issueReporterData: IssueReporterData = Object.assign({
			styles: getIssueReporterStyles(theme),
			zoomLevel: getZoomLevel(mainWindow),
			enabledExtensions: {},
			experiments: experiments?.join('\n'),
			restrictedMode: !this.workspaceTrustManagementService.isWorkspaceTrusted(),
			isUnsupported,
			githubAccessToken
		}, data);

		const disposables = new DisposableStore();

		// Auxiliary Window
		const auxiliaryWindow = disposables.add(await this.auxWindowService.open());

		// Editor Part
		const editorPartContainer = document.createElement('div');
		editorPartContainer.classList.add('part', 'editor');
		editorPartContainer.setAttribute('role', 'main');
		editorPartContainer.style.position = 'relative';
		safeInnerHtml(editorPartContainer, BaseHtml());
		auxiliaryWindow.container.appendChild(editorPartContainer);

		const configuration = {
			disableExtensions: false,
			data: issueReporterData,
			os: {
				type: '',
				arch: '',
				release: '',
			},
		};

		const issueReporter = disposables.add(this.instantiationService.createInstance(IssueReporter, configuration));
		issueReporter.render();
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

