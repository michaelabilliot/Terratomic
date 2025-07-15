import { Execution, Game, UnitType } from "../game/Game";

export class BomberTargetExecution implements Execution {
  constructor(
    private readonly player: any, // or Player if typed
    private readonly targetPlayerID: string | null, // who to attack
    private readonly structure: UnitType | null, // what to bomb
  ) {}

  init(_mg: Game, _ticks: number): void {
    this.player.bomberIntent =
      this.targetPlayerID && this.structure
        ? { targetPlayerID: this.targetPlayerID, structure: this.structure }
        : null;
  }

  tick(): void {
    // No-op
  }

  isActive(): boolean {
    return false; // immediately completed
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
