#!/usr/bin/env node
// Build icon packs from a copy of https://github.com/duerrsimon/bioicons.
//
//   node scripts/bioicons.mjs <path to bioicons>/static/icons cc0
//   node scripts/bioicons.mjs <path to bioicons>/static/icons servier
//
// "cc0" takes the public-domain folder: figures made with those icons need no credit.
// "servier" takes the CC BY 3.0 folder, which is Servier Medical Art: figures using those icons
// must credit Servier, and BioSketch writes that credit into the export.
// Each set is sorted into themed packs, names are tidied, logos are left out, and
// import-icons.mjs does the cleaning. The packs in public/icon-packs/ were built from the
// Bioicons commit d29e766 (10 June 2026).

import { spawnSync } from 'node:child_process'
import { cp, mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SETS = {
  cc0: {
    folder: 'cc-0',
    licence: 'CC0',
    source: 'https://bioicons.com',
    maxKb: 300,
    packs: [
      { id: 'bio-cells', name: 'Bioicons: cells', folders: ['Cell_types', 'Cell_lines', 'Cell_membrane', 'Tissues', 'Blood_Immunology', 'Intracellular_components', 'Extracellular_matrix', 'Receptors_channels', 'Microbiology', 'Viruses'] },
      { id: 'bio-molecules', name: 'Bioicons: molecules', folders: ['Amino-Acids', 'Chemistry', 'Peptides', 'Nucleic_acids', 'Molecular_modelling', 'Nanotechnology', 'Epigenetics', 'Genetics', 'Genomics'] },
      { id: 'bio-lab', name: 'Bioicons: lab', folders: ['Lab_apparatus', 'Cell_culture', 'Imaging', 'Safety_symbols', 'General_items'] },
      { id: 'bio-organisms', name: 'Bioicons: organisms', folders: ['Animals', 'Plants_Algae', 'Human_physiology', 'People-Other'] },
      { id: 'bio-data', name: 'Bioicons: data', folders: ['Machine_Learning', 'Chemo-_and_Bioinformatics', 'Computer_hardware', 'Scientific_graphs'] },
    ],
  },
  servier: {
    folder: 'cc-by-3.0',
    licence: 'CC BY 3.0',
    source: 'https://smart.servier.com',
    // The anatomical drawings are detailed; the largest are left out to keep packs quick to open.
    maxKb: 200,
    packs: [
      // The human body is the largest folder by far; it is cut by first letter into packs of a few megabytes.
      { id: 'srv-body-1', name: 'Servier: human body A–C', folders: ['Human_physiology'], letters: 'abc' },
      { id: 'srv-body-2', name: 'Servier: human body D–H', folders: ['Human_physiology'], letters: 'defgh' },
      { id: 'srv-body-3', name: 'Servier: human body I–O', folders: ['Human_physiology'], letters: 'ijklmno' },
      { id: 'srv-body-4', name: 'Servier: human body P–Z', folders: ['Human_physiology'], letters: 'pqrstuvwxyz0123456789' },
      { id: 'srv-tissues', name: 'Servier: tissues and tumours', folders: ['Tissues', 'Oncology'] },
      { id: 'srv-blood', name: 'Servier: blood and immunity', folders: ['Blood_Immunology'] },
      { id: 'srv-cells', name: 'Servier: cell parts', folders: ['Cell_membrane', 'Intracellular_components'] },
      { id: 'srv-receptors', name: 'Servier: receptors and channels', folders: ['Receptors_channels'] },
      { id: 'srv-molecules', name: 'Servier: molecules', folders: ['Chemistry', 'Genetics', 'Nucleic_acids', 'Molecular_modelling', 'Scientific_graphs'] },
      { id: 'srv-microbes', name: 'Servier: microbes and parasites', folders: ['Microbiology', 'Parasites', 'Viruses'] },
      { id: 'srv-animals', name: 'Servier: animals and plants', folders: ['Animals', 'Plants_Algae', 'People-Other'] },
      { id: 'srv-items', name: 'Servier: lab and general', folders: ['General_items', 'Lab_apparatus'] },
    ],
  },
}

// Logos of companies and software projects, and drawings that show a maker's name, are trademarks
// whatever their copyright licence says.
const LOGOS = new Set(['camera.svg', 'PubChem_logo.svg', 'GEO_logo.svg', 'Python-logo-notext.svg', 'Keras.svg', 'Julia.svg', 'Rust.svg', 'colab.svg', 'galaxy.svg', 'gromacs.svg', 'nvidia-gpu.svg'])

// Folder names that do not read as a person's name once hyphens become spaces.
const AUTHORS = {
  'B--Gideon-Bergheim': 'B. Gideon Bergheim',
  'B-Gideon-Bergheim': 'B. Gideon Bergheim',
  'David-Eccles--gringer-': 'David Eccles (gringer)',
  'James-A--Fellows-Yates': 'James A. Fellows Yates',
  'Fang-fang-yang': 'Fang-fang Yang',
  'Fang-fang-yang-': 'Fang-fang Yang',
  'fang-fang-yang': 'Fang-fang Yang',
  'fang-fangyang': 'Fang-fang Yang',
  EwaOz: 'Ewa Oz',
  kehan: 'KeHan',
  EmilyADaniel: 'Emily A. Daniel',
  Mariana_RuizVillareal: 'Mariana Ruiz Villarreal',
  Servier: 'Servier Medical Art',
  ModifiedFrom_Servier: 'modified from Servier Medical Art',
}

// Drawings that sit in a corner of a large page, or run over its edge: [x, y, width, height] of the
// drawing itself, measured in a browser (getBBox) on the cleaned icon.
const CROPS = {
  'Viruses/KeHan/virus_titer_plaque_assay.svg': [38.855, 103.455, 132.289, 90.089],
  'Plants_Algae/Gina-Vong/Dicot_ApicalHook.svg': [158.088, 137.775, 15.511, 52.681],
  'Plants_Algae/Gina-Vong/DicotSeedling.svg': [60.65, 126.952, 57.348, 78.466],
  'Plants_Algae/Gina-Vong/Leaf.svg': [69.399, 47.46, 53.82, 23.408],
  'Plants_Algae/Gina-Vong/Lemna.svg': [67.773, 90.989, 43.789, 45.71],
  'People-Other/B--Gideon-Bergheim/Scientist_female.svg': [65.809, 42.274, 73.826, 173.638],
  'Plants_Algae/James-Lloyd/TomatoFruit.svg': [187.67, 177.93, 199.68, 151.68],
  'Intracellular_components/jaiganesh/ribosome.svg': [-1.78, -1.994, 7.695, 7.939],
  'Computer_hardware/Simon_Dürr/gpu-3d.svg': [-75.594, -102.378, 239.915, 201.25],
  'Lab_apparatus/Xavax/1000_ml_Erlenmeyer_flask.svg': [-24.382, -363.118, 929.564, 1267.876],
  'Human_physiology/Servier/contact-lens.svg': [32.861, 10.465, 75.11, 170.889],
  'Human_physiology/Servier/double-convex-lens.svg': [16.44, 1.116, 48.311, 191.411],
  'Human_physiology/Servier/negative-meniscus-lens.svg': [27.016, 1.725, 50.012, 190.952],
  'Human_physiology/Servier/plano-concave-lens.svg': [30.707, 1.085, 46.041, 190.953],
  'Human_physiology/Servier/plano-convex-lens.svg': [23.147, 1.116, 36.66, 191.411],
  'Human_physiology/Servier/positive-meniscus-lens.svg': [35.895, 1.075, 46.979, 191.453],
  'General_items/Servier/microtube-closed-blue-empty.svg': [83.976, 114.139, 41.653, 68.926],
}

const words = (s) => s.replace(/[-_]+/g, ' ').trim()
const dirs = async (path) => (await readdir(path, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort()

async function main() {
  const [source, which] = process.argv.slice(2)
  const set = SETS[which]
  if (!source || !set) {
    console.error(`Usage: node scripts/bioicons.mjs <path to bioicons>/static/icons <${Object.keys(SETS).join('|')}>`)
    process.exit(2)
  }
  const root = resolve(source, set.folder)
  const importer = fileURLToPath(new URL('./import-icons.mjs', import.meta.url))
  const known = new Set(set.packs.flatMap((p) => p.folders))
  const unknown = (await dirs(root)).filter((d) => !known.has(d))
  if (unknown.length) console.log(`Folders not in any pack (add them to SETS to include them): ${unknown.join(', ')}`)

  const work = await mkdtemp(join(tmpdir(), 'bioicons-'))
  try {
    for (const pack of set.packs) {
      const meta = {}
      for (const folder of pack.folders) {
        const authors = await dirs(join(root, folder)).catch(() => [])
        for (const author of authors) {
          for (const entry of await readdir(join(root, folder, author), { withFileTypes: true })) {
            if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.svg') || LOGOS.has(entry.name)) continue
            if (pack.letters && !pack.letters.includes(entry.name[0].toLowerCase())) continue
            const rel = `${folder}/${author}/${entry.name}`
            await mkdir(join(work, pack.id, folder, author), { recursive: true })
            await cp(join(root, rel), join(work, pack.id, rel))
            const info = { author: AUTHORS[author] ?? words(author) }
            // Drawings by others that Bioicons files beside Servier's point back to Bioicons.
            if (which === 'servier' && !author.includes('Servier')) info.source = 'https://bioicons.com'
            const base = entry.name.slice(0, -4)
            // Names a search could not find otherwise.
            if (base.endsWith('.drawio')) info.name = /[a-z]/i.test(base) ? words(base.slice(0, -7)) : 'Blood plasma'
            else if (base.startsWith('img_')) info.name = words(base.slice(4)).replace(/(\D)0?(\d+)$/, '$1 $2')
            else if (base.endsWith('_noH')) info.name = `${words(base.slice(0, -4))} (no hydrogens)`
            if (CROPS[rel]) info.crop = CROPS[rel]
            meta[rel] = info
          }
        }
      }
      if (!Object.keys(meta).length) continue
      const metaFile = join(work, `${pack.id}.meta.json`)
      await writeFile(metaFile, JSON.stringify(meta))
      const args = [importer, join(work, pack.id), '--id', pack.id, '--name', pack.name, '--licence', set.licence, '--source', set.source, '--meta', metaFile, '--max-kb', String(set.maxKb)]
      const run = spawnSync(process.execPath, args, { stdio: 'inherit' })
      if (run.status !== 0) process.exit(run.status ?? 1)
    }
  } finally {
    await rm(work, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
