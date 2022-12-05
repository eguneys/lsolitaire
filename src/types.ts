export const suits = ['d', 'c', 'h', 's']
export const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']


export type Suit = typeof suits[number]
export type Rank = typeof ranks[number]

export type Card = `${Suit}${Rank}`


export const cards = suits.flatMap(suit => ranks.map(rank => `${suit}${rank}`))


export const card_sort_key = (card: Card) => {
  let i_suit = suits.indexOf(card[0])
  let i_rank = ranks.indexOf(card[1])
  return i_suit * 100 + i_rank
}

export class Cards {
  static get deck() { return cards.slice(0) }
}

export class Stack {

  static get empty() { return new Stack([]) }

  static take_n = (cards: Array<Card>, n: number) => new Stack(cards.splice(0, n))

  static from_fen = (fen: string) => new Stack(fen.split(' '))

  get pov() {
    return StackPov.backs(this.cards.length)
  }

  get clone() {
    return new Stack(this.cards.slice(0))
  }

  get fen() {
    return this.cards.join(' ')
  }

  get length() {
    return this.cards.length
  }


  constructor(readonly cards: Array<Card>) {}

  add_cards(cards: Array<Card>) {
    this.cards.push(...cards)
  }

  remove_cards(n: number) {
    return this.cards.splice(-n)
  }

}

export type CardHidden = '??'
export type CardPov = Card | CardHidden

export const hidden_card = '??'


export class StackPov {
  static from_fen = (fen: string) => new StackPov(fen.split(' '))

  static backs = (nb: number) => new StackPov([...Array(nb).keys()].map(_ => hidden_card))

  get fen() {
    return this.cards.join(' ')
  }

  get length() {
    return this.cards.length
  }

  constructor(readonly cards: Array<CardPov>) {}

  add_cards(cards: Array<CardPov>) {
    this.cards.push(...cards)
  }

  remove_cards(n: number) {
    return this.cards.splice(-n)
  }


}


