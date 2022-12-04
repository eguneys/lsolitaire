import { Card, Stack } from './types'
import { StackPov, CardHidden } from './types'

export type DragSource = 'tableu'

export class DragPov {
  constructor(readonly cards: Array<Card>,
    readonly source: DragSource) {}
}

export class TableuPov {

  static drag_source: DragSource = 'tableu'

  static from_fen = (fen: string) => {
    let [backs, fronts] = fen.split(',')

    return new TableuPov(StackPov.from_fen(backs), Stack.from_fen(fronts))
  }

  get fen() {
    return `${this.backs.fen},${this.fronts.fen}`
  }

  constructor(readonly backs: StackPov,
    readonly fronts: Stack) {}

  cut_cards(n: number) {
    let cards = this.fronts.remove_cards(n)
    return new DragPov(cards, TableuPov.drag_source)
  }

  apply_drop_self_source(drag_pov: DragPov) {}

  cancel_drop_self_source(drag_pov: DragPov) {
    this.fronts.add_cards(drag_pov.cards)
  }

  flip_front_top(card: Card) {
    this.backs.remove_cards(1)
    this.fronts.add_cards([card])
  }

}

export class StockPov {


  static from_fen = (fen: string) => {
    let [stock, waste] = fen.split(',')

    return new StockPov(StackPov.from_fen(stock), Stack.from_fen(waste))
  }

  get fen() {
    return `${this.stock.fen},${this.waste.fen}`
  }



  constructor(
    readonly stock: StackPov,
    readonly waste: Stack) {}
}

export class SolitairePov {

  static from_fen = (fen: string) => {
    let [stock, tableus] = fen.split('//')

    return new SolitairePov(StockPov.from_fen(stock),
      tableus.split('/').map(TableuPov.from_fen))

  }

  get fen() {
    return [this.stock.fen,
      this.tableus.map(_ => _.fen).join('/')].join('//')
  }


  constructor(
    readonly stock: StockPov,
    readonly tableus: Array<TableuPov>) {
  }

}

export class Stock {

  static make = (cards: Array<Card>) => {

    let stock = Stack.take_n(cards, cards.length)
    let waste = Stack.empty

    return new Stock(stock, waste)
  }

  get pov() {
    return new StockPov(this.stock.pov, this.waste)
  }

  constructor(
    readonly stock: Stack,
    readonly waste: Stack) {}
}

export class Tableu {

  static make = (nb_backs: number, cards: Array<Card>) => {

    let backs = Stack.take_n(cards, nb_backs)
    let fronts = Stack.take_n(cards, 1)
    return new Tableu(backs, fronts)
  }

  get pov() {
    return new TableuPov(this.backs.pov, this.fronts)
  }

  constructor(readonly backs: Stack,
    readonly fronts: Stack) {}

}

export const n_seven = [...Array(7).keys()]
export class Solitaire {


  static make = (cards: Array<Card>) => {

    let tableus = n_seven.map(i => Tableu.make(i, cards)),
      stock = Stock.make(cards)

    return new Solitaire(stock, tableus)
  }

  get pov() {
    return new SolitairePov(this.stock.pov,
      this.tableus.map(_ => _.pov))
  }

  constructor(
    readonly stock: Stock,
    readonly tableus: Array<Tableu>) {}
}
