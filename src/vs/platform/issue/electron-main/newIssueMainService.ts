/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BrowserWindow, BrowserWindowConstructorOptions, contentTracing, Display, IpcMainEvent, screen } from 'electron';
import { arch, release, type } from 'os';
import { raceTimeout } from 'vs/base/common/async';
import { CancellationTokenSource } from 'vs/base/common/cancellation';
import { randomPath } from 'vs/base/common/extpath';
import { DisposableStore } from 'vs/base/common/lifecycle';
import { FileAccess } from 'vs/base/common/network';
import { IProcessEnvironment, isMacintosh } from 'vs/base/common/platform';
import { listProcesses } from 'vs/base/node/ps';
import { validatedIpcMain } from 'vs/base/parts/ipc/electron-main/ipcMain';
import { localize } from 'vs/nls';
import { IDiagnosticsService, isRemoteDiagnosticError, PerformanceInfo, SystemInfo } from 'vs/platform/diagnostics/common/diagnostics';
import { IDiagnosticsMainService } from 'vs/platform/diagnostics/electron-main/diagnosticsMainService';
import { IDialogMainService } from 'vs/platform/dialogs/electron-main/dialogMainService';
import { IEnvironmentMainService } from 'vs/platform/environment/electron-main/environmentMainService';
import { IIssueMainService2, INewIssueMainService, IssueReporterData, IssueReporterWindowConfiguration, ProcessExplorerData, ProcessExplorerWindowConfiguration } from 'vs/platform/issue/common/issue';
import { ILogService } from 'vs/platform/log/common/log';
import { INativeHostMainService } from 'vs/platform/native/electron-main/nativeHostMainService';
import product from 'vs/platform/product/common/product';
import { IProductService } from 'vs/platform/product/common/productService';
import { IIPCObjectUrl, IProtocolMainService } from 'vs/platform/protocol/electron-main/protocol';
import { IStateService } from 'vs/platform/state/node/state';
import { UtilityProcess } from 'vs/platform/utilityProcess/electron-main/utilityProcess';
import { zoomLevelToZoomFactor } from 'vs/platform/window/common/window';
import { ICodeWindow, IWindowState } from 'vs/platform/window/electron-main/window';
import { IWindowsMainService } from 'vs/platform/windows/electron-main/windows';

const processExplorerWindowState = 'issue.processExplorerWindowState';

interface IBrowserWindowOptions {
	backgroundColor: string | undefined;
	title: string;
	zoomLevel: number;
	alwaysOnTop: boolean;
}

type IStrictWindowState = Required<Pick<IWindowState, 'x' | 'y' | 'width' | 'height'>>;

export class IssueMainService implements INewIssueMainService {

	declare readonly _serviceBrand: undefined;

	private static readonly DEFAULT_BACKGROUND_COLOR = '#1E1E1E';

	private issueReporterWindow: BrowserWindow | null = null;
	private issueReporterParentWindow: BrowserWindow | null = null;

	private processExplorerWindow: BrowserWindow | null = null;
	private processExplorerParentWindow: BrowserWindow | null = null;

	constructor(
		private userEnv: IProcessEnvironment,
		@IEnvironmentMainService private readonly environmentMainService: IEnvironmentMainService,
		@ILogService private readonly logService: ILogService,
		@IDiagnosticsService private readonly diagnosticsService: IDiagnosticsService,
		@IDiagnosticsMainService private readonly diagnosticsMainService: IDiagnosticsMainService,
		@IDialogMainService private readonly dialogMainService: IDialogMainService,
		@INativeHostMainService private readonly nativeHostMainService: INativeHostMainService,
		@IProtocolMainService private readonly protocolMainService: IProtocolMainService,
		@IProductService private readonly productService: IProductService,
		@IStateService private readonly stateService: IStateService,
		@IWindowsMainService private readonly windowsMainService: IWindowsMainService,
	) { }


	async stopTracing(): Promise<void> {
		if (!this.environmentMainService.args.trace) {
			return; // requires tracing to be on
		}

		const path = await contentTracing.stopRecording(`${randomPath(this.environmentMainService.userHome.fsPath, this.productService.applicationName)}.trace.txt`);

		// Inform user to report an issue
		await this.dialogMainService.showMessageBox({
			type: 'info',
			message: localize('trace.message', "Successfully created the trace file"),
			detail: localize('trace.detail', "Please create an issue and manually attach the following file:\n{0}", path),
			buttons: [localize({ key: 'trace.ok', comment: ['&& denotes a mnemonic'] }, "&&OK")],
		}, BrowserWindow.getFocusedWindow() ?? undefined);

		// Show item in explorer
		this.nativeHostMainService.showItemInFolder(undefined, path);
	}

	async getSystemStatus(): Promise<string> {
		const [info, remoteData] = await Promise.all([this.diagnosticsMainService.getMainDiagnostics(), this.diagnosticsMainService.getRemoteDiagnostics({ includeProcesses: false, includeWorkspaceMetadata: false })]);

		return this.diagnosticsService.getDiagnostics(info, remoteData);
	}

	//#endregion

	//#region used by issue reporter window

	async $getSystemInfo(): Promise<SystemInfo> {
		const [info, remoteData] = await Promise.all([this.diagnosticsMainService.getMainDiagnostics(), this.diagnosticsMainService.getRemoteDiagnostics({ includeProcesses: false, includeWorkspaceMetadata: false })]);
		const msg = await this.diagnosticsService.getSystemInfo(info, remoteData);
		return msg;
	}

	async $getPerformanceInfo(): Promise<PerformanceInfo> {
		try {
			const [info, remoteData] = await Promise.all([this.diagnosticsMainService.getMainDiagnostics(), this.diagnosticsMainService.getRemoteDiagnostics({ includeProcesses: true, includeWorkspaceMetadata: true })]);
			return await this.diagnosticsService.getPerformanceInfo(info, remoteData);
		} catch (error) {
			this.logService.warn('issueService#getPerformanceInfo ', error.message);

			throw error;
		}
	}
}
