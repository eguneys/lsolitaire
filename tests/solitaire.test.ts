import { it, expect } from 'vitest'
import { cards, Solitaire, SolitairePov } from '../src'


it('works', () => {

  let s = Solitaire.make(cards)
  //console.log(s.pov.fen)

  expect(SolitairePov.from_fen(s.pov.fen).fen).toBe(s.pov.fen)
})
