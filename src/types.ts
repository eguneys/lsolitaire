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
