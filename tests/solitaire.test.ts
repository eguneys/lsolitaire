import { it, expect } from 'vitest'
import { cards, Solitaire, SolitairePov, TurningCards, TurningLimit } from '../src'


it('works', () => {

  let settings = { 
    cards: TurningCards.ThreeCards, 
    limit: TurningLimit.NoLimit
  }
  let s = Solitaire.make(settings, cards)
  //console.log(s.pov.fen)

  expect(SolitairePov.from_fen(s.pov.fen).fen).toBe(s.pov.fen)
})
