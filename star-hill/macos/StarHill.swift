import AppKit
import WebKit

// Janela nativa do editor local; dados e renderizador continuam no projeto.
final class StarHillApp: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate {
    private var window: NSWindow!
    private var webView: WKWebView!
    private var server: Process?
    private var serverLog: FileHandle?
    private var downloads: [ObjectIdentifier: WKDownload] = [:]
    private var failureVisible = false
    private let editorURL = URL(string: "http://127.0.0.1:8765/star-hill/")!
    private var project: URL {
        URL(fileURLWithPath: Bundle.main.object(forInfoDictionaryKey: "StarHillProjectRoot") as! String)
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        configureMenu()
        webView = WKWebView(frame: .zero)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1540, height: 1000),
                          styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "STAR HILL — Saint Seiya TCG"
        window.minSize = NSSize(width: 840, height: 620)
        window.contentView = webView
        window.setFrameAutosaveName("StarHillWindow")
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        webView.loadHTMLString("<html lang='pt-BR'><body style='font:18px system-ui;padding:48px'><h1>STAR HILL</h1><p>Abrindo o editor local…</p></body></html>", baseURL: nil)
        connect()
    }

    private func configureMenu() {
        let menu = NSMenu()
        let appItem = NSMenuItem()
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "Sobre o STAR HILL", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Ocultar STAR HILL", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        appMenu.addItem(withTitle: "Encerrar STAR HILL", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu
        menu.addItem(appItem)
        let editItem = NSMenuItem()
        let editMenu = NSMenu(title: "Editar")
        for (title, action, key) in [("Recortar", "cut:", "x"),
                                     ("Copiar", "copy:", "c"), ("Colar", "paste:", "v"), ("Selecionar tudo", "selectAll:", "a")] {
            editMenu.addItem(withTitle: title, action: Selector(action), keyEquivalent: key)
        }
        let undo = NSMenuItem(title: "Desfazer", action: #selector(undoDraft), keyEquivalent: "z")
        undo.target = self
        editMenu.insertItem(undo, at: 0)
        let redo = NSMenuItem(title: "Refazer", action: #selector(redoDraft), keyEquivalent: "z")
        redo.keyEquivalentModifierMask = [.command, .shift]
        redo.target = self
        editMenu.insertItem(redo, at: 1)
        editMenu.insertItem(.separator(), at: 2)
        editItem.submenu = editMenu
        menu.addItem(editItem)
        let viewItem = NSMenuItem()
        let viewMenu = NSMenu(title: "Visualizar")
        let reload = NSMenuItem(title: "Recarregar editor", action: #selector(reloadEditor), keyEquivalent: "r")
        reload.target = self
        viewMenu.addItem(reload)
        viewMenu.addItem(.separator())
        for (index, route) in [("Visão geral", "visao"), ("Card Forge", "cartas"), ("Editor de decks", "decks"),
                               ("Editor de HUD", "hud"), ("Editor de telas", "telas"), ("Interações e animações", "interacoes"),
                               ("Música e FX", "audio"), ("Livro de regras", "regras")].enumerated() {
            let item = NSMenuItem(title: route.0, action: #selector(openModule(_:)), keyEquivalent: String(index + 1))
            item.target = self
            item.representedObject = route.1
            viewMenu.addItem(item)
        }
        viewItem.submenu = viewMenu
        menu.addItem(viewItem)
        NSApp.mainMenu = menu
    }

    @objc private func undoDraft() { travelHistory("undo") }
    @objc private func redoDraft() { travelHistory("redo") }
    private func travelHistory(_ direction: String) {
        // O painel encaminha a operação ao histórico do editor ativo, incluindo Card Forge.
        let script = "window.starHillHistory?." + direction + "() ?? false"
        webView.evaluateJavaScript(script) { [weak self] value, error in
            if error != nil || (value as? Bool) != true {
                if direction == "undo" { self?.webView.undoManager?.undo() }
                else { self?.webView.undoManager?.redo() }
            }
        }
    }
    @objc private func openModule(_ item: NSMenuItem) {
        guard let route = item.representedObject as? String else { return }
        webView.evaluateJavaScript("location.hash='" + route + "'")
    }
    @objc private func reloadEditor() { webView.reload() }

    private func connect(attempt: Int = 0) {
        guard FileManager.default.fileExists(atPath: project.appendingPathComponent("card-forge/serve.py").path) else {
            showFailure("A pasta do projeto não está disponível no caminho usado na instalação. Abra o Google Drive e confira a pasta Saint Seiya TCG.")
            return
        }
        var request = URLRequest(url: editorURL)
        request.timeoutInterval = 1
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                guard let self = self else { return }
                if let response = response as? HTTPURLResponse {
                    guard response.statusCode == 200,
                          let data = data, String(decoding: data, as: UTF8.self).contains("<title>STAR HILL — Controle do jogo</title>") else {
                        self.showFailure("A porta 8765 está respondendo, mas não contém o STAR HILL esperado. Confira o servidor local.")
                        return
                    }
                    self.webView.load(URLRequest(url: self.editorURL))
                    return
                }
                if self.server == nil {
                    do { try self.startServer() }
                    catch { self.showFailure("Não foi possível iniciar o servidor: \(error.localizedDescription)"); return }
                }
                if attempt >= 40 || self.server?.isRunning == false {
                    self.showFailure("O servidor local não ficou disponível. Consulte ~/Library/Application Support/STAR HILL/server.log.")
                    return
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { self.connect(attempt: attempt + 1) }
            }
        }.resume()
    }

    private func startServer() throws {
        let logFolder = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("STAR HILL")
        try FileManager.default.createDirectory(at: logFolder, withIntermediateDirectories: true)
        let logURL = logFolder.appendingPathComponent("server.log")
        if !FileManager.default.fileExists(atPath: logURL.path) {
            FileManager.default.createFile(atPath: logURL.path, contents: nil)
        }
        let handle = try FileHandle(forWritingTo: logURL)
        try handle.seekToEnd()
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/python3")
        process.arguments = [project.appendingPathComponent("card-forge/serve.py").path]
        process.currentDirectoryURL = project
        process.environment = ProcessInfo.processInfo.environment.merging(["PORT": "8765", "PYTHONUNBUFFERED": "1", "PYTHONDONTWRITEBYTECODE": "1"]) { _, new in new }
        process.standardOutput = handle
        process.standardError = handle
        try process.run()
        serverLog = handle
        server = process
    }

    private func showFailure(_ message: String) {
        guard !failureVisible else { return }
        failureVisible = true
        let alert = NSAlert()
        alert.messageText = "Não foi possível abrir o STAR HILL"
        alert.informativeText = message
        alert.addButton(withTitle: "Tentar novamente")
        alert.addButton(withTitle: "Fechar")
        alert.beginSheetModal(for: window) { [weak self] response in
            guard let self = self else { return }
            self.failureVisible = false
            if response == .alertFirstButtonReturn {
                if self.server?.isRunning == true { self.server?.terminate() }
                self.server = nil
                self.connect()
            } else { NSApp.terminate(nil) }
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if navigationAction.shouldPerformDownload { decisionHandler(.download); return }
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        if url.absoluteString == "about:blank" || (url.scheme == "http" && ["127.0.0.1", "localhost"].contains(url.host ?? "") && url.port == 8765) {
            decisionHandler(.allow)
        } else {
            if ["https", "http"].contains(url.scheme ?? "") { NSWorkspace.shared.open(url) }
            decisionHandler(.cancel)
        }
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url, ["https", "http"].contains(url.scheme ?? "") {
            NSWorkspace.shared.open(url)
        }
        return nil
    }

    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        let panel = NSOpenPanel()
        panel.canChooseDirectories = false
        panel.canChooseFiles = true
        panel.allowsMultipleSelection = parameters.allowsMultipleSelection
        panel.beginSheetModal(for: window) { response in
            completionHandler(response == .OK ? panel.urls : nil)
        }
    }

    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
        downloads[ObjectIdentifier(download)] = download
        download.delegate = self
    }

    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse,
                  suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
        let panel = NSSavePanel()
        panel.nameFieldStringValue = suggestedFilename
        panel.directoryURL = FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask).first
        panel.beginSheetModal(for: window) { response in completionHandler(response == .OK ? panel.url : nil) }
    }

    func downloadDidFinish(_ download: WKDownload) { downloads.removeValue(forKey: ObjectIdentifier(download)) }
    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        downloads.removeValue(forKey: ObjectIdentifier(download))
        // Cancelar o painel de salvar é uma ação normal do usuário.
        if (error as NSError).code != NSURLErrorCancelled { NSAlert(error: error).beginSheetModal(for: window) }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
    func applicationWillTerminate(_ notification: Notification) {
        // Só encerra o processo que esta instância iniciou; um servidor já aberto é compartilhado.
        if server?.isRunning == true { server?.terminate() }
        try? serverLog?.close()
    }
}

let application = NSApplication.shared
let delegate = StarHillApp()
application.delegate = delegate
application.setActivationPolicy(.regular)
application.run()
