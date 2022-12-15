export type TurningCards = 'threecards' | 'onecard'
export type TurningLimit = 'nolimit' | 'onepass' | 'threepass'

export type Settings = {
  cards: TurningCards,
  limit: TurningLimit
}

export class Stock {
}

export class Solitaire {


  constructor(
    readonly settings: Settings,
    readonly stock: Stock,
    readonly tableus: Array<Tableu>,
    readonly foundations: Array<Foundation>) {}

}
