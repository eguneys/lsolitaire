import { it, expect } from 'vitest'
import { Stack, Cards } from '../src'
import { Game, Solitaire } from '../src'
import { HitStock } from '../src'

it('hit stock', () => {

  let settings = { cards: 'threecards', limit: 'nolimit' }
  let s = Solitaire.make(settings, Cards.deck)
  let g = Game.make(s)

  expect(g.can_undo).toBe(false)
  expect(g.pov.score).toBe(0)
  expect(g.pov.history).toBe(0)
  expect(g.pov.can_undo).toBe(false)
  expect(g.pov.game.can_hit).toBe(true)
  expect(g.pov.game.stock.stock.length).toBe(52 - 7 - 6 - 5 - 4 - 3 -2 -1)
  expect(g.pov.game.stock.waste.length).toBe(0)

  g.apply(HitStock)

  expect(g.can_undo).toBe(true)
  expect(g.pov.score).toBe(0)
  expect(g.pov.history).toBe(1)
  expect(g.pov.can_undo).toBe(true)
  expect(g.pov.game.can_hit).toBe(true)
  expect(g.pov.game.stock.stock.length).toBe(52 - 7 - 6 - 5 - 4 - 3 -2 -1 - 3)
  expect(g.pov.game.stock.waste.length).toBe(3)

  g.undo()


  expect(g.can_undo).toBe(false)
  expect(g.pov.score).toBe(-80)
  expect(g.pov.history).toBe(0)
  expect(g.pov.can_undo).toBe(false)
  expect(g.pov.game.can_hit).toBe(true)

  expect(g.pov.game.stock.stock.length).toBe(52 - 7 - 6 - 5 - 4 - 3 -2 -1)
  expect(g.pov.game.stock.waste.length).toBe(0)

})


it('pov', () => {

  let settings = { cards: 'threecards', limit: 'nolimit' }
  let s = Solitaire.make(settings, Cards.deck)
  let g = Game.make(s)


  let args = g.apply(HitStock)

  g.pov.game.hit_stock(args.data)

  expect(g.pov.game.stock.stock.length).toBe(52 - 7 - 6 - 5 - 4 - 3 -2 - 1 - 3)
  expect(g.pov.game.stock.waste.length).toBe(3)

})


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
