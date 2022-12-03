export const suits = ['d', 'h', 'c', 's']
export const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']


export type Suit = typeof suits[number]
export type Rank = typeof ranks[number]

export type Card = `${Suit}${Rank}`
