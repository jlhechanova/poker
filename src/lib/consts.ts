export type ICard = string;

export const sizes = [[3,'3x'], [2,'2x'], [1,'POT'], [0.75,'¾'], [0.5,'½'], [1 / 3,'⅓'], [0.25,'¼']] as const;

export const coordsSeat = [
  {top: '', left: '50%', bottom: '-6rem', right: '', transform: 'translateX(-50%)'},
  {top: '50%', left: '', bottom: '', right: '-5rem', transform: 'translateY(-50%)'},
  {top: '-6rem', left: '50%', bottom: '', right: '', transform: 'translateX(-50%)'},
  {top: '50%', left: '-5rem', bottom: '', right: '', transform: 'translateY(-50%)'},
]

export const coordsBet = [
  {top: '', left: '50%', bottom: '9.5rem', right: '', transform: 'translateX(-50%)'},
  {top: '50%', left: '', bottom: '', right: '9.5rem', transform: 'translateY(-50%)'},
  {top: '9.5rem', left: '50%', bottom: '', right: '', transform: 'translateX(-50%)'},
  {top: '50%', left: '9.5rem', bottom: '', right: '', transform: 'translateY(-50%)'},
]