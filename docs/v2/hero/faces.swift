// Зураг дээрх нүүрийг macOS Vision-оор олно (татах загваргүй).
// build_amjilt_faces.py дуудна: swiftc -O faces.swift -o <bin>; <bin> зураг1 зураг2 ...
// Гаралт JSON: [{p, w, h, f:[[x, y, w, h, итгэл], ...]}], x/y/w/h нь 0..1, эх нь зүүн дээд булан.
import Foundation
import ImageIO
import Vision

var out: [[String: Any]] = []
for p in CommandLine.arguments.dropFirst() {
  let url = URL(fileURLWithPath: p)
  guard let src = CGImageSourceCreateWithURL(url as CFURL, nil),
        let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else {
    out.append(["p": p, "err": "load"]); continue
  }
  let req = VNDetectFaceRectanglesRequest()
  do { try VNImageRequestHandler(cgImage: img, options: [:]).perform([req]) } catch {
    out.append(["p": p, "err": "\(error)"]); continue
  }
  let faces = (req.results ?? []).map { r -> [Double] in
    let b = r.boundingBox
    return [Double(b.minX), Double(1 - b.maxY), Double(b.width), Double(b.height), Double(r.confidence)]
  }
  out.append(["p": p, "w": img.width, "h": img.height, "f": faces])
}
FileHandle.standardOutput.write(try! JSONSerialization.data(withJSONObject: out))
