"""Номын бодит дүрслэл — Blender Cycles (path tracing).

Ажиллуулах:
  /Applications/Blender.app/Contents/MacOS/Blender -b -P book.py -- \
      --bg dark --mode still --samples 256 --res 1600 --out out/

  --mode still      нэг hero зураг (номыг 28° эргүүлсэн)
  --mode turntable  360° эргэлт, --frames ширхэг зураг (Apple-ийн scroll аргад)
"""
import argparse
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(HERE, "..", "mockup", "img")

# ---------------------------------------------------------------- аргумент
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument("--bg", choices=["dark", "light"], default="dark")
ap.add_argument("--mode", choices=["still", "turntable"], default="still")
ap.add_argument("--samples", type=int, default=256)
ap.add_argument("--res", type=int, default=1600, help="өргөн, px (харьцаа 4:5)")
ap.add_argument("--frames", type=int, default=72)
ap.add_argument("--angle", type=float, default=28.0, help="still горимын эргэлт, градус")
ap.add_argument("--out", default=os.path.join(HERE, "out"))
args = ap.parse_args(argv)
os.makedirs(args.out, exist_ok=True)

# ---------------------------------------------------------------- хэмжээ (метр)
# Хавтасны эх файл: урд 498 × 708 px, нуруу 56 px → B5 (17.6 × 25 см)
W, H = 0.176, 0.250
T = W * 56 / 498                # ≈ 1.98 см
CENTER = Vector((0, 0, H / 2))

# ---------------------------------------------------------------- хоосон тайз
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def hex_lin(h):
    """sRGB hex → шугаман өнгө (Blender материалд)."""
    h = h.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)


def node_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    return m, nt, out


def principled(nt, **inputs):
    p = nt.nodes.new("ShaderNodeBsdfPrincipled")
    for k, v in inputs.items():
        if k in p.inputs:
            p.inputs[k].default_value = v
    return p


# ---------------------------------------------------------------- материал
def laminate_mat(name, image, hinge_u=None):
    """Гялгар ламинаттай хавтас: зураг + coat давхарга + бага зэргийн төгс бус байдал."""
    m, nt, out = node_mat(name)
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(os.path.join(IMG, image))
    tex.interpolation = "Cubic"
    p = principled(nt, Roughness=0.42, **{"Coat Weight": 1.0, "Coat Roughness": 0.05, "Coat IOR": 1.5})
    nt.links.new(tex.outputs["Color"], p.inputs["Base Color"])
    # Ламинат дээрх бараг үл үзэгдэх хурууны ул мөр, тоос: coat-ын барзгар байдлыг бага зэрэг хувьсгана
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 220
    noise.inputs["Detail"].default_value = 6
    ramp = nt.nodes.new("ShaderNodeMapRange")
    ramp.inputs["To Min"].default_value = 0.03
    ramp.inputs["To Max"].default_value = 0.11
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Value"])
    nt.links.new(ramp.outputs["Result"], p.inputs["Coat Roughness"])
    if hinge_u is not None:
        # Зөөлөн хавтасны нугалаа: нурууны ойролцоох нарийн хонхор (bump)
        uv = nt.nodes.new("ShaderNodeTexCoord")
        sep = nt.nodes.new("ShaderNodeSeparateXYZ")
        nt.links.new(uv.outputs["UV"], sep.inputs["Vector"])
        dist = nt.nodes.new("ShaderNodeMath"); dist.operation = "SUBTRACT"; dist.inputs[1].default_value = hinge_u
        nt.links.new(sep.outputs["X"], dist.inputs[0])
        absn = nt.nodes.new("ShaderNodeMath"); absn.operation = "ABSOLUTE"
        nt.links.new(dist.outputs[0], absn.inputs[0])
        groove = nt.nodes.new("ShaderNodeMapRange")
        groove.inputs["From Min"].default_value = 0.0
        groove.inputs["From Max"].default_value = 0.006
        groove.inputs["To Min"].default_value = 0.0
        groove.inputs["To Max"].default_value = 1.0
        nt.links.new(absn.outputs[0], groove.inputs["Value"])
        bump = nt.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.35
        bump.inputs["Distance"].default_value = 0.0006
        nt.links.new(groove.outputs["Result"], bump.inputs["Height"])
        nt.links.new(bump.outputs["Normal"], p.inputs["Normal"])
        nt.links.new(bump.outputs["Normal"], p.inputs["Coat Normal"])
    nt.links.new(p.outputs["BSDF"], out.inputs["Surface"])
    return m


def paper_mat():
    """Хуудасны ирмэг: шаргалдуу офсет цаас, нарийн давхаргын зураас."""
    m, nt, out = node_mat("paper")
    coord = nt.nodes.new("ShaderNodeTexCoord")
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.wave_type = "BANDS"
    wave.bands_direction = "Y"           # хуудаснууд номын зузааны дагуу давхарлана
    wave.inputs["Scale"].default_value = 1400
    wave.inputs["Distortion"].default_value = 1.6
    wave.inputs["Detail"].default_value = 2
    nt.links.new(coord.outputs["Object"], wave.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = hex_lin("#E6D9BD")
    ramp.color_ramp.elements[1].color = hex_lin("#F7F0DF")
    ramp.color_ramp.elements[0].position = 0.25
    nt.links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
    p = principled(nt, Roughness=0.86, **{"Specular IOR Level": 0.25})
    nt.links.new(ramp.outputs["Color"], p.inputs["Base Color"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.15
    nt.links.new(wave.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], p.inputs["Normal"])
    nt.links.new(p.outputs["BSDF"], out.inputs["Surface"])
    return m


# ---------------------------------------------------------------- ном
def build_book():
    """Нэг цул биет: урд/ар/нуруу нь хавтас, бусад нь хуудас. Ирмэг 0.6 мм бөөрөнхий."""
    mesh = bpy.data.meshes.new("book")
    bm = bmesh.new()
    x0, x1, y0, y1, z0, z1 = -W / 2, W / 2, -T / 2, T / 2, 0.0, H
    v = {k: bm.verts.new(p) for k, p in {
        "a": (x0, y0, z0), "b": (x1, y0, z0), "c": (x1, y0, z1), "d": (x0, y0, z1),
        "e": (x0, y1, z0), "f": (x1, y1, z0), "g": (x1, y1, z1), "h": (x0, y1, z1)}.items()}
    uv_layer = bm.loops.layers.uv.new("UVMap")

    def face(keys, mat, uvfn):
        f = bm.faces.new([v[k] for k in keys])
        f.material_index = mat
        for loop in f.loops:
            loop[uv_layer].uv = uvfn(loop.vert.co)
        return f

    # урд (−Y, камер руу): баруун тийш +X
    face("abcd", 0, lambda co: ((co.x - x0) / W, co.z / H))
    # ар (+Y): ардаас харахад баруун тийш −X
    face("fehg", 1, lambda co: ((x1 - co.x) / W, co.z / H))
    # нуруу (−X): зүүнээс харахад баруун тийш −Y (урд хавтас)
    face("eadh", 2, lambda co: ((y1 - co.y) / T, co.z / H))
    # хуудас: баруун ирмэг, дээд, доод
    face("bfgc", 3, lambda co: (co.y, co.z))
    face("dcgh", 3, lambda co: (co.x, co.y))
    face("aefb", 3, lambda co: (co.x, co.y))
    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Book", mesh)
    scene.collection.objects.link(obj)
    hinge = 0.0085 / W                       # нугалаа нурууны ирмэгээс 8.5 мм
    for m in (laminate_mat("front", "100x100-front.jpg", hinge_u=hinge),
              laminate_mat("back", "100x100-back.jpg", hinge_u=1 - hinge),
              laminate_mat("spine", "100x100-spine.jpg"),
              paper_mat()):
        obj.data.materials.append(m)
    bev = obj.modifiers.new("bevel", "BEVEL")
    bev.width = 0.0006
    bev.segments = 3
    bev.limit_method = "ANGLE"
    bev.harden_normals = False
    for p in obj.data.polygons:
        p.use_smooth = False
    return obj


book = build_book()

# ---------------------------------------------------------------- студийн фон (нугалсан цаас)
def cyclorama(bg):
    mesh = bpy.data.meshes.new("cyc")
    bm = bmesh.new()
    prof = []                                   # (y, z): шалнаас хана руу зөөлөн нугалаа
    for i in range(0, 13):
        prof.append((-2.0 + i * 0.2, 0.0))
    r = 0.6
    for i in range(1, 17):
        a = i / 16 * (math.pi / 2)
        prof.append((0.4 + math.sin(a) * r, r - math.cos(a) * r))
    for i in range(1, 8):
        prof.append((1.0, 0.6 + i * 0.4))
    rows = []
    for x in (-4.0, 4.0):
        rows.append([bm.verts.new((x, y, z)) for y, z in prof])
    for i in range(len(prof) - 1):
        bm.faces.new((rows[0][i], rows[1][i], rows[1][i + 1], rows[0][i + 1]))
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new("Cyclorama", mesh)
    scene.collection.objects.link(obj)
    for p in obj.data.polygons:
        p.use_smooth = True
    m, nt, out = node_mat("cyc")
    if bg == "dark":
        # Бараан акрил: бага зэрэг ойдог, гялгар биш
        p = principled(nt, Roughness=0.38, **{"Base Color": hex_lin("#0D0C10"), "Specular IOR Level": 0.3})
    else:
        p = principled(nt, Roughness=0.9, **{"Base Color": hex_lin("#ECE8E1")})
    nt.links.new(p.outputs["BSDF"], out.inputs["Surface"])
    obj.data.materials.append(m)
    return obj


cyclorama(args.bg)

# ---------------------------------------------------------------- гэрэл
def aim(obj, target=CENTER):
    d = (target - obj.location)
    obj.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def area(name, size, size_y, power, loc, color=(1, 1, 1), target=CENTER):
    L = bpy.data.lights.new(name, "AREA")
    L.shape = "RECTANGLE"
    L.size, L.size_y = size, size_y
    L.energy = power
    L.color = color
    o = bpy.data.objects.new(name, L)
    o.location = Vector(loc)
    scene.collection.objects.link(o)
    aim(o, target)
    return o


def card(name, w, h, loc, strength, gradient=True, black=False, target=CENTER):
    """Тусгалын карт: камерт харагдахгүй, зөвхөн гялгар гадаргуу дээр тусна.
    Градиент нь нэг ирмэгээрээ хурц (хар хаалт), нөгөө тал руугаа уусна."""
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = (w, h, 1)
    aim(o, target)
    m, nt, out = node_mat(name)
    if black:
        sh = principled(nt, Roughness=1.0, **{"Base Color": (0, 0, 0, 1)})
        nt.links.new(sh.outputs["BSDF"], out.inputs["Surface"])
    else:
        em = nt.nodes.new("ShaderNodeEmission")
        em.inputs["Strength"].default_value = strength
        if gradient:
            tc = nt.nodes.new("ShaderNodeTexCoord")
            gr = nt.nodes.new("ShaderNodeTexGradient")
            rp = nt.nodes.new("ShaderNodeValToRGB")
            rp.color_ramp.elements[0].position = 0.0
            rp.color_ramp.elements[0].color = (1, 1, 1, 1)
            rp.color_ramp.elements[1].position = 1.0
            rp.color_ramp.elements[1].color = (0, 0, 0, 1)
            nt.links.new(tc.outputs["UV"], gr.inputs["Vector"])
            nt.links.new(gr.outputs["Fac"], rp.inputs["Fac"])
            nt.links.new(rp.outputs["Color"], em.inputs["Color"])
        nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    o.data.materials.append(m)
    o.visible_camera = False
    o.visible_diffuse = black            # хар хаалт гэрлийг хаана, карт нь зөвхөн тусгалд
    o.visible_shadow = black
    return o


# Сонгодог гурван цэгийн гэрэл (дээрээс харвал): түлхүүр баруун урд 45°, дүүргэгч зүүн урд, арын гэрэл ар дээрээс
area("Key", 0.7, 1.3, 42 if args.bg == "dark" else 38, (0.95, -0.95, 0.55), color=(1.0, 0.97, 0.93))
area("Fill", 0.6, 1.0, 9 if args.bg == "dark" else 14, (-1.05, -0.8, 0.40), color=(0.95, 0.97, 1.0))
area("Hair", 0.9, 0.25, 55, (-0.1, 0.75, 0.85))
area("Top", 1.1, 1.1, 7 if args.bg == "dark" else 18, (0.0, -0.2, 1.25))
# Гялгар хавтсан дээрх градиент тусгал + хар хаалт (мэргэжлийн бүтээгдэхүүний зургийн арга)
card("GradCard", 0.45, 0.9, (0.75, -0.75, 0.35), 1.6)
card("Flag", 0.12, 0.95, (0.52, -0.86, 0.36), 0, black=True)

world = bpy.data.worlds.new("World")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.004, 0.005, 1) if args.bg == "dark" else (0.05, 0.05, 0.05, 1)
scene.world = world

# ---------------------------------------------------------------- камер (85 мм, бүтээгдэхүүний линз)
cam_data = bpy.data.cameras.new("Cam")
cam_data.lens = 85
cam_data.sensor_fit = "VERTICAL"
cam_data.sensor_height = 36
cam_data.dof.use_dof = True
cam_data.dof.aperture_fstop = 5.6
cam = bpy.data.objects.new("Cam", cam_data)
scene.collection.objects.link(cam)
dist, tilt = 1.02, math.radians(7)
cam.location = Vector((0, -dist * math.cos(tilt), H / 2 + dist * math.sin(tilt)))
aim(cam, CENTER + Vector((0, 0, -0.004)))
cam_data.dof.focus_distance = (cam.location - CENTER).length - T / 2
scene.camera = cam

# ---------------------------------------------------------------- рендер тохиргоо
scene.render.engine = "CYCLES"
prefs = bpy.context.preferences.addons["cycles"].preferences
try:
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for d in prefs.devices:
        d.use = True
    scene.cycles.device = "GPU"
except Exception as e:  # GPU байхгүй бол CPU
    print("GPU fallback:", e)
scene.cycles.samples = args.samples
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 8
scene.render.resolution_x = args.res
scene.render.resolution_y = int(args.res * 5 / 4)
scene.render.resolution_percentage = 100
scene.render.film_transparent = False
scene.view_settings.view_transform = "AgX"
for look in ("AgX - Medium High Contrast", "Medium High Contrast"):
    try:
        scene.view_settings.look = look
        break
    except TypeError:
        pass
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGB"

# ---------------------------------------------------------------- гаралт
if args.mode == "still":
    book.rotation_euler = (0, 0, math.radians(args.angle))
    scene.render.filepath = os.path.join(args.out, f"still-{args.bg}.png")
    bpy.ops.render.render(write_still=True)
else:
    # Keyframe ашиглахгүй — эргэлт бүрийг шууд тавьж нэг нэгээр нь рендерлэнэ
    for i in range(args.frames):
        book.rotation_euler = (0, 0, math.radians(360 * i / args.frames))
        scene.render.filepath = os.path.join(args.out, f"turn-{args.bg}-{i:03d}.png")
        bpy.ops.render.render(write_still=True)
print("DONE", args.out)
