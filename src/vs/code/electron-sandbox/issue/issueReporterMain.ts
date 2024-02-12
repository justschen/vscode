/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { safeInnerHtml } from 'vs/base/browser/dom';
import 'vs/base/browser/ui/codicons/codiconStyles'; // make sure codicon css is loaded
import { isLinux, isWindows } from 'vs/base/common/platform';
import BaseHtml from 'vs/code/electron-sandbox/issue/issueReporterPage';
import 'vs/css!./media/issueReporter';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { getSingletonServiceDescriptors } from 'vs/platform/instantiation/common/extensions';
import { InstantiationService } from 'vs/platform/instantiation/common/instantiationService';
import { ServiceCollection } from 'vs/platform/instantiation/common/serviceCollection';
import { IMainProcessService } from 'vs/platform/ipc/common/mainProcessService';
import { ElectronIPCMainProcessService } from 'vs/platform/ipc/electron-sandbox/mainProcessService';
import { registerMainProcessRemoteService } from 'vs/platform/ipc/electron-sandbox/services';
import { IIssueMainService, IssueReporterWindowConfiguration } from 'vs/platform/issue/common/issue';
import { INativeHostService } from 'vs/platform/native/common/native';
import { NativeHostService } from 'vs/platform/native/common/nativeHostService';
import { IssueReporter } from './issueReporterService';
import { mainWindow } from 'vs/base/browser/window';
// import { IMenuService } from 'vs/platform/actions/common/actions';
// import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
// import { MenuService } from 'vs/platform/actions/common/menuService';
// import { ContextKeyService } from 'vs/platform/contextkey/browser/contextKeyService';
// import { IStorageService, InMemoryStorageService } from 'vs/platform/storage/common/storage';
// import { ICommandService } from 'vs/platform/commands/common/commands';
// import { CommandService } from 'vs/workbench/services/commands/common/commandService';
// import { ILogService } from 'vs/platform/log/common/log';
// import { LogService } from 'vs/platform/log/common/logService';
// import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
// import { ExtensionService } from 'vs/workbench/services/extensions/browser/extensionService';
// import { IDialogService } from 'vs/platform/dialogs/common/dialogs';
// import { DialogService } from 'vs/workbench/services/dialogs/common/dialogService';
// import { IWorkspaceTrustManagementService } from 'vs/platform/workspace/common/workspaceTrust';
// import { WorkspaceTrustManagementService } from 'vs/workbench/services/workspaces/common/workspaceTrust';
// import { IUserDataProfileService } from 'vs/workbench/services/userDataProfile/common/userDataProfile';
// import { UserDataProfileService } from 'vs/workbench/services/userDataProfile/common/userDataProfileService';
// import { IUserDataInitializationService, UserDataInitializationService } from 'vs/workbench/services/userData/browser/userDataInit';
// import { IRemoteAuthorityResolverService } from 'vs/platform/remote/common/remoteAuthorityResolver';
// import { RemoteAuthorityResolverService } from 'vs/platform/remote/browser/remoteAuthorityResolverService';
// import { ILifecycleService } from 'vs/workbench/services/lifecycle/common/lifecycle';
// import { NativeLifecycleService } from 'vs/workbench/services/lifecycle/electron-sandbox/lifecycleService';
// import { IRemoteExtensionsScannerService } from 'vs/platform/remote/common/remoteExtensionsScanner';
// import { RemoteExtensionsScannerService } from 'vs/server/node/remoteExtensionsScanner';
// import { IRemoteAgentService } from 'vs/workbench/services/remote/common/remoteAgentService';
// import { RemoteAgentService } from 'vs/workbench/services/remote/browser/remoteAgentService';
// import { IExtensionManagementServerService, IWebExtensionsScannerService, IWorkbenchExtensionEnablementService } from 'vs/workbench/services/extensionManagement/common/extensionManagement';
// import { WebExtensionsScannerService } from 'vs/workbench/services/extensionManagement/browser/webExtensionsScannerService';
// import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
// import { ConfigurationService } from 'vs/platform/configuration/common/configurationService';
// import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
// import { StandaloneWorkspaceContextService } from 'vs/editor/standalone/browser/standaloneServices';
// import { IExtensionGalleryService, IExtensionManagementService, IGlobalExtensionEnablementService } from 'vs/platform/extensionManagement/common/extensionManagement';
// import { ExtensionManagementService } from 'vs/workbench/services/extensionManagement/common/extensionManagementService';
// import { IProductService } from 'vs/platform/product/common/productService';
// import product from 'vs/platform/product/common/product';
// import { IFileService } from 'vs/platform/files/common/files';
// import { FileService } from 'vs/platform/files/common/fileService';
// import { ExtensionEnablementService } from 'vs/workbench/services/extensionManagement/browser/extensionEnablementService';
// import { IHostService } from 'vs/workbench/services/host/browser/host';
// import { WorkbenchHostService } from 'vs/workbench/services/host/electron-sandbox/nativeHostService';
// import { IUserDataSyncEnablementService } from 'vs/platform/userDataSync/common/userDataSync';
// import { IUserDataSyncAccountService, UserDataSyncAccountService } from 'vs/platform/userDataSync/common/userDataSyncAccount';
// import { UserDataSyncEnablementService } from 'vs/workbench/services/userDataSync/browser/userDataSyncEnablementService';
// import { ExtensionManagementServerService } from 'vs/workbench/services/extensionManagement/common/extensionManagementServerService';
// import { GlobalExtensionEnablementService } from 'vs/platform/extensionManagement/common/extensionEnablementService';
// import { IDownloadService } from 'vs/platform/download/common/download';
// import { DownloadService } from 'vs/platform/download/common/downloadService';
// import { ExtensionGalleryService } from 'vs/platform/extensionManagement/common/extensionGalleryService';
// import { ISignService } from 'vs/platform/sign/common/sign';
// import { SignService } from 'vs/platform/sign/browser/signService';
// import { IRemoteSocketFactoryService, RemoteSocketFactoryService } from 'vs/platform/remote/common/remoteSocketFactoryService';


export function startup(configuration: IssueReporterWindowConfiguration) {
	const platformClass = isWindows ? 'windows' : isLinux ? 'linux' : 'mac';
	mainWindow.document.body.classList.add(platformClass); // used by our fonts

	safeInnerHtml(mainWindow.document.body, BaseHtml());

	const instantiationService = initServices(configuration.windowId);

	const issueReporter = instantiationService.createInstance(IssueReporter, configuration);
	issueReporter.render();
	mainWindow.document.body.style.display = 'block';
	issueReporter.setInitialFocus();
}

function initServices(windowId: number) {
	const services = new ServiceCollection();

	const contributedServices = getSingletonServiceDescriptors();
	for (const [id, descriptor] of contributedServices) {
		services.set(id, descriptor);
	}

	services.set(IMainProcessService, new SyncDescriptor(ElectronIPCMainProcessService, [windowId]));
	services.set(INativeHostService, new SyncDescriptor(NativeHostService, [windowId]));
	// services.set(IMenuService, new SyncDescriptor(MenuService, [windowId]));
	// services.set(IContextKeyService, new SyncDescriptor(ContextKeyService, [windowId]));
	// services.set(IStorageService, new SyncDescriptor(InMemoryStorageService, [windowId]));
	// services.set(ICommandService, new SyncDescriptor(CommandService, [windowId]));
	// services.set(ILogService, new SyncDescriptor(LogService, [windowId]));
	// services.set(IExtensionService, new SyncDescriptor(ExtensionService, [windowId]));
	// services.set(IDialogService, new SyncDescriptor(DialogService, [windowId]));
	// services.set(IWorkspaceTrustManagementService, new SyncDescriptor(WorkspaceTrustManagementService, [windowId]));
	// services.set(IUserDataProfileService, new SyncDescriptor(UserDataProfileService, [windowId]));
	// services.set(IUserDataInitializationService, new SyncDescriptor(UserDataInitializationService, [windowId]));
	// services.set(IRemoteAuthorityResolverService, new SyncDescriptor(RemoteAuthorityResolverService, [windowId]));
	// services.set(ILifecycleService, new SyncDescriptor(NativeLifecycleService, [windowId]));
	// services.set(IRemoteExtensionsScannerService, new SyncDescriptor(RemoteExtensionsScannerService, [windowId]));
	// services.set(IRemoteAgentService, new SyncDescriptor(RemoteAgentService, [windowId]));
	// services.set(IWebExtensionsScannerService, new SyncDescriptor(WebExtensionsScannerService, [windowId]));
	// services.set(IConfigurationService, new SyncDescriptor(ConfigurationService, [windowId]));
	// services.set(IWorkspaceContextService, new SyncDescriptor(StandaloneWorkspaceContextService, [windowId]));
	// services.set(IExtensionManagementService, new SyncDescriptor(ExtensionManagementService, [windowId]));
	// const productService = { _serviceBrand: undefined, ...product };
	// services.set(IProductService, productService);
	// services.set(IFileService, new SyncDescriptor(FileService, [windowId]));
	// services.set(IWorkbenchExtensionEnablementService, new SyncDescriptor(ExtensionEnablementService, [windowId]));
	// services.set(IHostService, new SyncDescriptor(WorkbenchHostService, [windowId])); // or WorkbenchNativeHostService
	// services.set(IUserDataSyncAccountService, new SyncDescriptor(UserDataSyncAccountService, [windowId]));
	// services.set(IUserDataSyncEnablementService, new SyncDescriptor(UserDataSyncEnablementService, [windowId]));
	// services.set(IExtensionManagementServerService, new SyncDescriptor(ExtensionManagementServerService, [windowId]));
	// services.set(IGlobalExtensionEnablementService, new SyncDescriptor(GlobalExtensionEnablementService, [windowId]));
	// services.set(IDownloadService, new SyncDescriptor(DownloadService, [windowId]));
	// services.set(IExtensionGalleryService, new SyncDescriptor(ExtensionGalleryService, [windowId]));
	// services.set(ISignService, new SyncDescriptor(SignService, [windowId]));
	// services.set(IRemoteSocketFactoryService, new SyncDescriptor(RemoteSocketFactoryService, [windowId]));


	return new InstantiationService(services, true);
}

registerMainProcessRemoteService(IIssueMainService, 'issue');
// registerMainProcessRemoteService(IMenuService, 'menu');
// registerMainProcessRemoteService(IContextKeyService, 'contextKey');
