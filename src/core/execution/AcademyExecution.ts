import {
  Execution,
  Game,
  Player,
  PlayerID,
  Unit,
  UnitType,
} from "../game/Game";
import { TileRef } from "../game/GameMap";

export class AcademyExecution implements Execution {
  private player: Player;
  private mg: Game;
  private academy: Unit | null = null;
  private active: boolean = true;

  constructor(
    private ownerId: PlayerID,
    private tile: TileRef,
  ) {}

  init(mg: Game, ticks: number): void {
    this.mg = mg;
    if (!mg.hasPlayer(this.ownerId)) {
      console.warn(`AcademyExecution: player ${this.ownerId} not found`);
      this.active = false;
      return;
    }
    this.player = mg.player(this.ownerId);
  }

  tick(ticks: number): void {
    if (this.academy === null) {
      const spawnTile = this.player.canBuild(UnitType.Academy, this.tile);
      if (spawnTile === false) {
        console.warn("cannot build academy");
        this.active = false;
        return;
      }
      this.academy = this.player.buildUnit(UnitType.Academy, spawnTile, {});
    }
    if (!this.academy.isActive()) {
      this.active = false;
      return;
    }

    if (this.player !== this.academy.owner()) {
      this.player = this.academy.owner();
    }
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
