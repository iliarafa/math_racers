import AppKit
import Foundation

// Compose an App Store screenshot "card": caption + framed device screenshot
// on a branded canvas, written as a PNG at an exact App Store canvas size.
//
// usage: MakeCard <canvasW> <canvasH> <shot.png> <title> <subtitle> <cornerRatio> <out.png>

let a = CommandLine.arguments
guard a.count == 8 else {
    FileHandle.standardError.write("usage: MakeCard W H shot title subtitle cornerRatio out\n".data(using: .utf8)!)
    exit(2)
}
let W = CGFloat(Double(a[1])!)
let H = CGFloat(Double(a[2])!)
let shotPath = a[3]
let title = a[4]
let subtitle = a[5]
let cornerRatio = CGFloat(Double(a[6])!)
let outPath = a[7]

guard let shot = NSImage(contentsOfFile: shotPath) else {
    FileHandle.standardError.write("cannot read \(shotPath)\n".data(using: .utf8)!)
    exit(1)
}
// Pixel dimensions, not point size — screenshots are @2x/@3x.
let shotRep = shot.representations.first!
let shotW = CGFloat(shotRep.pixelsWide)
let shotH = CGFloat(shotRep.pixelsHigh)

func font(_ names: [String], _ size: CGFloat, fallbackWeight: NSFont.Weight) -> NSFont {
    for n in names { if let f = NSFont(name: n, size: size) { return f } }
    return NSFont.systemFont(ofSize: size, weight: fallbackWeight)
}
// Type and accents scale off the short side so a landscape canvas gets the same
// caption size as its portrait sibling instead of a caption sized to the long edge.
let base = min(W, H)
let titleFont = font(["Oxanium-Bold", "Oxanium-SemiBold", "Oxanium-Regular", "Oxanium"], base * 0.058, fallbackWeight: .heavy)
let subFont = font(["Oxanium-Regular", "Oxanium"], base * 0.0285, fallbackWeight: .regular)

let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(W), pixelsHigh: Int(H),
                           bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                           colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
let ctx = NSGraphicsContext.current!.cgContext

// ---- background: deep charcoal gradient with a red accent glow top-right
let bg = NSGradient(colors: [
    NSColor(srgbRed: 0.086, green: 0.094, blue: 0.110, alpha: 1),
    NSColor(srgbRed: 0.027, green: 0.031, blue: 0.043, alpha: 1),
])!
bg.draw(in: NSRect(x: 0, y: 0, width: W, height: H), angle: -90)

// Radial glow drawn in a square so the fade completes on the inscribed circle —
// a non-square rect truncates it mid-fade and leaves a visible hard edge.
ctx.saveGState()
let glow = NSGradient(colors: [
    NSColor(srgbRed: 0.85, green: 0.05, blue: 0.10, alpha: 0.26),
    NSColor(srgbRed: 0.85, green: 0.05, blue: 0.10, alpha: 0.0),
])!
let glowR = W * 0.95
let glowC = NSPoint(x: W * 0.78, y: H * 0.90)
glow.draw(in: NSRect(x: glowC.x - glowR, y: glowC.y - glowR, width: glowR * 2, height: glowR * 2),
          relativeCenterPosition: .zero)
ctx.restoreGState()

// ---- caption block
let margin = W * 0.075
let textW = W - margin * 2

let titlePara = NSMutableParagraphStyle()
titlePara.alignment = .center
titlePara.lineHeightMultiple = 1.06
let titleAttrs: [NSAttributedString.Key: Any] = [
    .font: titleFont,
    .foregroundColor: NSColor.white,
    .kern: base * 0.0022,
    .paragraphStyle: titlePara,
]
let titleStr = NSAttributedString(string: title.uppercased(), attributes: titleAttrs)
let titleBox = titleStr.boundingRect(with: NSSize(width: textW, height: .greatestFiniteMagnitude),
                                     options: [.usesLineFragmentOrigin, .usesFontLeading])
let titleTopInset = H * 0.050
let titleH = ceil(titleBox.height)
titleStr.draw(with: NSRect(x: margin, y: H - titleTopInset - titleH, width: textW, height: titleH),
              options: [.usesLineFragmentOrigin, .usesFontLeading])

// red accent bar under the title
let barW = base * 0.115
let barH = max(4, base * 0.0055)
let barY = H - titleTopInset - titleH - H * 0.019
NSColor(srgbRed: 0.90, green: 0.06, blue: 0.12, alpha: 1).setFill()
NSBezierPath(roundedRect: NSRect(x: (W - barW) / 2, y: barY, width: barW, height: barH),
             xRadius: barH / 2, yRadius: barH / 2).fill()

// subtitle
var contentTopFromTop = titleTopInset + titleH + H * 0.019 + barH
if !subtitle.isEmpty {
    let subPara = NSMutableParagraphStyle()
    subPara.alignment = .center
    subPara.lineHeightMultiple = 1.12
    let subAttrs: [NSAttributedString.Key: Any] = [
        .font: subFont,
        .foregroundColor: NSColor(srgbRed: 0.72, green: 0.74, blue: 0.78, alpha: 1),
        .kern: base * 0.0009,
        .paragraphStyle: subPara,
    ]
    let subStr = NSAttributedString(string: subtitle, attributes: subAttrs)
    let subBox = subStr.boundingRect(with: NSSize(width: textW, height: .greatestFiniteMagnitude),
                                     options: [.usesLineFragmentOrigin, .usesFontLeading])
    let subH = ceil(subBox.height)
    let subTop = contentTopFromTop + H * 0.022
    subStr.draw(with: NSRect(x: margin, y: H - subTop - subH, width: textW, height: subH),
                options: [.usesLineFragmentOrigin, .usesFontLeading])
    contentTopFromTop = subTop + subH
}

// ---- device screenshot, fitted below the caption
let gap = H * 0.038
let bottomInset = H * 0.042
let availTop = contentTopFromTop + gap
let availH = H - availTop - bottomInset
let availW = W * 0.80
let scale = min(availW / shotW, availH / shotH)
let drawW = floor(shotW * scale)
let drawH = floor(shotH * scale)
let drawX = floor((W - drawW) / 2)
let drawY = floor(H - availTop - availH + (availH - drawH) / 2)
let frame = NSRect(x: drawX, y: drawY, width: drawW, height: drawH)
let radius = drawW * cornerRatio

// drop shadow
ctx.saveGState()
let shadow = NSShadow()
shadow.shadowColor = NSColor.black.withAlphaComponent(0.65)
shadow.shadowBlurRadius = W * 0.030
shadow.shadowOffset = NSSize(width: 0, height: -W * 0.010)
shadow.set()
NSColor.black.setFill()
NSBezierPath(roundedRect: frame, xRadius: radius, yRadius: radius).fill()
ctx.restoreGState()

// clipped screenshot
ctx.saveGState()
let clip = NSBezierPath(roundedRect: frame, xRadius: radius, yRadius: radius)
clip.addClip()
shot.draw(in: frame, from: NSRect(x: 0, y: 0, width: shotW, height: shotH),
          operation: .sourceOver, fraction: 1.0)
ctx.restoreGState()

// hairline bezel
NSColor.white.withAlphaComponent(0.22).setStroke()
let bezel = NSBezierPath(roundedRect: frame.insetBy(dx: 1, dy: 1), xRadius: radius, yRadius: radius)
bezel.lineWidth = max(2, W * 0.0022)
bezel.stroke()

NSGraphicsContext.restoreGraphicsState()

guard let png = rep.representation(using: .png, properties: [:]) else { exit(1) }
try! png.write(to: URL(fileURLWithPath: outPath))
print("wrote \(outPath)")
