import * as vscode from 'vscode'
import { Kernel } from './kernel'
import { parseMarkdown, writeCellsToMarkdown, RawNotebookCell } from './markdownParser'

const kernel = new Kernel()

export function activate(context: vscode.ExtensionContext) {
	const controller = vscode.notebooks.createNotebookController('go-kernel', 'gobook', 'Go Kernel')
	controller.supportedLanguages = ['go']
	controller.executeHandler = (cells, doc, ctrl) => kernel.executeCells(doc, cells, ctrl)
	controller.interruptHandler = doc => kernel.interrupt(doc)

	context.subscriptions.push(vscode.commands.registerCommand('gobook.kernel.restart', () => {
		kernel.kill('SIGTERM')
	}))

	context.subscriptions.push(vscode.commands.registerCommand('goNotebookKernel.kernel.rebuild', async () => {
		await Kernel.install(false)
	}))

	context.subscriptions.push(vscode.commands.registerCommand('gobook.kernel.stopSession', async () => {
		const uri = vscode.window.activeTextEditor?.document?.uri
		if (uri) kernel.stopSession(uri)
	}))

	const notebookSettings = {
		transientOutputs: false,
		transientCellMetadata: {
			inputCollapsed: true,
			outputCollapsed: true,
		}
	}

	context.subscriptions.push(vscode.workspace.registerNotebookSerializer('gobook', new MarkdownProvider(), notebookSettings))
}

export function deactivate() {
	kernel.kill('SIGKILL')
}

class MarkdownProvider implements vscode.NotebookSerializer {
	deserializeNotebook(data: Uint8Array, _token: vscode.CancellationToken): vscode.NotebookData | Thenable<vscode.NotebookData> {
		const content = Buffer.from(data)
			.toString('utf8')

		const cellRawData = parseMarkdown(content)
		const cells = cellRawData.map(rawToNotebookCellData)

		return {
			cells
		}
	}

	serializeNotebook(data: vscode.NotebookData, _token: vscode.CancellationToken): Uint8Array | Thenable<Uint8Array> {
		const stringOutput = writeCellsToMarkdown(data.cells)
		return Buffer.from(stringOutput)
	}
}

export function rawToNotebookCellData(data: RawNotebookCell): vscode.NotebookCellData {
	return <vscode.NotebookCellData>{
		kind: data.kind,
		languageId: data.language,
		metadata: { leadingWhitespace: data.leadingWhitespace, trailingWhitespace: data.trailingWhitespace, indentation: data.indentation },
		// outputs: data.outputs,
		outputs: data.outputs || [],
		value: data.content,
	}
}

const ALL_LANGUAGES = [
	'go',
	'output',
	'markdown',
	'plaintext',
	'javascript',
	'typescript',
	'css',
	'html',
	'xml',
	'json',
	'sql',
	'makefile',
	'dockerfile',
]