import { it, expect } from 'vitest'
import { Stack, Cards, Settings, IGamePov, SolitairePov, IGame } from '../src'
import { Game, Solitaire } from '../src'
import { HitStock } from '../src'


let settings: Settings = { cards: 'threecards', limit: 'nolimit' }
it('recycles', () => {

  let s = Solitaire.make(settings, Cards.deck)

  let first = s.hit_stock()
  for (let i = 0; i < 7; i++) {
    s.hit_stock()
  }
  s.recycle()
  let second = s.hit_stock()

  expect(first).toStrictEqual(second)

})


it('hit stock', () => {

  let s = Solitaire.make(settings, Cards.deck)
  let g = Game.make<SolitairePov, Solitaire>(s)

  expect(g.can_undo).toBe(false)
  expect(g.pov.score).toBe(0)
  expect(g.pov.history).toBe(0)
  expect(g.pov.can_undo).toBe(false)
  expect(g.pov.game.can_hit).toBe(true)
  expect(g.pov.game.stock.stock.length).toBe(52 - 7 - 6 - 5 - 4 - 3 -2 -1)
  expect(g.pov.game.stock.waste.length).toBe(0)

  g.apply(HitStock, undefined)

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

  let settings: Settings = { cards: 'threecards', limit: 'nolimit' }
  let s = Solitaire.make(settings, Cards.deck)
  let g = Game.make<SolitairePov, Solitaire>(s)


  let args = g.apply(HitStock, undefined)

  g.pov.game.hit_stock()

  expect(g.pov.game.stock.stock.length).toBe(52 - 7 - 6 - 5 - 4 - 3 -2 - 1 - 3)
  expect(g.pov.game.stock.waste.length).toBe(3)

})


it('stack', () => {


  let s = Stack.empty

  s.add_cards(['d8', 'd6'])

  let res = s.remove_cards(1)

  expect(res).toStrictEqual(['d6'])

})

it('works', () => {

  let settings: Settings = { cards: 'threecards', limit: 'nolimit' }
  let s = Solitaire.make(settings, Cards.deck)
  let g = Game.make<SolitairePov, Solitaire>(s)

  expect(Solitaire.from_fen(g.game.fen).fen).toBe(g.game.fen)
})
