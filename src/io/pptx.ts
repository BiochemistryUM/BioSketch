// PowerPoint export: one slide holding the figure as a picture. The picture is stored twice, as
// SVG (sharp at any size in PowerPoint 2016 and later) and as PNG (what older PowerPoint, Keynote
// and Google Slides show). A .pptx file is a ZIP archive of XML parts; both are written here by
// hand, so no library has to be shipped for it.

export interface ZipEntry {
  name: string
  data: Uint8Array
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

/** The checksum ZIP archives store for every file. */
export function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const encoder = new TextEncoder()
export const utf8 = (text: string): Uint8Array => encoder.encode(text)

/** A ZIP archive of the given files, stored without compression (pictures are compressed already). */
export function zipStore(entries: ZipEntry[]): Uint8Array {
  const chunks: Uint8Array[] = []
  const directory: Uint8Array[] = []
  let offset = 0
  // 1 January 1980, the earliest date the format can state; the archive has no use for a real one.
  const DOS_DATE = 0x0021
  for (const entry of entries) {
    const name = utf8(entry.name)
    const crc = crc32(entry.data)
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true) // version needed
    local.setUint16(6, 0x0800, true) // names are UTF-8
    local.setUint16(8, 0, true) // stored
    local.setUint16(10, 0, true)
    local.setUint16(12, DOS_DATE, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, entry.data.length, true)
    local.setUint32(22, entry.data.length, true)
    local.setUint16(26, name.length, true)
    local.setUint16(28, 0, true)
    chunks.push(new Uint8Array(local.buffer), name, entry.data)

    const central = new DataView(new ArrayBuffer(46))
    central.setUint32(0, 0x02014b50, true)
    central.setUint16(4, 20, true) // version made by
    central.setUint16(6, 20, true) // version needed
    central.setUint16(8, 0x0800, true)
    central.setUint16(10, 0, true)
    central.setUint16(12, 0, true)
    central.setUint16(14, DOS_DATE, true)
    central.setUint32(16, crc, true)
    central.setUint32(20, entry.data.length, true)
    central.setUint32(24, entry.data.length, true)
    central.setUint16(28, name.length, true)
    central.setUint32(42, offset, true)
    directory.push(new Uint8Array(central.buffer), name)
    offset += 30 + name.length + entry.data.length
  }
  const directorySize = directory.reduce((n, c) => n + c.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, entries.length, true)
  end.setUint16(10, entries.length, true)
  end.setUint32(12, directorySize, true)
  end.setUint32(16, offset, true)
  const all = [...chunks, ...directory, new Uint8Array(end.buffer)]
  const out = new Uint8Array(all.reduce((n, c) => n + c.length, 0))
  let at = 0
  for (const c of all) {
    out.set(c, at)
    at += c.length
  }
  return out
}

// ---------- the presentation ----------

/** A 16:9 slide, 13.333 × 7.5 inches, in the unit PowerPoint counts in (914,400 to the inch). */
export const SLIDE = { w: 12192000, h: 6858000 }

/** Where a picture of the given proportions sits on the slide: as large as fits inside a margin, centred. */
export function fitOnSlide(width: number, height: number, margin = 0.05): { x: number; y: number; w: number; h: number } {
  const roomW = SLIDE.w * (1 - 2 * margin)
  const roomH = SLIDE.h * (1 - 2 * margin)
  const k = Math.min(roomW / width, roomH / height)
  const w = Math.round(width * k)
  const h = Math.round(height * k)
  return { x: Math.round((SLIDE.w - w) / 2), y: Math.round((SLIDE.h - h) / 2), w, h }
}

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"'
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const PML = 'application/vnd.openxmlformats-officedocument.presentationml'
const escapeXml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const rels = (items: [id: string, type: string, target: string][]): string =>
  `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items
    .map(([id, type, target]) => `<Relationship Id="${id}" Type="${REL}/${type}" Target="${target}"/>`)
    .join('')}</Relationships>`

// Every slide, layout and master starts with this empty group that holds its shapes.
const TREE_START =
  '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'

const fill = (colour: string): string => `<a:solidFill><a:schemeClr val="${colour}"/></a:solidFill>`
const line = (width: number): string => `<a:ln w="${width}" cap="flat" cmpd="sng" algn="ctr">${fill('phClr')}<a:prstDash val="solid"/></a:ln>`
const colour = (name: string, hex: string): string => `<a:${name}><a:srgbClr val="${hex}"/></a:${name}>`
const font = (kind: string): string => `<a:${kind}Font><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:${kind}Font>`

// PowerPoint refuses a file without a theme, even when nothing on the slide uses it.
const THEME =
  `${XML}<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="BioSketch"><a:themeElements>` +
  `<a:clrScheme name="BioSketch"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>` +
  colour('dk2', '2B2F36') + colour('lt2', 'EEF1F4') + colour('accent1', '1C7462') + colour('accent2', '2F6FB5') + colour('accent3', 'C98F12') +
  colour('accent4', 'C2410C') + colour('accent5', '7A5AB5') + colour('accent6', '5F6C7B') + colour('hlink', '2F6FB5') + colour('folHlink', '7A5AB5') +
  `</a:clrScheme><a:fontScheme name="BioSketch">${font('major')}${font('minor')}</a:fontScheme>` +
  `<a:fmtScheme name="BioSketch"><a:fillStyleLst>${fill('phClr').repeat(3)}</a:fillStyleLst><a:lnStyleLst>${line(6350)}${line(12700)}${line(19050)}</a:lnStyleLst>` +
  `<a:effectStyleLst>${'<a:effectStyle><a:effectLst/></a:effectStyle>'.repeat(3)}</a:effectStyleLst><a:bgFillStyleLst>${fill('phClr').repeat(3)}</a:bgFillStyleLst></a:fmtScheme>` +
  `</a:themeElements></a:theme>`

export interface PptxPicture {
  /** Name of the figure; becomes the picture's description (alternative text). */
  title: string
  /** Size of the figure in its own units; only the proportions matter. */
  width: number
  height: number
  png: Uint8Array
  svg: string
}

/** The files of a one-slide presentation showing the picture. */
export function pptxParts(pic: PptxPicture): ZipEntry[] {
  const at = fitOnSlide(pic.width, pic.height)
  const slide =
    `${XML}<p:sld ${NS}><p:cSld><p:spTree>${TREE_START}` +
    `<p:pic><p:nvPicPr><p:cNvPr id="2" name="Figure" descr="${escapeXml(pic.title)}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>` +
    // The PNG is the picture every program understands; the extension points newer PowerPoint to the SVG.
    `<p:blipFill><a:blip r:embed="rId2"><a:extLst><a:ext uri="{96DAC541-7B7A-43D3-8B79-37D633B846F1}">` +
    `<asvg:svgBlip xmlns:asvg="http://schemas.microsoft.com/office/drawing/2016/SVG/main" r:embed="rId3"/></a:ext></a:extLst></a:blip><a:stretch><a:fillRect/></a:stretch></p:blipFill>` +
    `<p:spPr><a:xfrm><a:off x="${at.x}" y="${at.y}"/><a:ext cx="${at.w}" cy="${at.h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>` +
    `</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`
  const master =
    `${XML}<p:sldMaster ${NS}><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:spTree>${TREE_START}</p:spTree></p:cSld>` +
    `<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>` +
    `<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>`
  const layout = `${XML}<p:sldLayout ${NS} type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>${TREE_START}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`
  const presentation =
    `${XML}<p:presentation ${NS}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst>` +
    `<p:sldSz cx="${SLIDE.w}" cy="${SLIDE.h}"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`
  const types =
    `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>` +
    `<Default Extension="png" ContentType="image/png"/><Default Extension="svg" ContentType="image/svg+xml"/>` +
    `<Override PartName="/ppt/presentation.xml" ContentType="${PML}.presentation.main+xml"/>` +
    `<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="${PML}.slideMaster+xml"/>` +
    `<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="${PML}.slideLayout+xml"/>` +
    `<Override PartName="/ppt/slides/slide1.xml" ContentType="${PML}.slide+xml"/>` +
    `<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/></Types>`
  const text = (name: string, content: string): ZipEntry => ({ name, data: utf8(content) })
  return [
    text('[Content_Types].xml', types),
    text('_rels/.rels', rels([['rId1', 'officeDocument', 'ppt/presentation.xml']])),
    text('ppt/presentation.xml', presentation),
    text('ppt/_rels/presentation.xml.rels', rels([['rId1', 'slideMaster', 'slideMasters/slideMaster1.xml'], ['rId2', 'slide', 'slides/slide1.xml'], ['rId3', 'theme', 'theme/theme1.xml']])),
    text('ppt/slideMasters/slideMaster1.xml', master),
    text('ppt/slideMasters/_rels/slideMaster1.xml.rels', rels([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'], ['rId2', 'theme', '../theme/theme1.xml']])),
    text('ppt/slideLayouts/slideLayout1.xml', layout),
    text('ppt/slideLayouts/_rels/slideLayout1.xml.rels', rels([['rId1', 'slideMaster', '../slideMasters/slideMaster1.xml']])),
    text('ppt/theme/theme1.xml', THEME),
    text('ppt/slides/slide1.xml', slide),
    text('ppt/slides/_rels/slide1.xml.rels', rels([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'], ['rId2', 'image', '../media/image1.png'], ['rId3', 'image', '../media/image2.svg']])),
    { name: 'ppt/media/image1.png', data: pic.png },
    text('ppt/media/image2.svg', pic.svg),
  ]
}

/** The finished .pptx file. */
export function buildPptx(pic: PptxPicture): Uint8Array {
  return zipStore(pptxParts(pic))
}
