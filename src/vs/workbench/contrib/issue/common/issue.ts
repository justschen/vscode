/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SystemInfo, PerformanceInfo } from 'vs/platform/diagnostics/common/diagnostics';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IssueReporterData, ProcessExplorerData } from 'vs/platform/issue/common/issue';

export const IWorkbenchIssueService = createDecorator<IWorkbenchIssueService>('workbenchIssueService');

export interface IWorkbenchIssueService {
	readonly _serviceBrand: undefined;
	openReporter(dataOverrides?: Partial<IssueReporterData>): Promise<void>;
	openProcessExplorer(): Promise<void>;

	/// system ifno9
	// etc.
}

export const IWorkbenchIssueService2 = createDecorator<IWorkbenchIssueService2>('workbenchIssueService2');
export interface IWorkbenchIssueService2 {
	readonly _serviceBrand: undefined;
	openReporter(dataOverrides?: Partial<IssueReporterData>): Promise<void>;
	openProcessExplorer(): Promise<void>;
}

export const IIssueMainService = createDecorator<IWorkbenchIssueService2>('workbenchIssueService2');
// For reporter
export interface IIssueMainService {
	readonly _serviceBrand: undefined;
	stopTracing(): Promise<void>; // remove here
	openReporter(data: IssueReporterData): Promise<void>;
	openProcessExplorer(data: ProcessExplorerData): Promise<void>; // remove here
	getSystemStatus(): Promise<string>;

	// Used by the issue reporter

	// $getSystemInfo(): Promise<SystemInfo>;
	// $getPerformanceInfo(): Promise<PerformanceInfo>;
	$reloadWithExtensionsDisabled(): Promise<void>;
	$showConfirmCloseDialog(): Promise<void>;
	$showClipboardDialog(): Promise<boolean>;
	$sendReporterMenu(extensionId: string, extensionName: string): Promise<IssueReporterData | undefined>;
	$closeReporter(): Promise<void>;
}


