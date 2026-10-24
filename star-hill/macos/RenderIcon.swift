import AppKit

// Símbolo próprio do painel: estrela dourada e órbitas sobre o céu do Santuário.
let size = NSSize(width: 1024, height: 1024)
let image = NSImage(size: size)
image.lockFocus()
let bounds = NSRect(origin: .zero, size: size)
let background = NSBezierPath(roundedRect: bounds.insetBy(dx: 28, dy: 28), xRadius: 210, yRadius: 210)
NSGradient(starting: NSColor(srgbRed: 0.12, green: 0.18, blue: 0.28, alpha: 1),
           ending: NSColor(srgbRed: 0.035, green: 0.05, blue: 0.09, alpha: 1))!.draw(in: background, angle: -55)
let gold = NSColor(srgbRed: 0.86, green: 0.72, blue: 0.38, alpha: 1)
gold.withAlphaComponent(0.55).setStroke()
for radius in [340.0, 365.0] {
    let orbit = NSBezierPath(ovalIn: NSRect(x: 512 - radius, y: 512 - radius, width: radius * 2, height: radius * 2))
    orbit.lineWidth = radius == 340 ? 5 : 2
    orbit.stroke()
}
let star = NSBezierPath()
for i in 0..<8 {
    let angle = Double(i) * .pi / 4 + .pi / 2
    let radius = i % 2 == 0 ? 280.0 : 83.0
    let point = NSPoint(x: 512 + cos(angle) * radius, y: 512 + sin(angle) * radius)
    if i == 0 { star.move(to: point) } else { star.line(to: point) }
}
star.close()
NSGradient(starting: NSColor(srgbRed: 1, green: 0.91, blue: 0.66, alpha: 1), ending: gold)!.draw(in: star, angle: -70)
NSColor(srgbRed: 0.15, green: 0.19, blue: 0.27, alpha: 1).setFill()
NSBezierPath(ovalIn: NSRect(x: 493, y: 493, width: 38, height: 38)).fill()
gold.setFill()
for point in [NSPoint(x: 256, y: 768), NSPoint(x: 768, y: 256)] {
    NSBezierPath(ovalIn: NSRect(x: point.x - 15, y: point.y - 15, width: 30, height: 30)).fill()
}
image.unlockFocus()
let bitmap = NSBitmapImageRep(data: image.tiffRepresentation!)!
try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
