import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { kvDel, kvGet, kvSet } from '../io/storage'
import { applyTheme, startTheme } from '../ui/theme'
import { Notebook } from './Notebook'
import { keyValueStore } from './store'
import '../styles.css'
import './labbook.css'

applyTheme(startTheme())

// Entries are kept in this browser, beside the figures of BioSketch, until the scientist chooses
// a folder on their computer instead (see src/labbook/folder.ts).
const browserStore = keyValueStore({ get: kvGet, set: kvSet, del: kvDel })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Notebook browserStore={browserStore} />
  </StrictMode>,
)
