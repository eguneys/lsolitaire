import { suits, Suit, ranks_ace_through_king, is_red_black, is_king, is_ace } from './types'
import { Card, Stack, StackPov } from './types'
import { IGamePov, IGame, IMove } from './game'

export const Scores = {
  Recycle: -10,
  HitStock: 0,
  WasteToTableu: 10,
  WasteToFoundation: 30,
  TableuToFoundation: 20,
  FoundationToTableu: -30,
  Undo: -80,
  TableuToTableuFlip: 10,
  TableuToTableuNoFlip: 0,

}

export type TurningCards = 'threecards' | 'onecard'
export type TurningLimit = 'nolimit' | 'onepass' | 'threepass'

export type Settings = {
  cards: TurningCards,
  limit: TurningLimit
}

function settings_from_fen(fen: string): Settings {
  let [cards, limit] = fen.split('$') as [TurningCards, TurningLimit]

  return {
    cards, limit
  }
}

function settings_to_fen(settings: Settings) {
  return [settings.cards, settings.limit].join('$')
}

export class Stock {

  static from_fen = (fen: string) => {
    let [_stock, _waste, _hidden] = fen.split('$')

    let stock = Stack.from_fen(_stock)
    let waste = Stack.from_fen(_waste)
    let hidden = Stack.from_fen(_hidden)

    return new Stock(stock, waste, hidden)
  }

  static make = (deck: Array<Card>) => {
    return new Stock(Stack.take_n(deck, deck.length),
                     Stack.empty,
                     Stack.empty)
  }

  get fen() {
    return [this.stock.fen, this.waste.fen, this.hidden.fen].join('$')
  }

  get pov() {
    return new StockPov(
      this.stock.hidden_pov,
      this.waste,
      this.hidden.hidden_pov)
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

  from_waste() {
    let cards = this.waste.remove_cards(1)
    return {
      cards
    }
  }

  undo_from_waste(cards: Array<Card>) {
    this.waste.add_cards(cards)
  }

  hit(n: number) {
    let cards = this.stock.remove_cards(n)
    let waste = this.waste.remove_all()

    this.hidden.unshift_cards(waste)
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
    this.stock.unshift_cards(this.hidden.remove_all())

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

  static from_fen = (fen: string) => {
    let [back, front] = fen.split('$')
    return new Tableu(Stack.from_fen(back), Stack.from_fen(front))
  }

  
  static make = (deck: Array<Card>, n: number) => {
    return new Tableu(Stack.take_n(deck, n),
                      Stack.take_n(deck, 1))
  }

  get fen() {
    return [this.back.fen, this.front.fen].join('$')
  }

  get pov() {
    return new TableuPov(
      this.back.hidden_pov,
      this.front)
  }

  constructor(readonly back: Stack,
              readonly front: Stack) {}


  from_tableu(i: number) {
    let cards = this.front.remove_cards(i)
    if (this.front.length === 0) {
      let [flip] = this.back.remove_cards(1)
      if (flip) {
        this.front.add_cards([flip])
        return {
          flip,
          cards
        }
      } else {
        return {
          cards
        }
      }
    }
    return { cards }
  }

  undo_from_tableu(res: TableuToTableuDataRes) {
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

  static from_fen = (fen: string) => {
    let foundation = fen

    return new Foundation(Stack.from_fen(foundation))
  }

  get fen() {
    return this.foundation.fen
  }


  static make = () => {
    return new Foundation(Stack.empty)
  }

  get clone() {
    return new Foundation(this.foundation.clone)
  }

  get suit() {
    return this.foundation.top_card?.[0]
  }

  constructor(readonly foundation: Stack) {}
  get next_top() {
    if (!this.suit) {
      return undefined
    }
    let suit = this.suit
    let rank = ranks_ace_through_king[this.foundation.length]
    return `${suit}${rank}`
  }

  get can_from() {
    let { top_card } = this.foundation
    if (top_card) {
      return {
        cards: [top_card]
      }
    }
    return undefined
  }

  can_to(cards: Array<Card>) {
    let [top] = cards
    return cards.length === 1 &&
      (this.next_top ? top === this.next_top : is_ace(top))
  }

  to_foundation(cards: Array<Card>) {
    this.foundation.add_cards(cards)
  }

  undo_to_foundation(cards: Array<Card>) {
    this.foundation.remove_cards(cards.length)
  }

  from_foundation() {
    return {
      cards: this.foundation.remove_cards(1)
    }
  }

  undo_from_foundation(cards: Array<Card>) {
    this.foundation.add_cards(cards)
  }
}

export const n_seven = [...Array(7).keys()]
export const n_four = [...Array(4).keys()]

export class Solitaire implements IGame<SolitairePov> {

  static from_fen = (fen: string) => {

    let [_settings, _nb_recycles, _stock, _tableus, _suits] = fen.split(' ')

    let settings = settings_from_fen(_settings)
    let nb_recycles = parseInt(_nb_recycles)
    let stock = Stock.from_fen(_stock)
    let tableus = _tableus.split('/').map(tableu => Tableu.from_fen(tableu))
    let suits = _suits.split('/').map(suit => Foundation.from_fen(suit))

    return new Solitaire(settings,
      nb_recycles,
      stock,
      tableus,
      suits)
  }

  get fen() {

    let settings = settings_to_fen(this.settings)
    let stock = this.stock.fen
    let tableus = this.tableus.map(_ => _.fen).join('/')
    let suits = this.foundations.map(_ => _.fen).join('/')
    let nb_recycles = this.nb_recycles

    return [settings, nb_recycles, stock, tableus, suits].join(' ')
  }


  static make = (settings: Settings,
                 deck: Array<Card>) => {

    let tableus = n_seven.map(i => Tableu.make(deck, i))
    let stock = Stock.make(deck)
    let nb_recycles = 0

    return new Solitaire(settings,
                         nb_recycles,
                         stock,
                         tableus,
                         suits.map(suit => Foundation.make()))

  }

  get hit_n() {
    return this.settings.cards === 'threecards' ? 3 : 1
  }

  get pov() {

    return new SolitairePov(
      this.settings,
      this.nb_recycles,
      this.stock.pov,
      this.tableus.map(_ => _.pov),
      this.foundations)
  }
 
  constructor(
    readonly settings: Settings,
    public nb_recycles: number,
    readonly stock: Stock,
    readonly tableus: Array<Tableu>,
    readonly foundations: Array<Foundation>) {}

  get recycle_n() {
    return this.settings.limit === 'nolimit' ? 9999 : this.settings.limit === 'threepass' ? 3 : 1
  }

  get can_hit() {
    return this.stock.can_hit
  }

  get can_recycle() {
    return this.has_recycle_limit && this.stock.can_recycle
  }

  get has_recycle_limit() {
    return this.recycle_n - this.nb_recycles > 0
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

  tableu_to_tableu(data: TableuToTableuData) {
    let { from, to, i } = data
    let res = this.tableus[from].from_tableu(i)
    this.tableus[to].to_tableu(res.cards)
    return res
  }

  undo_tableu_to_tableu(data: TableuToTableuData, res: TableuToTableuDataRes) {
    let { from, to, i } = data
    this.tableus[to].undo_to_tableu(res.cards)
    this.tableus[from].undo_from_tableu(res)
  }

  waste_to_tableu(data: WasteToTableuData) {
    let { to } = data
    let res = this.stock.from_waste()
    this.tableus[to].to_tableu(res.cards)
    return res
  }

  undo_waste_to_tableu(data: WasteToTableuData, res: WasteToTableuDataRes) {
    let { to } = data

    this.tableus[to].undo_to_tableu(res.cards)
    this.stock.undo_from_waste(res.cards)
  }

  waste_to_foundation(data: WasteToFoundationData) {
    let { to } = data
    let res = this.stock.from_waste()
    this.foundations[to].to_foundation(res.cards)
    return res
  }

  undo_waste_to_foundation(data: WasteToFoundationData, res: WasteToFoundationDataRes) {
    let { to } = data

    this.foundations[to].undo_to_foundation(res.cards)
    this.stock.undo_from_waste(res.cards)
  }


  tableu_to_foundation(data: TableuToFoundationData) {
    let { from, to } = data
    let res = this.tableus[from].from_tableu(1)
    this.foundations[to].to_foundation(res.cards)
    return res
  }

  undo_tableu_to_foundation(data: TableuToFoundationData, res: TableuToFoundationDataRes) {
    let { from, to } = data

    this.foundations[to].undo_to_foundation(res.cards)
    this.tableus[from].undo_from_tableu(res)
  }


  foundation_to_tableu(data: FoundationToTableuData) {
    let { from, to } = data
    let res = this.foundations[from].from_foundation()
    this.tableus[to].to_tableu(res.cards)
    return res
  }

  undo_foundation_to_tableu(data: FoundationToTableuData, res: FoundationToTableuDataRes) {
    let { from, to } = data

    this.tableus[to].undo_to_tableu(res.cards)
    this.foundations[from].undo_from_foundation(res.cards)
  }
}

export type HitStockData = {
  cards: Array<Card>,
  waste: Array<Card>
}

export class HitStock extends IMove<SolitairePov, Solitaire> {


  get solitaire() {
    return this.game
  }
  data!: HitStockData

  static can = (pov: SolitairePov) => {
    return pov.can_hit
  }

  apply() {
    this.data = this.solitaire.hit_stock()
    return Scores.HitStock
  }

  undo() {
    this.solitaire.undo_hit_stock(this.data)
    return Scores.Undo
  }

  static apply = (pov: SolitairePov) => {
    pov.hit_stock()
  }

  undo_pov(pov: SolitairePov) {
    pov.undo_hit_stock(this.data)
  }


}


export type RecycleData = {
  waste: Array<Card>
}

export class Recycle extends IMove<SolitairePov, Solitaire> {

  get solitaire() {
    return this.game
  }
  data!: RecycleData

  static can = (pov: SolitairePov) => {
    return pov.can_recycle
  }

  apply() {
    this.data = this.solitaire.recycle()
    return Scores.Recycle
  }

  undo() {
    this.solitaire.undo_recycle(this.data)
    return Scores.Undo
  }

  static apply = (pov: SolitairePov) => {
    pov.recycle()
  }

  undo_pov(pov: SolitairePov) {
    pov.undo_recycle(this.data)
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

export class TableuToTableu extends IMove<SolitairePov, Solitaire> {

  get solitaire() {
    return this.game
  }

  get data() {
    return this._data as TableuToTableuData
  }

  static can = (pov: SolitairePov, data: TableuToTableuData) => {
    let from = data
    let can_from = pov.can_drag_tableu(from)

    if (!can_from) {
      return false
    }
    return pov.can_drop_tableu({ ...data, ...can_from } )
  }

  res!: TableuToTableuDataRes

  apply() {
    this.res = this.solitaire.tableu_to_tableu(this.data)
    if (this.res.flip) {
      return Scores.TableuToTableuFlip
    }
    return Scores.TableuToTableuNoFlip
  }

  undo() {
    this.solitaire.undo_tableu_to_tableu(this.data, this.res)
    return Scores.Undo
  }


  static apply = (pov: SolitairePov, data: any) => {
    pov.tableu_to_tableu(data)
  }

  undo_pov(pov: SolitairePov) {
    pov.undo_tableu_to_tableu(this.data, this.res)
  }


}

export type WasteToTableuData = {
  to: number
}
export type WasteToTableuDataRes = {
  cards: Array<Card>
}

export class WasteToTableu extends IMove<SolitairePov, Solitaire> {

  get solitaire() {
    return this.game
  }

  get data() {
    return this._data as WasteToTableuData
  }

  res!: WasteToTableuDataRes

  static can =(pov: SolitairePov, data: WasteToTableuData) => {
    let from = data
    const can_from = pov.can_drag_waste

    if (!can_from) {
      return false
    }
    return pov.can_drop_tableu({ ...data, ...can_from})
  }

  apply() {
    this.res = this.solitaire.waste_to_tableu(this.data)
    return Scores.WasteToTableu
  }

  undo() {
    this.solitaire.undo_waste_to_tableu(this.data, this.res)
    return Scores.Undo
  }


  static apply = (pov: SolitairePov, data: any) => {
    pov.waste_to_tableu(data)
  }

  undo_pov(pov: SolitairePov) {
    pov.undo_waste_to_tableu(this.data, this.res)
  }




}

export type WasteToFoundationData = {
  to: number
}
export type WasteToFoundationDataRes = {
  cards: Array<Card>
}

export class WasteToFoundation extends IMove<SolitairePov, Solitaire> {

  get solitaire() {
    return this.game
  }

  get data() {
    return this._data as WasteToFoundationData
  }

  res!: WasteToFoundationDataRes


  static can = (pov: SolitairePov, data: WasteToFoundationData) => {
    let from = data
    const can_from = pov.can_drag_waste

    if (!can_from) {
      return false
    }
    return pov.can_drop_foundation({ ...data, ...can_from})
  }



  apply() {
    this.res = this.solitaire.waste_to_foundation(this.data)
    return Scores.WasteToFoundation
  }

  undo() {
    this.solitaire.undo_waste_to_foundation(this.data, this.res)
    return Scores.Undo
  }


  static apply = (pov: SolitairePov, data: any)  => {
    pov.waste_to_foundation(data)
  }

  undo_pov(pov: SolitairePov) {
    pov.undo_waste_to_foundation(this.data, this.res)
  }



}


export type TableuToFoundationData = {
  from: number,
  to: number
}
export type TableuToFoundationDataRes = {
  cards: Array<Card>,
  flip?: Card
}

export class TableuToFoundation extends IMove<SolitairePov, Solitaire> {

  get solitaire() {
    return this.game
  }

  get data() {
    return this._data as TableuToFoundationData
  }

  res!: TableuToFoundationDataRes

  static can =(pov: SolitairePov, data: TableuToFoundationData) => {
    let from = data
    const can_from = pov.can_drag_tableu({ ...data, i: 1 })

    if (!can_from) {
      return false
    }
    return pov.can_drop_foundation({ ...data, ...can_from})
  }

  apply() {
    this.res = this.solitaire.tableu_to_foundation(this.data)
    return Scores.TableuToFoundation
  }

  undo() {
    this.solitaire.undo_tableu_to_foundation(this.data, this.res)
    return Scores.Undo
  }


  static apply = (pov: SolitairePov, data: any) => {
    pov.tableu_to_foundation(data)
  }

  undo_pov(pov: SolitairePov) {
    pov.undo_tableu_to_foundation(this.data, this.res)
  }



}



export type FoundationToTableuData = {
  from: number,
  to: number
}
export type FoundationToTableuDataRes = {
  cards: Array<Card>
}



export class FoundationToTableu extends IMove<SolitairePov, Solitaire> {

  get solitaire() {
    return this.game
  }

  get data() {
    return this._data as FoundationToTableuData
  }

  res!: FoundationToTableuDataRes

  static can = (pov: SolitairePov, data: FoundationToTableuData) => {
    let from = data
    const can_from = pov.can_drag_foundation(data)

    if (!can_from) {
      return false
    }
    return pov.can_drop_tableu({ ...data, ...can_from})

  }

  apply() {
    this.res = this.solitaire.foundation_to_tableu(this.data)
    return Scores.FoundationToTableu
  }

  undo() {
    this.solitaire.undo_foundation_to_tableu(this.data, this.res)
    return Scores.Undo
  }


  static apply = (pov: SolitairePov, data: any) => {
    pov.foundation_to_tableu(data)
  }

  undo_pov(pov: SolitairePov) {
    pov.undo_foundation_to_tableu(this.data, this.res)
  }


}

export class StockPov {

  pov_hit_stock(cards: string[]) {
    this.waste.remove_cards(cards.length)
    this.waste.add_cards(cards)
  }

  get can_hit() {
    return this.stock.length > 0
  }

  get can_recycle() {
    return this.stock.length === 0
  }


  get can_from_waste() {
    let { top_card } = this.waste
    if (top_card) {
      return {
        cards: [top_card]
      }
    }
    return undefined
  }

  get clone() {
    return new StockPov(
      this.stock.clone,
      this.waste.clone,
      this.hidden.clone)
  }

  constructor(
    readonly stock: StackPov,
    readonly waste: Stack,
    readonly hidden: StackPov) {}


  from_waste() {
    let cards = this.waste.remove_cards(1)
    return {
      cards
    }
  }

  undo_from_waste(cards: Array<Card>) {
    this.waste.add_cards(cards)
  }

 
  hit(n: number) {
    let cards = this.stock.remove_cards(n)
    let waste = this.waste.remove_all()

    this.hidden.unshift_cards(waste)
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
    this.stock.unshift_cards(this.hidden.remove_all())

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

  pov_flip(flip: string) {
    this.front.remove_cards(1)
    this.front.add_cards([flip])
  }

  get clone() {
    return new TableuPov(
      this.back.clone,
      this.front.clone)
  }

  constructor(readonly back: StackPov,
              readonly front: StackPov) {}

  can_from(i: number) {
    let front = this.front.clone
    let back = this.back.clone

    let cards = front.remove_cards(i)
    if (cards.length === i) {
      return {
        cards
      }
    }
    return undefined
  }

  can_to(cards: Array<Card>) {
    let top = cards[0]

    if (!top) {
      return false
    }


    if (this.front.length > 0) {
      return is_red_black(top, this.front.top_card)
    } else {
      return is_king(top)
    }
  }



  from_tableu(i: number) {
    let cards = this.front.remove_cards(i)
    if (this.front.length === 0) {
      let [flip] = this.back.remove_cards(1)
      if (flip) {
        this.front.add_cards([flip])
        return {
          flip,
          cards
        }
      } else {
        return { cards }
      }
    }
    return { cards }
  }

  undo_from_tableu(res: TableuToTableuDataRes) {
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

export type FromFoundationData = {
  from: number
}


export type FromTableuData = {
  from: number,
  i: number
}

export type ToTableuData = {
  to: number,
  cards: Array<Card>
}

export type ToFoundationData = {
  to: number,
  cards: Array<Card>
}

export class SolitairePov implements IGamePov {

  get clone(): SolitairePov {
    return new SolitairePov(
      this.settings,
      this.nb_recycles,
      this.stock.clone,
      this.tableus.map(_ => _.clone),
      this.foundations.map(_ => _.clone))
  }

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

  can_drag_tableu(data: FromTableuData) {
    let { from, i } = data
    let can_from = this.tableus[from].can_from(i)
    return can_from
  }

  can_drop_tableu(data: ToTableuData) {

    let { to, cards } = data
    return this.tableus[to].can_to(cards)
  }

  can_drop_foundation(data: ToFoundationData) {
    let { to, cards } = data
    return this.foundations[to].can_to(cards)
  }

  get can_drag_waste() {
    return this.stock.can_from_waste
  }

  can_drag_foundation(data: FromFoundationData) {
    let { from } = data
    let can_from = this.foundations[from].can_from
    return can_from

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

  constructor(
    readonly settings: Settings,
    public nb_recycles: number,
    readonly stock: StockPov,
    readonly tableus: Array<TableuPov>,
    readonly foundations: Array<Foundation>) {}

  finalize_apply_pov(res: IMove<this, IGame<this>>) {
    if (res instanceof TableuToTableu && res.res.flip) {
        let { from } = res.data

        this.tableus[from].pov_flip(res.res.flip)
    }
    if (res instanceof TableuToFoundation && res.res.flip) {
      let { from } = res.data

       this.tableus[from].pov_flip(res.res.flip)
    }
    if (res instanceof HitStock) {
      this.stock.pov_hit_stock(res.data.cards)
    }
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
    this.tableus[from].undo_from_tableu(res)
  }

  waste_to_tableu(data: WasteToTableuData) {
    let { to } = data
    let res = this.stock.from_waste()
    this.tableus[to].to_tableu(res.cards)
    return res
  }

  undo_waste_to_tableu(data: WasteToTableuData, res: WasteToTableuDataRes) {
    let { to } = data

    this.tableus[to].undo_to_tableu(res.cards)
    this.stock.undo_from_waste(res.cards)
  }

  waste_to_foundation(data: WasteToFoundationData) {
    let { to } = data
    let res = this.stock.from_waste()
    this.foundations[to].to_foundation(res.cards)
    return res
  }

  undo_waste_to_foundation(data: WasteToFoundationData, res: WasteToFoundationDataRes) {
    let { to } = data

    this.foundations[to].undo_to_foundation(res.cards)
    this.stock.undo_from_waste(res.cards)
  }


  tableu_to_foundation(data: TableuToFoundationData) {
    let { from, to } = data
    let res = this.tableus[from].from_tableu(1)
    this.foundations[to].to_foundation(res.cards)
    return res
  }

  undo_tableu_to_foundation(data: TableuToFoundationData, res: TableuToFoundationDataRes) {
    let { from, to } = data

    this.foundations[to].undo_to_foundation(res.cards)
    this.tableus[from].undo_from_tableu(res)
  }


  foundation_to_tableu(data: FoundationToTableuData) {
    let { from, to } = data
    let res = this.foundations[from].from_foundation()
    this.tableus[to].to_tableu(res.cards)
    return res
  }

  undo_foundation_to_tableu(data: FoundationToTableuData, res: FoundationToTableuDataRes) {
    let { from, to } = data

    this.tableus[to].undo_to_tableu(res.cards)
    this.foundations[from].undo_from_foundation(res.cards)
  }

}
