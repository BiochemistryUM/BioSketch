import { describe, expect, it } from 'vitest'
import { validateDoc } from '../src/io/files'
import { gpmlColor, headKind, pathwaySummary, readGpml, shapeFor } from '../src/io/gpml'
import { addFigure, contentRect, emptyDoc, selectionRect } from '../src/model/doc'
import { resolveConnector } from '../src/model/nodes'
import type { ConnectorNode, FigNode, ShapeNode, TextNode } from '../src/model/types'
// A pathway as WikiPathways publishes it (public domain), fetched in November 2026.
import wp554 from './fixtures/WP554.gpml?raw'

const pathway = (body: string, format = 'http://pathvisio.org/GPML/2013a'): string =>
  `<?xml version="1.0" encoding="UTF-8"?>
<Pathway xmlns="${format}" Name="Test pathway" Organism="Homo sapiens">
  <Graphics BoardWidth="500" BoardHeight="400" />
  ${body}
  <InfoBox CenterX="0" CenterY="0" />
</Pathway>`

const SMALL = pathway(`
  <DataNode TextLabel="EGFR" GraphId="a1" Type="GeneProduct" GroupRef="g1">
    <Graphics CenterX="100" CenterY="100" Width="60" Height="20" ZOrder="32768" FontSize="10" Valign="Middle" />
  </DataNode>
  <DataNode TextLabel="GRB2" GraphId="a2" Type="Protein" GroupRef="g1">
    <Graphics CenterX="100" CenterY="124" Width="60" Height="20" ZOrder="32768" FontSize="10" />
  </DataNode>
  <DataNode TextLabel="ATP" GraphId="a3" Type="Metabolite">
    <Graphics CenterX="300" CenterY="100" Width="60" Height="20" ZOrder="32768" FontSize="10" Color="0000ff" />
  </DataNode>
  <DataNode TextLabel="TP53" GraphId="a4" Type="GeneProduct">
    <Graphics CenterX="300" CenterY="250" Width="60" Height="20" ZOrder="32768" FontSize="10" FillColor="ffff00" Color="ff0000" />
  </DataNode>
  <State GraphRef="a4" TextLabel="P" GraphId="s1">
    <Graphics RelX="1.0" RelY="-1.0" Width="15" Height="15" ShapeType="Oval" />
  </State>
  <Interaction GraphId="i1">
    <Graphics ZOrder="12288" LineThickness="1.0">
      <Point X="130" Y="100" GraphRef="a1" RelX="1.0" RelY="0.0" />
      <Point X="270" Y="100" GraphRef="a3" RelX="-1.0" RelY="0.0" ArrowHead="Arrow" />
      <Anchor Position="0.5" Shape="None" GraphId="an1" />
    </Graphics>
  </Interaction>
  <Interaction GraphId="i2">
    <Graphics ZOrder="12288" LineStyle="Broken" Color="ff0000">
      <Point X="300" Y="110" GraphRef="a3" RelX="0.0" RelY="1.0" ArrowHead="TBar" />
      <Point X="300" Y="240" GraphRef="a4" RelX="0.0" RelY="-1.0" />
    </Graphics>
  </Interaction>
  <Interaction GraphId="i3">
    <Graphics ZOrder="12288">
      <Point X="200" Y="200" />
      <Point X="200" Y="100" GraphRef="an1" ArrowHead="mim-catalysis" />
    </Graphics>
  </Interaction>
  <Interaction GraphId="i4">
    <Graphics ZOrder="12288" ConnectorType="Elbow">
      <Point X="100" Y="134" GraphRef="a2" RelX="0.0" RelY="1.0" />
      <Point X="270" Y="250" GraphRef="a4" RelX="-1.0" RelY="0.0" ArrowHead="mim-conversion" />
    </Graphics>
  </Interaction>
  <GraphicalLine GraphId="i5">
    <Graphics ZOrder="12288" ConnectorType="Segmented">
      <Point X="20" Y="300" ArrowHead="Arrow" />
      <Point X="60" Y="340" />
      <Point X="100" Y="300" ArrowHead="Arrow" />
    </Graphics>
  </GraphicalLine>
  <Label TextLabel="Nucleus&#xA;inside" GraphId="l1">
    <Graphics CenterX="400" CenterY="300" Width="100" Height="40" FontSize="12" FontWeight="Bold" Color="999999" Valign="Middle" />
  </Label>
  <Shape GraphId="sh1">
    <Graphics CenterX="300" CenterY="250" Width="300" Height="200" ZOrder="16384" ShapeType="Oval" Color="c0c0c0" LineThickness="3.0" Rotation="0.0" />
  </Shape>
  <Group GroupId="g1" GraphId="gg1" Style="Complex" />`)

const shapes = (nodes: FigNode[]): ShapeNode[] => nodes.filter((n): n is ShapeNode => n.type === 'shape')
const lines = (nodes: FigNode[]): ConnectorNode[] => nodes.filter((n): n is ConnectorNode => n.type === 'connector')
const named = (nodes: FigNode[], text: string): ShapeNode => shapes(nodes).find((n) => n.label?.text === text)!

describe('reading a pathway file', () => {
  const read = readGpml(SMALL)
  const nodes = read.doc.nodes

  it('names the figure after the pathway and counts what it built', () => {
    expect(read.doc.name).toBe('Test pathway')
    expect(read.organism).toBe('Homo sapiens')
    expect(read.counts).toEqual({ molecules: 4, arrows: 5, labels: 1, shapes: 1, groups: 1 })
    expect(pathwaySummary(read)).toBe('“Test pathway” (Homo sapiens): 4 genes, proteins and metabolites, 5 arrows and lines, 2 shapes and labels, 1 group.')
  })

  it('turns each molecule into a shape with its name inside, enlarged to BioSketch sizes', () => {
    const egfr = named(nodes, 'EGFR')
    expect(egfr).toMatchObject({ shape: 'roundrect', w: 90, h: 30, fill: '#e3f3ef', stroke: '#1f8f84', strokeWidth: 1.5 })
    expect(egfr.label).toEqual({ text: 'EGFR', fill: '#2b2f36', fontSize: 14 })
    const grb2 = named(nodes, 'GRB2')
    expect(grb2.x).toBe(egfr.x)
    expect(grb2.y - egfr.y).toBe(36)
  })

  it('colours molecules by type, and keeps a colour the author chose', () => {
    // Blue is what WikiPathways gives every metabolite, so it is not a choice of the author.
    expect(named(nodes, 'ATP')).toMatchObject({ fill: '#fff3d6', stroke: '#d39a1c' })
    const tp53 = named(nodes, 'TP53')
    expect(tp53).toMatchObject({ fill: '#ffff99', stroke: '#ff0000' })
    expect(tp53.label?.fill).toBe('#ff0000')
  })

  it('keeps the colours and shapes of the file when asked', () => {
    const plain = readGpml(SMALL, { look: 'file' }).doc.nodes
    expect(named(plain, 'EGFR')).toMatchObject({ shape: 'rect', fill: '#ffffff', stroke: '#000000', strokeWidth: 1.5 })
    expect(named(plain, 'ATP')).toMatchObject({ fill: '#ffffff', stroke: '#0000ff' })
    expect(named(plain, 'ATP').label?.fill).toBe('#0000ff')
    expect(named(plain, 'TP53')).toMatchObject({ fill: '#ffff00', stroke: '#ff0000' })
    expect(lines(plain)[0].stroke).toBe('#000000')
  })

  it('attaches arrows to the molecules they join', () => {
    const arrow = lines(nodes).find((c) => c.from.nodeId === named(nodes, 'EGFR').id)!
    expect(arrow.to.nodeId).toBe(named(nodes, 'ATP').id)
    expect(arrow.kind).toBe('arrow')
    expect(arrow.route).toBeUndefined()
    // It runs from the middle of one side to the middle of the other, where BioSketch puts an attached end anyway.
    expect(arrow.from.port).toBeUndefined()
    expect(arrow.to.port).toBeUndefined()
  })

  it('reads a line marked at its start the other way round', () => {
    const block = lines(nodes).find((c) => c.kind === 'inhibit')!
    expect(block.from.nodeId).toBe(named(nodes, 'TP53').id)
    expect(block.to.nodeId).toBe(named(nodes, 'ATP').id)
    expect(block).toMatchObject({ dashed: true, stroke: '#ff0000' })
  })

  it('leaves an arrow that ends on another arrow where the file draws it, and says so', () => {
    const catalysis = lines(nodes).find((c) => c.kind === 'dot')!
    expect(catalysis.to.nodeId).toBeUndefined()
    expect(catalysis.from.nodeId).toBeUndefined()
    // Straight up in the file: 100 units enlarged by 1.5.
    expect(catalysis.to.x).toBe(catalysis.from.x)
    expect(catalysis.from.y - catalysis.to.y).toBe(150)
    expect(read.notes.some((n) => n.startsWith('1 arrow ends on another arrow'))).toBe(true)
  })

  it('keeps a right-angled line with one corner as the file draws it', () => {
    const elbow = lines(nodes).find((c) => c.route === 'elbow')!
    const grb2 = named(nodes, 'GRB2')
    const tp53 = named(nodes, 'TP53')
    expect(elbow.from.nodeId).toBe(grb2.id)
    expect(elbow.to.nodeId).toBe(tp53.id)
    // Down out of GRB2, then across into the left side of TP53.
    expect(elbow.legs).toBe('vh')
    const r = resolveConnector(elbow, read.doc)
    expect(r.via).toEqual([{ x: grb2.x + grb2.w / 2, y: tp53.y + tp53.h / 2 }])
    expect(r.to.x).toBeLessThan(tp53.x)
    expect(read.notes.some((n) => n.includes('right-angled'))).toBe(false)
  })

  it('bends a line with corners through the middle of its path', () => {
    const both = lines(nodes).find((c) => c.kind === 'double')!
    // The corner of the file's line lies below the straight line between its ends.
    expect(both.bend!.y).toBeGreaterThan(20)
    expect(Math.abs(both.bend!.x)).toBeLessThan(1)
    expect(read.notes.some((n) => n.includes('1 line with several corners was drawn as one curve'))).toBe(true)
  })

  it('draws a label as text, centred where the file has it', () => {
    const label = nodes.find((n): n is TextNode => n.type === 'text')!
    expect(label).toMatchObject({ text: 'Nucleus\ninside', bold: true, fill: '#999999', align: 'center', fontSize: 17 })
    const tp53 = named(nodes, 'TP53')
    // 100 units to the right of TP53's centre in the file.
    expect(label.x - (tp53.x + tp53.w / 2)).toBe(150)
  })

  it('draws a compartment behind the molecules, unfilled', () => {
    const cell = shapes(nodes).find((n) => n.shape === 'ellipse' && !n.label)!
    expect(cell).toMatchObject({ w: 450, h: 300, fill: 'none', stroke: '#c0c0c0', strokeWidth: 4.5 })
    expect(nodes.indexOf(cell)).toBeLessThan(nodes.indexOf(named(nodes, 'TP53')))
  })

  it('gives a complex an outline that moves with its members', () => {
    const egfr = named(nodes, 'EGFR')
    const grb2 = named(nodes, 'GRB2')
    const box = shapes(nodes).find((n) => n.groupId === egfr.groupId && !n.label)!
    expect(egfr.groupId).toBeTruthy()
    expect(grb2.groupId).toBe(egfr.groupId)
    expect(box).toMatchObject({ shape: 'roundrect', x: egfr.x - 12, y: egfr.y - 12, w: 114, h: 90 })
    expect(nodes.indexOf(box)).toBeLessThan(nodes.indexOf(egfr))
  })

  it('keeps a phosphate mark with its molecule', () => {
    const tp53 = named(nodes, 'TP53')
    const mark = named(nodes, 'P')
    expect(mark).toMatchObject({ shape: 'ellipse', w: 22.5, h: 22.5 })
    expect(mark.groupId).toBe(tp53.groupId)
    expect(mark.groupId).toBeTruthy()
    // On the top right corner of the molecule.
    expect(mark.x + mark.w / 2).toBe(tp53.x + tp53.w)
    expect(mark.y + mark.h / 2).toBe(tp53.y)
    expect(nodes.indexOf(mark)).toBeGreaterThan(nodes.indexOf(tp53))
  })

  it('sizes the page to the pathway, with a margin', () => {
    const left = Math.min(...shapes(nodes).map((n) => n.x))
    const top = Math.min(...shapes(nodes).map((n) => n.y))
    expect(Math.min(left, top)).toBeGreaterThanOrEqual(0)
    expect(read.doc.width).toBeGreaterThan(Math.max(...shapes(nodes).map((n) => n.x + n.w)))
    expect(read.doc.height).toBeGreaterThan(Math.max(...shapes(nodes).map((n) => n.y + n.h)))
  })

  it('builds a figure that opens again unchanged', () => {
    expect(validateDoc(JSON.parse(JSON.stringify(read.doc)))).toEqual(read.doc)
    for (const n of nodes) expect(n.id).toMatch(/^[\w-]{1,64}$/)
  })
})

describe('where arrows meet their objects', () => {
  it('keeps an arrow to the outline around its start at its place on that outline', () => {
    const read = readGpml(
      pathway(`
      <DataNode TextLabel="INS" GraphId="a1" Type="GeneProduct"><Graphics CenterX="200" CenterY="200" Width="60" Height="20" /></DataNode>
      <Shape GraphId="cell"><Graphics CenterX="200" CenterY="200" Width="300" Height="300" ShapeType="RoundedRectangle" /></Shape>
      <Interaction><Graphics><Point X="230" Y="200" GraphRef="a1" /><Point X="350" Y="200" GraphRef="cell" ArrowHead="Arrow" /></Graphics></Interaction>`),
    )
    const arrow = lines(read.doc.nodes)[0]
    const cell = shapes(read.doc.nodes).find((n) => !n.label)!
    expect(arrow.from.nodeId).toBe(named(read.doc.nodes, 'INS').id)
    expect(arrow.from.port).toBeUndefined()
    // Aimed at the middle of the outline it would have no length: the molecule sits there.
    expect(arrow.to).toMatchObject({ nodeId: cell.id, port: { x: 1, y: 0 } })
    const r = resolveConnector(arrow, read.doc)
    expect(r.to).toEqual({ x: cell.x + cell.w + 6, y: cell.y + cell.h / 2 })
    expect(read.notes).toEqual([])
  })

  it('keeps arrows that run side by side apart', () => {
    const read = readGpml(
      pathway(`
      <DataNode TextLabel="Ang I" GraphId="a1" Type="Metabolite"><Graphics CenterX="200" CenterY="100" Width="100" Height="20" /></DataNode>
      <DataNode TextLabel="Ang II" GraphId="a2" Type="Metabolite"><Graphics CenterX="200" CenterY="300" Width="100" Height="20" /></DataNode>
      <Interaction><Graphics><Point X="175" Y="110" GraphRef="a1" RelX="-0.5" RelY="1.0" /><Point X="175" Y="290" GraphRef="a2" RelX="-0.5" RelY="-1.0" ArrowHead="mim-conversion" /></Graphics></Interaction>
      <Interaction><Graphics><Point X="200" Y="110" GraphRef="a1" RelX="0.0" RelY="1.0" /><Point X="200" Y="290" GraphRef="a2" RelX="0.0" RelY="-1.0" ArrowHead="mim-conversion" /></Graphics></Interaction>
      <Interaction><Graphics><Point X="225" Y="110" GraphRef="a1" RelX="0.5" RelY="1.0" /><Point X="225" Y="290" GraphRef="a2" RelX="0.5" RelY="-1.0" ArrowHead="mim-conversion" /></Graphics></Interaction>`),
    )
    const [left, middle, right] = lines(read.doc.nodes)
    expect(left.from.port).toEqual({ x: -0.5, y: 1 })
    expect(left.to.port).toEqual({ x: -0.5, y: -1 })
    // The middle one is where BioSketch attaches an arrow anyway, so it is free to adapt when a molecule is moved.
    expect(middle.from.port).toBeUndefined()
    expect(right.to.port).toEqual({ x: 0.5, y: -1 })
    const xs = [left, middle, right].map((c) => resolveConnector(c, read.doc).to.x)
    expect(xs[1] - xs[0]).toBe(37.5)
    expect(xs[2] - xs[1]).toBe(37.5)
  })

  it('keeps a slanted arrow at the middles of the sides the file draws it from', () => {
    const read = readGpml(
      pathway(`
      <DataNode TextLabel="A" GraphId="a1"><Graphics CenterX="100" CenterY="100" Width="100" Height="20" /></DataNode>
      <DataNode TextLabel="B" GraphId="a2"><Graphics CenterX="300" CenterY="200" Width="100" Height="20" /></DataNode>
      <Interaction><Graphics><Point X="100" Y="110" GraphRef="a1" RelX="0.0" RelY="1.0" /><Point X="300" Y="190" GraphRef="a2" RelX="0.0" RelY="-1.0" ArrowHead="Arrow" /></Graphics></Interaction>`),
    )
    const arrow = lines(read.doc.nodes)[0]
    expect(arrow.from.port).toEqual({ x: 0, y: 1 })
    expect(arrow.to.port).toEqual({ x: 0, y: -1 })
  })

  it('works out the place of an end when the file gives only its point', () => {
    const read = readGpml(
      pathway(`
      <DataNode TextLabel="A" GraphId="a1"><Graphics CenterX="100" CenterY="100" Width="100" Height="20" /></DataNode>
      <DataNode TextLabel="B" GraphId="a2"><Graphics CenterX="300" CenterY="200" Width="100" Height="20" /></DataNode>
      <Interaction><Graphics><Point X="125" Y="110" GraphRef="a1" /><Point X="250" Y="205" GraphRef="a2" ArrowHead="Arrow" /></Graphics></Interaction>`),
    )
    const arrow = lines(read.doc.nodes)[0]
    expect(arrow.from.port).toEqual({ x: 0.5, y: 1 })
    expect(arrow.to.port).toEqual({ x: -1, y: 0.5 })
  })

  it('brings a right-angled line square onto the arrow it ends on', () => {
    const read = readGpml(
      pathway(`
      <DataNode TextLabel="A" GraphId="a1"><Graphics CenterX="100" CenterY="100" Width="60" Height="20" /></DataNode>
      <DataNode TextLabel="B" GraphId="a2"><Graphics CenterX="100" CenterY="300" Width="60" Height="20" /></DataNode>
      <DataNode TextLabel="E" GraphId="a3"><Graphics CenterX="300" CenterY="150" Width="60" Height="20" /></DataNode>
      <Interaction><Graphics><Point X="100" Y="110" GraphRef="a1" RelX="0.0" RelY="1.0" /><Point X="100" Y="290" GraphRef="a2" RelX="0.0" RelY="-1.0" ArrowHead="Arrow" /><Anchor Position="0.5" GraphId="mid" /></Graphics></Interaction>
      <Interaction><Graphics ConnectorType="Elbow"><Point X="300" Y="160" GraphRef="a3" RelX="0.0" RelY="1.0" /><Point X="100" Y="200" GraphRef="mid" RelX="0.0" RelY="0.0" ArrowHead="mim-catalysis" /></Graphics></Interaction>`),
    )
    const catalysis = lines(read.doc.nodes).find((c) => c.kind === 'dot')!
    // Down out of the enzyme, then across onto the upright arrow.
    expect(catalysis.legs).toBe('vh')
    expect(catalysis.to.nodeId).toBeUndefined()
  })

  it('puts the middle stretch of a right-angled line where the file has it', () => {
    const read = readGpml(
      pathway(`
      <DataNode TextLabel="A" GraphId="a1"><Graphics CenterX="100" CenterY="100" Width="60" Height="20" /></DataNode>
      <DataNode TextLabel="B" GraphId="a2"><Graphics CenterX="400" CenterY="300" Width="60" Height="20" /></DataNode>
      <Interaction><Graphics ConnectorType="Elbow"><Point X="130" Y="100" GraphRef="a1" RelX="1.0" RelY="0.0" /><Point X="350" Y="200" /><Point X="370" Y="300" GraphRef="a2" RelX="-1.0" RelY="0.0" ArrowHead="Arrow" /></Graphics></Interaction>`),
    )
    const line = lines(read.doc.nodes)[0]
    expect(line.legs).toBe('hh')
    const r = resolveConnector(line, read.doc)
    const a = named(read.doc.nodes, 'A')
    // 350 in the file is 220 to the right of A's right edge (130): enlarged, 330.
    expect(r.via![0].x - (a.x + a.w)).toBeCloseTo(330, 0)
    expect(r.via![1].x).toBe(r.via![0].x)
    expect(read.notes).toEqual([])
  })

  it('says when a right-angled line has more corners than BioSketch draws', () => {
    const read = readGpml(
      pathway(`
      <Interaction><Graphics ConnectorType="Elbow"><Point X="100" Y="100" /><Point X="150" Y="120" /><Point X="200" Y="150" /><Point X="250" Y="300" ArrowHead="Arrow" /></Graphics></Interaction>`),
    )
    expect(read.notes).toEqual(['1 right-angled line with more than two corners was given a simpler route.'])
  })

  const stack = (style: string): string =>
    pathway(`
      <DataNode TextLabel="A" GraphId="a1" GroupRef="g1"><Graphics CenterX="100" CenterY="100" Width="60" Height="20" /></DataNode>
      <DataNode TextLabel="B" GraphId="a2" GroupRef="g1"><Graphics CenterX="100" CenterY="120" Width="60" Height="20" /></DataNode>
      <DataNode TextLabel="C" GraphId="a3"><Graphics CenterX="300" CenterY="125" Width="60" Height="20" /></DataNode>
      <Interaction><Graphics><Point X="270" Y="125" GraphRef="a3" RelX="-1.0" RelY="0.0" /><Point X="138" Y="125" GraphRef="gg" RelX="1.0" RelY="0.5" ArrowHead="Arrow" /></Graphics></Interaction>
      <Group GroupId="g1" GraphId="gg" ${style} />`)

  it('attaches an arrow to a stack of molecules that has no outline to the molecule it reaches', () => {
    // The style "Group" keeps molecules together without drawing anything around them.
    const read = readGpml(stack('Style="Group"'))
    const nodes = read.doc.nodes
    expect(shapes(nodes)).toHaveLength(3)
    expect(named(nodes, 'A').groupId).toBe(named(nodes, 'B').groupId)
    // The arrow ends beside B, about where an arrow simply attached to B ends anyway.
    expect(lines(nodes)[0].to.nodeId).toBe(named(nodes, 'B').id)
    expect(lines(nodes)[0].to.port).toBeUndefined()
    expect(read.notes).toEqual([])
  })

  it('draws a dashed outline around a plain group, and attaches arrows to that', () => {
    const nodes = readGpml(stack('')).doc.nodes
    const outline = shapes(nodes).find((n) => !n.label)!
    expect(outline).toMatchObject({ shape: 'rect', dashed: true, fill: '#f3f5f7', groupId: named(nodes, 'A').groupId })
    expect(lines(nodes)[0].to).toMatchObject({ nodeId: outline.id, port: { x: 1, y: 0.5 } })
  })

  it('leaves an arrow where the file draws it when what it is joined to is not in the file', () => {
    const read = readGpml(
      pathway(`
      <DataNode TextLabel="A" GraphId="a1"><Graphics CenterX="100" CenterY="100" Width="60" Height="20" /></DataNode>
      <Interaction><Graphics><Point X="130" Y="100" GraphRef="a1" /><Point X="300" Y="100" GraphRef="nowhere" ArrowHead="Arrow" /></Graphics></Interaction>`),
    )
    expect(lines(read.doc.nodes)[0].to.nodeId).toBeUndefined()
    expect(read.notes).toEqual(['1 arrow end could not be attached (the file joins it to something that is not in the file) and stays where the file puts it.'])
  })

  it('draws a right-angled line that runs straight as a straight line', () => {
    const read = readGpml(
      pathway(`
      <DataNode TextLabel="A" GraphId="a1"><Graphics CenterX="100" CenterY="100" Width="60" Height="20" /></DataNode>
      <DataNode TextLabel="B" GraphId="a2"><Graphics CenterX="100" CenterY="200" Width="80" Height="20" /></DataNode>
      <Interaction><Graphics ConnectorType="Elbow"><Point X="100" Y="110" GraphRef="a1" /><Point X="100" Y="190" GraphRef="a2" ArrowHead="Arrow" /></Graphics></Interaction>`),
    )
    const line = lines(read.doc.nodes)[0]
    expect(line).toMatchObject({ route: 'elbow', legs: 'vv' })
    const r = resolveConnector(line, read.doc)
    expect(new Set([r.from.x, r.to.x, ...r.via!.map((p) => p.x)]).size).toBe(1)
    expect(read.notes).toEqual([])
  })
})

describe('what a pathway file may hold', () => {
  it('refuses what is not a pathway file', () => {
    expect(() => readGpml('GeneProduct\tEGFR')).toThrow(/not a pathway file/)
    expect(() => readGpml('<svg xmlns="http://www.w3.org/2000/svg"/>')).toThrow(/not a pathway file/)
    expect(() => readGpml('{"nodes":[]}')).toThrow(/not a pathway file/)
  })

  it('says which formats it does not read', () => {
    expect(() => readGpml(pathway('', 'http://pathvisio.org/GPML/2021'))).toThrow(/GPML 2021/)
    expect(() => readGpml(pathway('', 'http://genmapp.org/GPML/2007'))).toThrow(/save it again as GPML 2013a/)
  })

  it('refuses a pathway with nothing to draw', () => {
    expect(() => readGpml(pathway(''))).toThrow(/nothing that can be drawn/)
  })

  it('leaves out objects without a size and reports them', () => {
    const read = readGpml(
      pathway(`
      <DataNode TextLabel="A" GraphId="a1"><Graphics CenterX="100" CenterY="100" Width="60" Height="20" /></DataNode>
      <DataNode TextLabel="B" GraphId="a2"><Graphics CenterX="100" CenterY="abc" Width="60" Height="20" /></DataNode>
      <DataNode TextLabel="C" GraphId="a3"><Graphics CenterX="1e99" CenterY="10" Width="60" Height="20" /></DataNode>`),
    )
    expect(shapes(read.doc.nodes)).toHaveLength(1)
    expect(read.notes).toEqual(['2 objects without a place, a size or a text were left out.'])
  })

  it('keeps markup in a name as plain words', () => {
    const read = readGpml(pathway(`<DataNode TextLabel="&lt;img src=x onerror=alert(1)&gt;" GraphId="a1"><Graphics CenterX="100" CenterY="100" Width="60" Height="20" Color="red;&quot;&gt;&lt;script&gt;" /></DataNode>`))
    const node = shapes(read.doc.nodes)[0]
    expect(node.label?.text).toBe('<img src=x onerror=alert(1)>')
    // The unreadable colour is dropped: a molecule without a type gets the grey of "other".
    expect(node.stroke).toBe('#8a94a0')
  })

  it('reads colours, shapes and end marks of the file', () => {
    expect(gpmlColor('FF00aa')).toBe('#ff00aa')
    expect(gpmlColor('Transparent')).toBe('none')
    expect(gpmlColor('White')).toBe('#ffffff')
    expect(gpmlColor('url(#x)')).toBeNull()
    expect(shapeFor('RoundedRectangle')).toEqual({ shape: 'roundrect' })
    expect(shapeFor('Mitochondria')).toEqual({ shape: 'ellipse', organelle: true })
    expect(shapeFor('Pentagon')).toEqual({ shape: 'hexagon', approx: 'pentagon' })
    expect(headKind('mim-inhibition')).toBe('inhibit')
    expect(headKind('TBar')).toBe('inhibit')
    expect(headKind('mim-catalysis')).toBe('dot')
    expect(headKind('mim-conversion')).toBe('arrow')
    expect(headKind('Line')).toBeNull()
    expect(headKind(null)).toBeNull()
  })

  it('turns a brace, which lies along its width in the file, into an upright bracket turned on its side', () => {
    const read = readGpml(pathway(`<Shape><Graphics CenterX="200" CenterY="100" Width="100" Height="20" ShapeType="Brace" Rotation="0.0" /></Shape>`))
    expect(shapes(read.doc.nodes)[0]).toMatchObject({ shape: 'bracket', w: 30, h: 150, rotation: 90 })
  })
})

describe('a pathway from WikiPathways (WP554, ACE inhibitor pathway)', () => {
  const read = readGpml(wp554)
  const nodes = read.doc.nodes

  it('brings every molecule, line, label and shape', () => {
    expect(read.doc.name).toBe('ACE inhibitor pathway')
    expect(read.counts).toEqual({ molecules: 33, arrows: 37, labels: 4, shapes: 3, groups: 0 })
    expect(nodes).toHaveLength(77)
    expect(named(nodes, 'ACE2')).toBeTruthy()
  })

  it('attaches arrows only to objects of the figure', () => {
    const ids = new Set(nodes.map((n) => n.id))
    const attached = lines(nodes).flatMap((c) => [c.from.nodeId, c.to.nodeId]).filter(Boolean)
    expect(attached.length).toBeGreaterThan(50)
    for (const id of attached) expect(ids.has(id!)).toBe(true)
  })

  it('reports the arrows that end on other arrows', () => {
    expect(read.notes.some((n) => /arrows end on another arrow/.test(n))).toBe(true)
  })

  it('opens again unchanged', () => {
    expect(validateDoc(JSON.parse(JSON.stringify(read.doc)))).toEqual(read.doc)
  })
})

describe('adding a pathway to the open figure', () => {
  const pathway = readGpml(wp554).doc
  const mine: ShapeNode = { id: 'mine', type: 'shape', shape: 'rect', x: 10, y: 10, w: 50, h: 30, rotation: 0, fill: '#ffffff', stroke: '#000000', strokeWidth: 2 }
  const open = { ...emptyDoc(), width: 1200, height: 800, nodes: [mine as FigNode] }
  const all = (doc: { nodes: FigNode[] }): string[] => doc.nodes.map((n) => n.id)

  it('copies every object under an id of its own, centred where asked, and leaves the figure as it was otherwise', () => {
    const { doc, ids, scale } = addFigure(open, pathway, { x: 2000, y: 1500 })
    expect(scale).toBe(1)
    expect(ids).toHaveLength(pathway.nodes.length)
    expect(doc.nodes).toHaveLength(pathway.nodes.length + 1)
    expect(doc.nodes[0]).toBe(mine)
    expect([doc.width, doc.height, doc.name]).toEqual([1200, 800, open.name])
    expect(new Set(all(doc)).size).toBe(doc.nodes.length)
    expect(ids.some((id) => all(pathway).includes(id))).toBe(false)
    const [was, now] = [selectionRect(pathway, all(pathway))!, selectionRect(doc, ids)!]
    expect(now.x + now.w / 2).toBeCloseTo(2000, 0)
    expect(now.y + now.h / 2).toBeCloseTo(1500, 0)
    expect(now.w).toBeCloseTo(was.w, 0)
    // What is saved and opened again is the same figure.
    expect(validateDoc(JSON.parse(JSON.stringify(doc))).nodes).toHaveLength(doc.nodes.length)
  })

  it('keeps arrows on the copies of their molecules and groups together', () => {
    const { doc, ids } = addFigure(open, pathway, { x: 600, y: 400 })
    const added = new Set(ids)
    const arrows = doc.nodes.filter((n): n is ConnectorNode => n.type === 'connector')
    const attached = arrows.flatMap((a) => [a.from.nodeId, a.to.nodeId]).filter(Boolean)
    expect(attached.length).toBeGreaterThan(10)
    expect(attached.every((id) => added.has(id!))).toBe(true)
    const groupsBefore = new Set(pathway.nodes.map((n) => n.groupId).filter(Boolean))
    const groupsAfter = new Set(doc.nodes.map((n) => n.groupId).filter(Boolean))
    expect(groupsAfter.size).toBe(groupsBefore.size)
    expect([...groupsAfter].some((g) => groupsBefore.has(g))).toBe(false)
    // Each arrow runs between the same two molecules as in the pathway, the same distance apart.
    const first = pathway.nodes.find((n): n is ConnectorNode => n.type === 'connector' && !!n.from.nodeId && !!n.to.nodeId)!
    const copy = arrows[pathway.nodes.filter((n) => n.type === 'connector').indexOf(first)]
    const [a, b] = [resolveConnector(first, pathway), resolveConnector(copy, doc)]
    expect(b.to.x - b.from.x).toBeCloseTo(a.to.x - a.from.x, 0)
    expect(b.to.y - b.from.y).toBeCloseTo(a.to.y - a.from.y, 0)
  })

  it('makes a pathway that is larger than the room smaller, text and lines in step, and never enlarges one', () => {
    const was = contentRect(pathway)!
    const { doc, ids, scale } = addFigure(open, pathway, { x: 600, y: 400 }, { w: 540, h: 720 })
    expect(scale).toBeCloseTo(Math.min(540 / was.w, 720 / was.h), 3)
    expect(scale).toBeLessThan(1)
    const now = selectionRect(doc, ids)!
    expect(now.w).toBeLessThanOrEqual(541)
    expect(now.h).toBeLessThanOrEqual(721)
    const size = (d: { nodes: FigNode[] }): number => (d.nodes.find((n) => n.type === 'shape' && n.label) as ShapeNode).label!.fontSize
    expect(size({ nodes: doc.nodes.slice(1) }) / size(pathway)).toBeCloseTo(scale, 1)
    expect(addFigure(open, pathway, { x: 0, y: 0 }, { w: 9000, h: 9000 }).scale).toBe(1)
    // Nothing to add: the figure is handed back as it is.
    expect(addFigure(open, emptyDoc(), { x: 0, y: 0 }).doc).toBe(open)
  })
})
