/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RunOnceScheduler, createCancelablePromise } from 'vs/base/common/async';
import { Disposable } from 'vs/base/common/lifecycle';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { registerEditorContribution } from 'vs/editor/browser/editorExtensions';
import { IEditorContribution } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';
import { DocumentRangeSemanticTokensProviderRegistry, DocumentRangeSemanticTokensProvider } from 'vs/editor/common/modes';
import { IModelService } from 'vs/editor/common/services/modelService';
import { toMultilineTokens2 } from 'vs/editor/common/services/semanticTokensProviderStyling';

class ViewportSemanticTokensContribution extends Disposable implements IEditorContribution {

	public static readonly ID = 'editor.contrib.viewportSemanticTokens';

	public static get(editor: ICodeEditor): ViewportSemanticTokensContribution {
		return editor.getContribution<ViewportSemanticTokensContribution>(ViewportSemanticTokensContribution.ID);
	}

	private readonly _editor: ICodeEditor;
	private readonly _tokenizeViewport: RunOnceScheduler;

	constructor(
		editor: ICodeEditor,
		@IModelService private readonly _modelService: IModelService
	) {
		super();
		this._editor = editor;
		this._tokenizeViewport = new RunOnceScheduler(() => this._tokenizeViewportNow(), 100);
		this._register(this._editor.onDidScrollChange(() => {
			this._tokenizeViewport.schedule();
		}));
		this._register(this._editor.onDidChangeModel(() => {
			this._tokenizeViewport.schedule();
		}));
		this._register(DocumentRangeSemanticTokensProviderRegistry.onDidChange(() => {
			this._tokenizeViewport.schedule();
		}));
	}

	private static _getSemanticColoringProvider(model: ITextModel): DocumentRangeSemanticTokensProvider | null {
		const result = DocumentRangeSemanticTokensProviderRegistry.ordered(model);
		return (result.length > 0 ? result[0] : null);
	}

	private _tokenizeViewportNow(): void {
		if (!this._editor.hasModel()) {
			return;
		}
		const model = this._editor.getModel();
		if (model.hasSemanticTokens()) {
			return;
		}
		const provider = ViewportSemanticTokensContribution._getSemanticColoringProvider(model);
		if (!provider) {
			return;
		}
		const styling = this._modelService.getSemanticTokensProviderStyling(provider);
		const visibleRanges = this._editor.getVisibleRanges();
		const request = createCancelablePromise(token => Promise.resolve(provider.provideDocumentRangeSemanticTokens(model, visibleRanges[0], token)));
		request.then((r) => {
			if (!r || model.isDisposed()) {
				return;
			}
			const tokens = toMultilineTokens2(r, styling);
			model.setPartialSemanticTokens(tokens);
		});
	}
}

registerEditorContribution(ViewportSemanticTokensContribution.ID, ViewportSemanticTokensContribution);
