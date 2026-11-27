import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { kvDel, kvGet, kvSet } from '../io/storage'
import { applyTheme, startTheme } from '../ui/theme'
import { Notebook } from './Notebook'
import { keyValueStore } from './store'
import '../styles.css'
import './labbook.css'

applyTheme(startTheme())

// The entries are kept in this browser, beside the figures of BioSketch.
const store = keyValueStore({ get: kvGet, set: kvSet, del: kvDel })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Notebook store={store} />
  </StrictMode>,
)
