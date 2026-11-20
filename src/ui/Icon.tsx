// Small line icons for the editor's own buttons (not the figure icon library).

const lipids = [5, 12, 19]
  .map((x) => `M${x - 2} 5a2 2 0 1 0 4 0a2 2 0 1 0-4 0M${x} 7v4M${x - 2} 19a2 2 0 1 0 4 0a2 2 0 1 0-4 0M${x} 17v-4`)
  .join('')

const PATHS = {
  select: 'M5 3l14 8-6 2-2 6z',
  pan: 'M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3',
  text: 'M5 6V4h14v2M12 4v16M9 20h6',
  chart: 'M4 4v16h16M8 16v-5M12 16V8M16 16v-7',
  shape: 'M3 4h11v11H3zM21 16.5a4.5 4.5 0 1 1-9 0a4.5 4.5 0 0 1 9 0z',
  connector: 'M4 19L18 6M18 6h-7M18 6v7',
  membrane: lipids,
  pen: 'M4 20l1-4L16 5l3 3L8 19zM14 7l3 3',
  eraser: 'M20 20H9l-5-5L14 5l7 7-8 8',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  redo: 'M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3',
  zoomIn: 'M11 4a7 7 0 1 0 0 14a7 7 0 0 0 0-14zM20 20l-4-4M11 8v6M8 11h6',
  zoomOut: 'M11 4a7 7 0 1 0 0 14a7 7 0 0 0 0-14zM20 20l-4-4M8 11h6',
  grid: 'M4 4h16v16H4zM4 9.5h16M4 14.5h16M9.5 4v16M14.5 4v16',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6a3 3 0 0 0 0-6z',
  eyeOff: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM4 4l16 16',
  export: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  open: 'M3 6h6l2 2h10v11H3z',
  newFile: 'M6 3h8l4 4v14H6zM12 11v6M9 14h6',
  save: 'M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6',
  sparkles: 'M11 3l1.8 5.2L18 10l-5.2 1.8L11 17l-1.8-5.2L4 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  group: 'M5 5h6v6H5zM13 13h6v6h-6zM2 2h20v20H2z',
  ungroup: 'M4 4h7v7H4zM13 13h7v7h-7z',
  alignLeft: 'M4 4v16M8 7h10v4H8zM8 14h6v4H8z',
  alignHCenter: 'M12 4v16M6 7h12v4H6zM8 14h8v4H8z',
  alignRight: 'M20 4v16M6 7h10v4H6zM10 14h6v4h-6z',
  alignTop: 'M4 4h16M7 8h4v10H7zM14 8h4v6h-4z',
  alignVCenter: 'M4 12h16M7 6h4v12H7zM14 8h4v8h-4z',
  alignBottom: 'M4 20h16M7 6h4v10H7zM14 10h4v6h-4z',
  distributeH: 'M4 4v16M20 4v16M9 8h6v8H9z',
  distributeV: 'M4 4h16M4 20h16M8 9h8v6H8z',
  flipH: 'M12 3v18M9 7L4 12l5 5zM15 7l5 5-5 5z',
  flipV: 'M3 12h18M7 9l5-5 5 5zM7 15l5 5 5-5z',
  toFront: 'M9 9h11v11H9zM4 4h9v3M4 4v9h3',
  toBack: 'M4 4h11v11H4zM20 11v9h-9M20 11h-3M11 20v-3',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  import: 'M12 16V5M7 9l5-5 5 5M5 20h14',
  template: 'M4 4h16v6H4zM4 14h7v6H4zM15 14h5v6h-5z',
  library: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  sliders: 'M4 7h10M18 7h2M4 17h2M10 17h10M16 5v4M8 15v4',
  help: 'M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z',
  fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  swap: 'M4 8h14l-3-3M20 16H6l3 3',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  unlock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 6.8-1.2',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9.5h.01',
  figures: 'M8 8h12v12H8zM4 16V4h12',
  pdf: 'M6 3h8l4 4v14H6zM14 3v4h4M9 13h6M9 17h6',
  pathway: 'M4 4h7v4H4zM13 16h7v4h-7zM7.5 8v7a3 3 0 0 0 3 3H13M11 16l2 2-2 2',
  slides: 'M7 4h13v10H7zM4 8v10h13',
  play: 'M8 5l11 7-11 7z',
  chevronLeft: 'M14 6l-6 6 6 6',
  chevronRight: 'M10 6l6 6-6 6',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="ui-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
