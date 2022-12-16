export interface IGamePov {
}

export interface IGame {
  pov: IGamePov
}

export abstract class IMove<T extends IGame> {

  constructor(readonly game: T) {}

  _data: any
  _set_data(data: any) {
    this._data = data
    return this
  }
  
  abstract apply(): number;
  abstract undo(): number;
}

export type IMoveType<T extends IGame> = { new(...args: any): IMove<T> };

export type Stats = {
  score: number,
  nb_moves: number
}

export class Game<T extends IGame> {

  static make = <T extends IGame>(game: T) => {
    return new Game(game,
                    {
                      score: 0,
                      nb_moves: 0
                    }, [])
  }

  get nb_moves() {
    return this.stats.nb_moves
  }

  set nb_moves(_: number) {
    this.stats.nb_moves = _
  }

  get score() {
    return this.stats.score
  }

  set score(_: number) {
    this.stats.score = _
  }

  get pov() {
    return new GamePov(this.game.pov,
                       this.stats,
                       this.history.length)
  }

  constructor(
    readonly game: T,
    readonly stats: Stats,
    readonly history: Array<IMove<T>>) {}

  apply(move_ctor: IMoveType<T>, data: any) {
    let move = new move_ctor(this.game)._set_data(data)
    let points = move.apply()
    this.score += points
    this.nb_moves++;
    this.history.push(move)
    return move
  }

  get can_undo() {
    return this.history.length > 0
  }

  undo() {
    let move = this.history.pop()!
    let points = move.undo()
    this.score += points
    this.nb_moves++;
  }
}


export class GamePov<T extends IGamePov> {


  get nb_moves() {
    return this.stats.nb_moves
  }

  set nb_moves(_: number) {
    this.stats.nb_moves = _
  }

  get score() {
    return this.stats.score
  }

  set score(_: number) {
    this.stats.score = _
  }

  get can_undo() {
    return this.history > 0
  }

  constructor(
    readonly game: T,
    readonly stats: Stats,
    readonly history: number) {}
} 
