/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { getZoomLevel } from 'vs/base/browser/browser';
import * as dom from 'vs/base/browser/dom';
import { CancellationToken } from 'vs/base/common/cancellation';
import { IDisposable, toDisposable } from 'vs/base/common/lifecycle';
import { userAgent } from 'vs/base/common/platform';
import { IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { InstantiationType, registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IIssueMainService, IssueReporterData, IssueReporterStyles } from 'vs/platform/issue/common/issue';
import { normalizeGitHubUrl } from 'vs/platform/issue/common/issueReporterUtil';
import { ILogService } from 'vs/platform/log/common/log';
import { IProductService } from 'vs/platform/product/common/productService';
import { IColorTheme, IThemeService } from 'vs/platform/theme/common/themeService';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { IIssueDataProvider, IIssueUriRequestHandler, IWorkbenchIssueService } from 'vs/workbench/services/issue/common/issue';
import { mainWindow } from 'vs/base/browser/window';
import { IWorkbenchAssignmentService } from 'vs/workbench/services/assignment/common/assignmentService';
import { IWorkspaceTrustManagementService } from 'vs/platform/workspace/common/workspaceTrust';
import { IAuthenticationService } from 'vs/workbench/services/authentication/common/authentication';
import { IIntegrityService } from 'vs/workbench/services/integrity/common/integrity';
import { foreground, textLinkForeground, textLinkActiveForeground, inputBackground, inputForeground, inputBorder, inputActiveOptionBorder, inputValidationErrorBorder, inputValidationErrorBackground, inputValidationErrorForeground, buttonBackground, buttonForeground, buttonHoverBackground, scrollbarSliderActiveBackground, scrollbarSliderBackground, scrollbarSliderHoverBackground } from 'vs/platform/theme/common/colorRegistry';
import { SIDE_BAR_BACKGROUND } from 'vs/workbench/common/theme';

export class WebIssueService implements IWorkbenchIssueService {
	declare readonly _serviceBrand: undefined;

	private readonly _handlers = new Map<string, IIssueUriRequestHandler>();
	private readonly _providers = new Map<string, IIssueDataProvider>();

	constructor(
		@IExtensionService private readonly extensionService: IExtensionService,
		@IProductService private readonly productService: IProductService,
		@ILogService private readonly logService: ILogService,
		@IIssueMainService private readonly issueMainService: IIssueMainService,
		@IThemeService private readonly themeService: IThemeService,
		@IWorkbenchAssignmentService private readonly experimentService: IWorkbenchAssignmentService,
		@IWorkspaceTrustManagementService private readonly workspaceTrustManagementService: IWorkspaceTrustManagementService,
		@IAuthenticationService private readonly authenticationService: IAuthenticationService,
		@IIntegrityService private readonly integrityService: IIntegrityService,
	) { }

	//TODO @TylerLeonhardt @Tyriar to implement a process explorer for the web
	async openProcessExplorer(): Promise<void> {
		console.error('openProcessExplorer is not implemented in web');
	}

	async openReporter(options: Partial<IssueReporterData>): Promise<void> {
		const extensionId = options.extensionId;
		// If we don't have a extensionId, treat this as a Core issue
		if (!extensionId) {
			if (this.productService.reportIssueUrl) {
				const uri = this.getIssueUriFromStaticContent(this.productService.reportIssueUrl);
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
				}, options);
				this.issueMainService.openReporter(issueReporterData);
				// dom.windowOpenNoOpener(uri);
				return;
			}
			throw new Error(`No issue reporting URL configured for ${this.productService.nameLong}.`);
		}

		// If we have a handler registered for this extension, use it instead of anything else
		if (this._handlers.has(extensionId)) {
			try {
				const uri = await this.getIssueUriFromHandler(extensionId, CancellationToken.None);
				dom.windowOpenNoOpener(uri);
				return;
			} catch (e) {
				this.logService.error(e);
			}
		}

		// if we don't have a handler, or the handler failed, try to get the extension's github url
		const selectedExtension = this.extensionService.extensions.filter(ext => ext.identifier.value === options.extensionId)[0];
		const extensionGitHubUrl = this.getExtensionGitHubUrl(selectedExtension);
		if (!extensionGitHubUrl) {
			throw new Error(`Unable to find issue reporting url for ${extensionId}`);
		}

		const uri = this.getIssueUriFromStaticContent(`${extensionGitHubUrl}/issues/new`, selectedExtension);
		dom.windowOpenNoOpener(uri);
	}

	registerIssueUriRequestHandler(extensionId: string, handler: IIssueUriRequestHandler): IDisposable {
		this._handlers.set(extensionId, handler);
		return toDisposable(() => this._handlers.delete(extensionId));
	}

	registerIssueDataProvider(extensionId: string, handler: IIssueDataProvider): IDisposable {
		this._providers.set(extensionId, handler);
		return toDisposable(() => this._providers.delete(extensionId));
	}

	private async getIssueUriFromHandler(extensionId: string, token: CancellationToken): Promise<string> {
		const handler = this._handlers.get(extensionId);
		if (!handler) {
			throw new Error(`No handler registered for extension ${extensionId}`);
		}
		const result = await handler.provideIssueUrl(token);
		return result.toString(true);
	}

	private getExtensionGitHubUrl(extension: IExtensionDescription): string {
		if (extension.isBuiltin && this.productService.reportIssueUrl) {
			return normalizeGitHubUrl(this.productService.reportIssueUrl);
		}

		let repositoryUrl = '';

		const bugsUrl = extension?.bugs?.url;
		const extensionUrl = extension?.repository?.url;

		// If given, try to match the extension's bug url
		if (bugsUrl && bugsUrl.match(/^https?:\/\/github\.com\/(.*)/)) {
			repositoryUrl = normalizeGitHubUrl(bugsUrl);
		} else if (extensionUrl && extensionUrl.match(/^https?:\/\/github\.com\/(.*)/)) {
			repositoryUrl = normalizeGitHubUrl(extensionUrl);
		}

		return repositoryUrl;
	}

	private getIssueUriFromStaticContent(baseUri: string, extension?: IExtensionDescription): string {
		const issueDescription = `ADD ISSUE DESCRIPTION HERE

Version: ${this.productService.version}
Commit: ${this.productService.commit ?? 'unknown'}
User Agent: ${userAgent ?? 'unknown'}
Embedder: ${this.productService.embedderIdentifier ?? 'unknown'}
${extension?.version ? `\nExtension version: ${extension.version}` : ''}
<!-- generated by web issue reporter -->`;

		return `${baseUri}?body=${encodeURIComponent(issueDescription)}&labels=web`;
	}
}

export function getIssueReporterStyles(theme: IColorTheme): IssueReporterStyles {
	return {
		backgroundColor: getColor(theme, SIDE_BAR_BACKGROUND),
		color: getColor(theme, foreground),
		textLinkColor: getColor(theme, textLinkForeground),
		textLinkActiveForeground: getColor(theme, textLinkActiveForeground),
		inputBackground: getColor(theme, inputBackground),
		inputForeground: getColor(theme, inputForeground),
		inputBorder: getColor(theme, inputBorder),
		inputActiveBorder: getColor(theme, inputActiveOptionBorder),
		inputErrorBorder: getColor(theme, inputValidationErrorBorder),
		inputErrorBackground: getColor(theme, inputValidationErrorBackground),
		inputErrorForeground: getColor(theme, inputValidationErrorForeground),
		buttonBackground: getColor(theme, buttonBackground),
		buttonForeground: getColor(theme, buttonForeground),
		buttonHoverBackground: getColor(theme, buttonHoverBackground),
		sliderActiveColor: getColor(theme, scrollbarSliderActiveBackground),
		sliderBackgroundColor: getColor(theme, scrollbarSliderBackground),
		sliderHoverColor: getColor(theme, scrollbarSliderHoverBackground),
	};
}

function getColor(theme: IColorTheme, key: string): string | undefined {
	const color = theme.getColor(key);
	return color ? color.toString() : undefined;
}

registerSingleton(IWorkbenchIssueService, WebIssueService, InstantiationType.Delayed);
