export const FORMATIONS: Record<string, { label: string, style: string, coords: { x: number, y: number, pos: string }[] }> = {
  '2-1-1': {
    label: '2-1-1', style: 'Équilibré',
    coords: [
      { x: 50, y: 85, pos: 'GK' }, { x: 30, y: 65, pos: 'LD' }, { x: 70, y: 65, pos: 'RD' }, { x: 50, y: 45, pos: 'CM' }, { x: 50, y: 20, pos: 'ST' }
    ]
  },
  '1-2-1': {
    label: '1-2-1', style: 'Possession',
    coords: [
      { x: 50, y: 85, pos: 'GK' }, { x: 50, y: 65, pos: 'CD' }, { x: 30, y: 45, pos: 'LM' }, { x: 70, y: 45, pos: 'RM' }, { x: 50, y: 20, pos: 'ST' }
    ]
  },
  '2-2': {
    label: '2-2', style: 'Rapide',
    coords: [
      { x: 50, y: 85, pos: 'GK' }, { x: 30, y: 65, pos: 'LD' }, { x: 70, y: 65, pos: 'RD' }, { x: 30, y: 30, pos: 'LF' }, { x: 70, y: 30, pos: 'RF' }
    ]
  },
  '1-1-2': {
    label: '1-1-2', style: 'Offensif',
    coords: [
      { x: 50, y: 85, pos: 'GK' }, { x: 50, y: 70, pos: 'CD' }, { x: 50, y: 45, pos: 'CM' }, { x: 30, y: 25, pos: 'LF' }, { x: 70, y: 25, pos: 'RF' }
    ]
  },
  '0-2-2': {
    label: '0-2-2', style: 'Ultra Attaque',
    coords: [
      { x: 50, y: 85, pos: 'GK' }, { x: 30, y: 55, pos: 'LM' }, { x: 70, y: 55, pos: 'RM' }, { x: 30, y: 25, pos: 'LF' }, { x: 70, y: 25, pos: 'RF' }
    ]
  },
  '1-3': {
    label: '1-3', style: 'Tout Attaque',
    coords: [
      { x: 50, y: 85, pos: 'GK' }, { x: 50, y: 70, pos: 'CD' }, { x: 20, y: 35, pos: 'LF' }, { x: 50, y: 25, pos: 'CF' }, { x: 80, y: 35, pos: 'RF' }
    ]
  },
  'Rotation': {
    label: 'Rotation', style: 'Futsal',
    coords: [
      { x: 50, y: 85, pos: 'GK' }, { x: 25, y: 60, pos: 'P1' }, { x: 75, y: 60, pos: 'P2' }, { x: 25, y: 35, pos: 'P3' }, { x: 75, y: 35, pos: 'P4' }
    ]
  }
}
