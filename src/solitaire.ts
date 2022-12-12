import { Card, Stack } from './types'
import { StackPov, CardHidden } from './types'

export enum TurningCards {
  ThreeCards = 'threecards',
  OneCard = 'onecard'
}

export enum TurningLimit {
  NoLimit = 'nolimit',
  ThreePasses = 'threepass',
  OnePass = 'onepass'
}

export type Settings = {
  cards: TurningCards,
  limit: TurningLimit
}

const settings_fen = (settings: Settings) => `${settings.cards} ${settings.limit}`
const fen_settings = (fen: string) => {
  let [cards, limit] = fen.split(' ') as [TurningCards, TurningLimit]
  return {
    cards,
    limit
  }
}

export type FlipFront = {
  drag_tableu: number,
  front: Card
}

export class TableuPov {

  static from_fen = (fen: string) => {
    let [backs, fronts] = fen.split(',')

    return new TableuPov(StackPov.from_fen(backs), Stack.from_fen(fronts))
  }

  get fen() {
    return `${this.backs.fen},${this.fronts.fen}`
  }

  constructor(readonly backs: StackPov,
    readonly fronts: Stack) {}

  add_cards(cards: Array<Card>) {
    this.fronts.add_cards(cards)
  }

  remove_cards(n: number) {
    return this.fronts.remove_cards(n)
  }

  flip_front(card: Card) {
    this.backs.remove_cards(1)
    this.fronts.add_cards([card])
  }

  can_drag(i: number) {
    // TODO
    return true
  }

  can_drop(drag: DragPov) {
    // TODO
    return true
  }


  drop(drag: DragPov) {
    this.fronts.add_cards(drag.cards)
  }

  wait_drop() {

    // TODO
  }

}

export class StockPov {


  static from_fen = (fen: string) => {
    let [stock, waste, waste_hidden] = fen.split(',')

    return new StockPov(StackPov.from_fen(stock), Stack.from_fen(waste), Stack.from_fen(waste_hidden))
  }

  get fen() {
    return `${this.stock.fen},${this.waste.fen},${this.waste_hidden.fen}`
  }



  constructor(
    readonly stock: StackPov,
    readonly waste: Stack,
    readonly waste_hidden: Stack) {}

  get can_hit() {
    return this.stock.length > 0
  }

  get can_recycle() {
    return this.stock.length === 0 && this.waste.length > 0
  }


  wait_hit() { }

  wait_recycle() {}

  hit(cards: Array<Card>) {
    this.stock.remove_cards(cards.length)
    let waste = this.waste.remove_cards(this.waste.length)
    this.waste_hidden.add_cards(waste)
    this.waste.add_cards(cards)
  }


  recycle() {
    let waste = this.waste.remove_cards(this.waste.length)
    this.waste_hidden.add_cards(waste)
    let cards = this.waste_hidden.remove_cards(this.waste_hidden.length)
    this.stock.add_cards(cards)
  }
}

export type DragPov = {
  source: DragSource,
  cards: Array<Card>
}

export type DragSource = ['tableu', number, number]

export class DragSources {
  static tableu = (tableu: number, i: number): DragSource => ['tableu', tableu, i]
}

export class SolitairePov {

  static from_fen = (fen: string) => {
    let [settings, nb_recycles, stock, tableus] = fen.split('//')

    return new SolitairePov(fen_settings(settings),
                            parseInt(nb_recycles),
                            StockPov.from_fen(stock),
      tableus.split('/').map(TableuPov.from_fen))

  }

  get fen() {
    return [settings_fen(this.settings), 
      this.nb_recycles,
      this.stock.fen,
      this.tableus.map(_ => _.fen).join('/')].join('//')
  }

  dragging?: DragPov

  nb_recycles: number

  constructor(
    readonly settings: Settings,
    nb_recycles: number,
    readonly stock: StockPov,
    readonly tableus: Array<TableuPov>) {
      this.nb_recycles = nb_recycles
  }

  get max_recycles() {
    switch (this.settings.limit) {
      case TurningLimit.NoLimit:
        return 9999
      case TurningLimit.ThreePasses:
        return 3
      case TurningLimit.OnePass:
        return 1
    }
    return 1
  }

  get can_hit_stock() {
    return this.stock.can_hit
  }

  get can_recycle() {
    return this.nb_recycles < this.max_recycles && this.stock.can_recycle
  }

  get recycles_left() {
    return this.max_recycles - this.nb_recycles
  }

  can_drop_tableu(tableu: number) {
    if (!this.dragging) {
      return false
    }
    return this.tableus[tableu].can_drop(this.dragging)
  }

  drop_tableu(tableu: number) {
    this.tableus[tableu].drop(this.dragging!)
    this.dragging = undefined
  }

  flip_front(tableu: number, front: Card) {
    this.tableus[tableu].flip_front(front)
  }

  cancel_drag() {
    if (!this.dragging) {
      return
    }

    let [source, n, i] = this.dragging.source

    switch (source) {
      case 'tableu':
        this.tableus[n].add_cards(this.dragging.cards)
        break
    }

    this.dragging = undefined
  }

  wait_drop_tableu(tableu: number) {
    this.tableus[tableu].wait_drop()
  }

  can_drag_tableu(tableu: number, i: number) {
    return this.tableus[tableu].can_drag(i)
  }

  drag_tableu(tableu: number, i: number) {
    let cards = this.tableus[tableu].remove_cards(i)

    this.dragging = {
      source: DragSources.tableu(tableu, i),
      cards
    }
  }

  hit_stock(cards: Array<Card>) {
    this.stock.hit(cards)
  }

  wait_hit_stock() {
    this.stock.wait_hit()
  }

  recycle() {
    this.nb_recycles++
    this.stock.recycle()
  }

  wait_recycle() {
    this.stock.wait_recycle()
  }

}

export class Stock {

  static from_fen = (fen: string) => {
    let [stock, waste, waste_hidden] = fen.split(',')

    return new Stock(Stack.from_fen(stock), Stack.from_fen(waste), Stack.from_fen(waste_hidden))
  }


  static make = (cards: Array<Card>) => {

    let stock = Stack.take_n(cards, cards.length)
    let waste = Stack.empty
    let waste_hidden = Stack.empty

    return new Stock(stock, waste,waste_hidden)
  }

  get fen() {
    return `${this.stock.fen},${this.waste.fen},${this.waste_hidden.fen}`
  }

  get pov() {
    return new StockPov(this.stock.clone, this.waste.clone, this.waste_hidden.clone)
  }

  constructor(
    readonly stock: Stack,
    readonly waste: Stack,
    readonly waste_hidden: Stack) {}


  hit(n: number) {
    let waste = this.waste.remove_cards(this.waste.length)
    this.waste_hidden.add_cards(waste)
    let cards = this.stock.remove_cards(n)
    this.waste.add_cards(cards)
    return cards
  }

  recycle() {
    let waste = this.waste.remove_cards(this.waste.length)
    this.waste_hidden.add_cards(waste)
    let cards = this.waste_hidden.remove_cards(this.waste_hidden.length)
    this.stock.add_cards(cards)
  }
}

export class Tableu {

  static from_fen = (fen: string) => {
    let [backs, fronts] = fen.split(',')

    return new Tableu(Stack.from_fen(backs), Stack.from_fen(fronts))
  }



  static make = (nb_backs: number, cards: Array<Card>) => {
    let backs = Stack.take_n(cards, nb_backs)
    let fronts = Stack.take_n(cards, 1)
    return new Tableu(backs, fronts)
  }

  get fen() {
    return `${this.backs.fen},${this.fronts.fen}`
  }

  get pov() {
    return new TableuPov(this.backs.pov, this.fronts.clone)
  }

  add_cards(cards: Array<Card>) {
    this.fronts.add_cards(cards)
  }

  remove_cards(n: number) {
    this.fronts.remove_cards(n)
  }

  flip_front() {
    if (this.fronts.length === 0) {
      if (this.backs.length > 0) {
        let card = this.backs.remove_cards(1)
        this.fronts.add_cards(card)
        return card[0]
      }
    }
    return undefined
  }

  constructor(readonly backs: Stack,
    readonly fronts: Stack) {}

}

export const n_seven = [...Array(7).keys()]
export class Solitaire {


  static from_fen = (fen: string) => {
    let [settings, recycles, stock, tableus] = fen.split('//')

    return new Solitaire(fen_settings(settings),
                         parseInt(recycles),
                         Stock.from_fen(stock),
      tableus.split('/').map(Tableu.from_fen))

  }



  static make = (settings: Settings,
                 cards: Array<Card>) => {

    let tableus = n_seven.map(i => Tableu.make(i, cards)),
      stock = Stock.make(cards)

    return new Solitaire(settings,
                         0,
                         stock, tableus)
  }


  get fen() {
    return [
      settings_fen(this.settings),
      this.nb_recycles,
      this.stock.fen,
      this.tableus.map(_ => _.fen).join('/')].join('//')
  }

  get pov() {
    return new SolitairePov(this.settings,
                            this.nb_recycles,
                            this.stock.pov,
      this.tableus.map(_ => _.pov))
  }

  drop_tableu(drag: DragPov, tableu: number) {
    this.tableus[tableu].add_cards(drag.cards)

    let { source: _source, cards } = drag
    let [source, n, i] = _source

    switch (source) {
      case 'tableu':
        this.tableus[n].remove_cards(cards.length)
        let front = this.tableus[n].flip_front()

        if (front) {
          return {
            drag_tableu: n,
            front
          }
        }
        break
    }
    return undefined
  }

  hit_stock() {
    let n = this.settings.cards === TurningCards.ThreeCards ? 3 : 1
    return this.stock.hit(n)
  }

  recycle() {
    this.nb_recycles++
    return this.stock.recycle()
  }

  nb_recycles: number

  constructor(
    readonly settings: Settings,
    nb_recycles: number,
    readonly stock: Stock,
    readonly tableus: Array<Tableu>) {
    
      this.nb_recycles = nb_recycles
    }
}
