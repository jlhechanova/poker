export type ICard = string;

export const sizes = [[3,'3x'], [2,'2x'], [1,'POT'], [0.75,'¾'], [0.5,'½'], [1 / 3,'⅓'], [0.25,'¼']] as const;

export const coordsSeat = [
  {top: '', left: '50%', bottom: '-4rem', right: '', transform: 'translateX(-50%)'},
  {top: '', left: '', bottom: '0.5rem', right: '3rem', transform: 'translate(50%, 50%)'},
  {top: '50%', left: '', bottom: '', right: '-2rem', transform: 'translate(50%, -50%)'},
  {top: '0', left: '', bottom: '', right: '2rem', transform: 'translate(50%, -50%)'},
  {top: '-6rem', left: '', bottom: '', right: '34%', transform: 'translateX(50%)'},
  {top: '-6rem', left: '34%', bottom: '', right: '', transform: 'translateX(-50%)'},
  {top: '0', left: '2rem', bottom: '', right: '', transform: 'translate(-50%, -50%)'},
  {top: '50%', left: '-2rem', bottom: '', right: '', transform: 'translate(-50%, -50%)'},
  {top: '', left: '3rem', bottom: '0.5rem', right: '', transform: 'translate(-50%, 50%)'},
]

export const coordsBet = [
  {top: '-3rem', left: '', bottom: '', right: '50%', transform: 'translateX(50%)'},
  {top: '-3rem', left: '', bottom: '', right: '100%', transform: ''},
  {top: '50%', left: '', bottom: '', right: '130%', transform: ''},
  {top: '', left: '', bottom: '-3rem', right: '100%', transform: ''},
  {top: '', left: '', bottom: '-4rem', right: '50%', transform: 'translateX(50%)'},
  {top: '', left: '', bottom: '-4rem', right: '50%', transform: 'translateX(50%)'},
  {top: '', left: '100%', bottom: '-3rem', right: '', transform: ''},
  {top: '50%', left: '130%', bottom: '', right: '', transform: ''},
  {top: '-3rem', left: '100%', bottom: '', right: '', transform: ''},
]