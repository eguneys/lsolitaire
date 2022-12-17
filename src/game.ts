export interface IGamePov {
  clone: IGamePov
}

export interface IGame<T extends IGamePov> {
  pov: T
}

export abstract class IMove<P extends IGamePov, T extends IGame<P>> {

  constructor(readonly game: T) {}

  _data: any
  _set_data(data: any) {
    this._data = data
    return this
  }
  
  abstract apply(): number;
  abstract undo(): number;

  abstract undo_pov(p: P): void;
}

export type IMoveType<P extends IGamePov, T extends IGame<P>> = { new(...args: any): IMove<P, T>, apply: (_: P, data: any) => void, can: (_: P, data: any) => boolean };

export type Stats = {
  score: number,
  nb_moves: number
}

export class Game<P extends IGamePov, T extends IGame<P>> {

  static make = <P extends IGamePov, T extends IGame<P>>(game: T): Game<P, T> => {
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
    readonly history: Array<IMove<P, T>>) {}

  apply(move_ctor: IMoveType<P, T>, data: any) {
    let move = new move_ctor(this.game)._set_data(data)

    if (!move_ctor.can(this.game.pov, data)) {
      return undefined
    }

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
    if (!this.can_undo) {
      return undefined
    }

    let move = this.history.pop()!
    let points = move.undo()
    this.score += points
    this.nb_moves++;
    return move
  }
}


export class GamePov<P extends IGamePov, T extends IGame<P>> {

  get clone() {
    let game: P = this.game.clone as P
    return new GamePov(game,
                       {
                         ...this.stats
                       },
                       this.history)
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

  get can_undo() {
    return this.history > 0
  }


  apply(move_ctor: IMoveType<P, T>, data: any) {
    move_ctor.apply(this.game, data)
    this.nb_moves++;
    this.history++;
  }

  undo_pov() {
    this.nb_moves++;
    this.history--;
  }

  undo(move: IMove<P, T>) {
    move.undo_pov(this.game)
  }


  history: number

  constructor(
    readonly game: P,
    readonly stats: Stats,
    history: number) {
      this.history = history
    }
} 
