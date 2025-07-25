import {
  Execution,
  Game,
  MessageType,
  Player,
  Unit,
  UnitType,
} from "../game/Game";
import { TileRef } from "../game/GameMap";
import { AirPathFinder } from "../pathfinding/PathFinding";
import { PseudoRandom } from "../PseudoRandom";
import { NukeType } from "../StatsSchemas";

export class SAMMissileExecution implements Execution {
  private active = true;
  private pathFinder: AirPathFinder;
  private SAMMissile: Unit | undefined;
  private mg: Game;

  constructor(
    private spawn: TileRef,
    private _owner: Player,
    private ownerUnit: Unit,
    private target: Unit,
    private speed: number = 12,
  ) {}

  init(mg: Game, ticks: number): void {
    this.pathFinder = new AirPathFinder(mg, new PseudoRandom(mg.ticks()));
    this.mg = mg;
  }

  tick(ticks: number): void {
    if (this.SAMMissile === undefined) {
      this.SAMMissile = this._owner.buildUnit(
        UnitType.SAMMissile,
        this.spawn,
        {},
      );
    }
    if (!this.SAMMissile.isActive()) {
      this.active = false;
      return;
    }

    // MIRV warheads are too fast and MIRVs should not be stopped by SAMs.
    const Whitelist = [
      UnitType.AtomBomb,
      UnitType.HydrogenBomb,
      UnitType.CargoPlane,
      UnitType.Bomber,
      UnitType.FighterJet,
    ];

    if (
      !this.target.isActive() ||
      !this.ownerUnit.isActive() ||
      this.target.owner() === this.SAMMissile.owner() ||
      !Whitelist.includes(this.target.type())
    ) {
      this.SAMMissile.delete(false);
      this.active = false;
      return;
    }

    for (let i = 0; i < this.speed; i++) {
      const result = this.pathFinder.nextTile(
        this.SAMMissile.tile(),
        this.target.tile(),
      );
      if (result === true) {
        if (
          this.target.type() === UnitType.AtomBomb ||
          this.target.type() === UnitType.HydrogenBomb
        ) {
          this.mg.displayMessage(
            `Missile intercepted ${this.target.type()}`,
            MessageType.SAM_HIT,
            this._owner.id(),
          );

          this.mg
            .stats()
            .bombIntercept(this._owner, this.target.type() as NukeType, 1);
        }
        this.active = false;
        this.target.delete(true, this._owner);
        this.SAMMissile.delete(false);

        return;
      } else {
        this.SAMMissile.move(result);
      }
    }
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
