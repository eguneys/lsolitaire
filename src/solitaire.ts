import { Card, Stack, StackPov } from './types'
import { IGamePov, IGame, IMove } from './game'

export type TurningCards = 'threecards' | 'onecard'
export type TurningLimit = 'nolimit' | 'onepass' | 'threepass'

export type Settings = {
  cards: TurningCards,
  limit: TurningLimit
}

export class Stock {

  static make = (deck: Array<Card>) => {
    return new Stock(Stack.take_n(deck, deck.length),
                     Stack.empty,
                     Stack.empty)
  }

  get pov() {
    return new StockPov(
      this.stock.pov,
      this.waste,
      this.hidden.pov)
  }

  constructor(
    readonly stock: Stack,
    readonly waste: Stack,
    readonly hidden: Stack) {}


  get can_hit() {
    return this.stock.length > 0
  }

  get can_recycle() {
    return this.stock.length === 0
  }

  hit(n: number) {
    let cards = this.stock.remove_cards(n)
    let waste = this.waste.remove_all()

    this.hidden.add_cards(waste)
    this.waste.add_cards(cards)

    return {
      waste,
      cards
    }
  }

  undo_hit(data: HitStockData) {
    let { cards, waste } = data
    let waste_to_stock = this.waste.remove_cards(cards.length)
    let hidden_to_waste = this.hidden.remove_cards(waste.length)

    this.waste.add_cards(hidden_to_waste)
    this.stock.add_cards(waste_to_stock)
  }

  recycle() {
    let waste = this.waste.remove_all()
    this.hidden.add_cards(waste)
    this.stock.add_cards(this.hidden.remove_all())

    return {
      waste
    }
  }

  undo_recycle(args: RecycleData) {
    let { waste } = args
    this.hidden.add_cards(this.stock.remove_all())
    let hidden_to_waste = this.hidden.remove_cards(waste.length)
    this.waste.add_cards(hidden_to_waste)
  }
}

export class Tableu {
  static make = (deck: Array<Card>, n: number) => {
    return new Tableu(Stack.take_n(deck, n),
                      Stack.take_n(deck, 1))
  }


  get pov() {
    return new TableuPov(
      this.back.pov,
      this.front)
  }

  constructor(readonly back: Stack,
              readonly front: Stack) {}


  from_tableu(i: number) {
    let cards = this.front.remove_cards(i)
    if (this.front.length === 0) {
      let [flip] = this.back.remove_cards(1)
      this.front.add_cards([flip])
      return {
        flip,
        cards
      }
    }
    return { cards }
  }

  undo_from_tableu(i: number, res: TableuToTableuDataRes) {
    if (res.flip) {
      let flip = this.front.remove_cards(1)
      this.back.add_cards(flip)
    }
    this.front.add_cards(res.cards)
  }


  to_tableu(cards: Array<Card>) {
    this.front.add_cards(cards)
  }


  undo_to_tableu(cards: Array<Card>) {
    this.front.remove_cards(cards.length)
  }
}

export class Foundation {
  static make = () => {
    return new Foundation(Stack.empty)
  }
  constructor(readonly foundation: Stack) {}
}

const n_seven = [...Array(7).keys()]
const n_four = [...Array(4).keys()]

export class Solitaire implements IGame {

  static make = (settings: Settings,
                 deck: Array<Card>) => {

    let tableus = n_seven.map(i => Tableu.make(deck, i))
    let stock = Stock.make(deck)

    return new Solitaire(settings,
                         stock,
                         tableus,
                         n_four.map(i => Foundation.make()))

  }

  get hit_n() {
    return this.settings.cards === 'threecards' ? 3 : 1
  }

  get pov() {

    return new SolitairePov(
      this.settings,
      this.stock.pov,
      this.tableus.map(_ => _.pov),
      this.foundations)
  }
 
  constructor(
    readonly settings: Settings,
    readonly stock: Stock,
    readonly tableus: Array<Tableu>,
    readonly foundations: Array<Foundation>) {}

  get can_hit() {
    return this.stock.can_hit
  }

  get can_recycle() {
    return this.stock.can_recycle
  }

  hit_stock() {
    return this.stock.hit(this.hit_n)
  }

  undo_hit_stock(data: HitStockData) {
    this.stock.undo_hit(data)
  }


  recycle() {
    return this.stock.recycle()
  }

  undo_recycle(data: RecycleData) {
    this.stock.undo_recycle(data)
  }

  tableu_to_tableu(data: TableuToTableuData) {
    let { from, to, i } = data
    let res = this.tableus[from].from_tableu(i)
    this.tableus[to].to_tableu(res.cards)
    return res
  }

  undo_tableu_to_tableu(data: TableuToTableuData, res: TableuToTableuDataRes) {
    let { from, to, i } = data
    this.tableus[to].undo_to_tableu(res.cards)
    this.tableus[from].undo_from_tableu(i, res)
  }

}

export type HitStockData = {
  cards: Array<Card>,
  waste: Array<Card>
}

export class HitStock extends IMove<Solitaire> {

  get solitaire() {
    return this.game
  }
  data!: HitStockData

  apply() {
    this.data = this.solitaire.hit_stock()
    return 0
  }

  undo() {
    this.solitaire.undo_hit_stock(this.data)
    return -80
  }

}


export type RecycleData = {
  waste: Array<Card>
}

export class Recycle extends IMove<Solitaire> {

  get solitaire() {
    return this.game
  }
  data!: RecycleData

  apply() {
    this.data = this.solitaire.recycle()
    return -15
  }

  undo() {
    this.solitaire.undo_recycle(this.data)
    return -80
  }

}


export type TableuToTableuData = {
  from: number,
  i: number,
  to: number
}

export type TableuToTableuDataRes = {
  cards: Array<Card>,
  flip?: Card
}

export class TableuToTableu extends IMove<Solitaire> {

  get solitaire() {
    return this.game
  }

  get data() {
    return this._data as TableuToTableuData
  }

  res!: TableuToTableuDataRes

  apply() {
    this.res = this.solitaire.tableu_to_tableu(this.data)
    if (this.res.flip) {
      return 10
    }
    return 0
  }

  undo() {
    this.solitaire.undo_tableu_to_tableu(this.data, this.res)
    return -80
  }

}


export class StockPov {

  get can_hit() {
    return this.stock.length > 0
  }

  get can_recycle() {
    return this.stock.length === 0
  }

  constructor(
    readonly stock: StackPov,
    readonly waste: Stack,
    readonly hidden: StackPov) {}


  hit(n: number) {
    let cards = this.stock.remove_cards(n)
    let waste = this.waste.remove_all()

    this.hidden.add_cards(waste)
    this.waste.add_cards(cards)
  }

  undo_hit(data: HitStockData) {
    let { cards, waste } = data
    this.waste.remove_cards(cards.length)
    this.hidden.remove_cards(waste.length)

    this.waste.add_cards(waste)
    this.stock.add_cards(cards)
  }


  recycle() {
    let waste = this.waste.remove_all()
    this.hidden.add_cards(waste)
    this.stock.add_cards(this.hidden.remove_all())

    return {
      waste
    }
  }

  undo_recycle(args: RecycleData) {
    let { waste } = args
    this.hidden.add_cards(this.stock.remove_all())
    let hidden_to_waste = this.hidden.remove_cards(waste.length)
    this.waste.add_cards(hidden_to_waste)
  }

}

export class TableuPov {

  constructor(readonly back: StackPov,
              readonly front: StackPov) {}

  can_from(i: number) {
    let front = this.front.clone
    let back = this.back.clone

    let cards = front.remove_cards(i)
    if (cards.length === i) {
      if (front.length === 0) {
        let [flip] = back.remove_cards(1)
        return {
          cards,
          flip
        }
      }
      return {
        cards
      }
    }
    return undefined
  }

  can_to(res: TableuToTableuDataRes) {
    let { cards } = res
    let top = cards[0]

    if (!top) {
      return false
    }
    return true
  }
}


export class SolitairePov implements IGamePov {

  get recycle_n() {
    return this.settings.limit === 'nolimit' ? 9999 : this.settings.limit === 'threepass' ? 3 : 1
  }

  get hit_n() {
    return this.settings.cards === 'threecards' ? 3 : 1
  }

  get has_recycle_limit() {
    return this.recycle_n - this.nb_recycles > 0
  }

  get can_hit() {
    return this.stock.can_hit
  }

  get can_recycle() {
    return this.has_recycle_limit && this.stock.can_recycle
  }

  can_tableu_to_tableu(data: TableuToTableuData) {
    let { from, to, i } = data
    let can_from = this.tableus[from].can_from(i)
    if (!can_from) {
      return false
    }
    return this.tableus[to].can_to(can_from)
  }

  hit_stock() {
    return this.stock.hit(this.hit_n)
  }

  undo_hit_stock(data: HitStockData) {
    this.stock.undo_hit(data)
  }

  recycle() {
    this.nb_recycles++;
    return this.stock.recycle()
  }

  undo_recycle(data: RecycleData) {
    this.nb_recycles--;
    this.stock.undo_recycle(data)
  }

  nb_recycles = 0

  constructor(
    readonly settings: Settings,
    readonly stock: StockPov,
    readonly tableus: Array<TableuPov>,
    readonly foundations: Array<Foundation>) {}

}
