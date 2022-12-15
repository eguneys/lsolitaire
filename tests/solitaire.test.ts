import { it, expect } from 'vitest'
import { Stack } from '../src'
//import { cards, Solitaire, SolitairePov, TurningCards, TurningLimit } from '../src'


it('stack', () => {


  let s = Stack.empty

  s.add_cards(['d8', 'd6'])

  let res = s.remove_cards(1)

  expect(res).toStrictEqual(['d6'])

})

/*
it('works', () => {

  let settings = { 
    cards: TurningCards.ThreeCards, 
    limit: TurningLimit.NoLimit
  }
  let s = Solitaire.make(settings, cards)
  //console.log(s.pov.fen)

  expect(SolitairePov.from_fen(s.pov.fen).fen).toBe(s.pov.fen)
})
*/
