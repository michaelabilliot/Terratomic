import { colord, Colord } from "colord";
import { Theme } from "../../../core/configuration/Config";
import { EventBus } from "../../../core/EventBus";
import { MouseUpEvent } from "../../InputHandler";
import { TransformHandler } from "../TransformHandler";
import { Layer } from "./Layer";
import { UnitInfoModal } from "./UnitInfoModal";

import academyIcon from "../../../../resources/images/buildings/academy_icon.png";
import airfieldIcon from "../../../../resources/images/buildings/airfield.png";
import cityIcon from "../../../../resources/images/buildings/cityAlt1.png";
import shieldIcon from "../../../../resources/images/buildings/fortAlt2.png";
import hospitalIcon from "../../../../resources/images/buildings/hospital.png";
import anchorIcon from "../../../../resources/images/buildings/port1.png";
import MissileSiloReloadingIcon from "../../../../resources/images/buildings/silo1-reloading.png";
import missileSiloIcon from "../../../../resources/images/buildings/silo1.png";
import SAMMissileReloadingIcon from "../../../../resources/images/buildings/silo4-reloading.png";
import SAMMissileIcon from "../../../../resources/images/buildings/silo4.png";
import { Cell, UnitType } from "../../../core/game/Game";
import {
  euclDistFN,
  hexDistFN,
  manhattanDistFN,
  rectDistFN,
} from "../../../core/game/GameMap";
import { GameUpdateType } from "../../../core/game/GameUpdates";
import { GameView, UnitView } from "../../../core/game/GameView";

const underConstructionColor = colord({ r: 150, g: 150, b: 150 });
const reloadingColor = colord({ r: 255, g: 0, b: 0 });
const selectedUnitColor = colord({ r: 0, g: 255, b: 255 });

type DistanceFunction = typeof euclDistFN;

enum UnitBorderType {
  Round,
  Diamond,
  Square,
  Hexagon,
}

interface UnitRenderConfig {
  icon: string;
  borderRadius: number;
  territoryRadius: number;
  borderType: UnitBorderType;
}

export class StructureLayer implements Layer {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private unitIcons: Map<string, ImageData> = new Map();
  private theme: Theme;
  private selectedStructureUnit: UnitView | null = null;
  private previouslySelected: UnitView | null = null;
  private readonly borderCache: Map<string, any[]> = new Map();

  // Configuration for supported unit types only
  private readonly unitConfigs: Partial<Record<UnitType, UnitRenderConfig>> = {
    [UnitType.Port]: {
      icon: anchorIcon,
      borderRadius: 8.525,
      territoryRadius: 6.525,
      borderType: UnitBorderType.Round,
    },
    [UnitType.Airfield]: {
      icon: airfieldIcon,
      borderRadius: 8.525,
      territoryRadius: 6.525,
      borderType: UnitBorderType.Square,
    },
    [UnitType.City]: {
      icon: cityIcon,
      borderRadius: 8.525,
      territoryRadius: 6.525,
      borderType: UnitBorderType.Round,
    },
    [UnitType.MissileSilo]: {
      icon: missileSiloIcon,
      borderRadius: 8.525,
      territoryRadius: 6.525,
      borderType: UnitBorderType.Square,
    },
    [UnitType.DefensePost]: {
      icon: shieldIcon,
      borderRadius: 8.525,
      territoryRadius: 6.525,
      borderType: UnitBorderType.Hexagon,
    },
    [UnitType.SAMLauncher]: {
      icon: SAMMissileIcon,
      borderRadius: 8.525,
      territoryRadius: 6.525,
      borderType: UnitBorderType.Square,
    },
    [UnitType.Hospital]: {
      icon: hospitalIcon,
      borderRadius: 8.525,
      territoryRadius: 6.525,
      borderType: UnitBorderType.Square,
    },
    [UnitType.Academy]: {
      icon: academyIcon,
      borderRadius: 8.525,
      territoryRadius: 6.525,
      borderType: UnitBorderType.Square,
    },
  };

  constructor(
    private game: GameView,
    private eventBus: EventBus,
    private transformHandler: TransformHandler,
    private unitInfoModal: UnitInfoModal | null,
  ) {
    if (!unitInfoModal) {
      throw new Error(
        "UnitInfoModal instance must be provided to StructureLayer.",
      );
    }
    this.unitInfoModal = unitInfoModal;
    this.theme = game.config().theme();
    this.loadIconData();
    this.loadIcon("reloadingSam", {
      icon: SAMMissileReloadingIcon,
      borderRadius: 8.525,
      territoryRadius: 6.525,
      borderType: UnitBorderType.Square,
    });
    this.loadIcon("reloadingSilo", {
      icon: MissileSiloReloadingIcon,
      borderRadius: 8.525,
      territoryRadius: 6.525,
      borderType: UnitBorderType.Square,
    });
  }

  private loadIcon(unitType: string, config: UnitRenderConfig) {
    const image = new Image();
    image.src = config.icon;
    image.onload = () => {
      // Create temporary canvas for icon processing
      const tempCanvas = document.createElement("canvas");
      const tempContext = tempCanvas.getContext("2d");
      if (tempContext === null) throw new Error("2d context not supported");
      tempCanvas.width = image.width;
      tempCanvas.height = image.height;

      // Draw the unit icon
      tempContext.drawImage(image, 0, 0);
      const iconData = tempContext.getImageData(
        0,
        0,
        tempCanvas.width,
        tempCanvas.height,
      );
      this.unitIcons.set(unitType, iconData);
      console.log(
        `icon data width height: ${iconData.width}, ${iconData.height}`,
      );
    };
  }

  private loadIconData() {
    Object.entries(this.unitConfigs).forEach(([unitType, config]) => {
      this.loadIcon(unitType, config);
    });
  }
  /**
   * Returns a sorted array of tiles at `radius` distance from `unit`.
   * The list is computed once and then reused from `borderCache`.
   */
  private getCachedTiles(
    unit: UnitView,
    distFn: DistanceFunction,
    radius: number,
  ): any[] {
    const tile = unit.tile(); // <- get its map position
    const key = `${this.game.x(tile)}-${this.game.y(tile)}-${radius}-${distFn.name}`;

    let tiles = this.borderCache.get(key);
    if (!tiles) {
      tiles = Array.from(
        this.game.bfs(unit.tile(), distFn(unit.tile(), radius, true)),
      );
      // sort once so drawBorder can do its bottom-up fill
      tiles.sort((a, b) => this.game.y(a) - this.game.y(b));
      this.borderCache.set(key, tiles);
    }
    return tiles;
  }

  shouldTransform(): boolean {
    return true;
  }

  tick() {
    const updates = this.game.updatesSinceLastTick();
    const unitUpdates = updates !== null ? updates[GameUpdateType.Unit] : [];
    for (const u of unitUpdates) {
      const unit = this.game.unit(u.id);
      if (unit === undefined) continue;
      this.handleUnitRendering(unit);
    }
  }

  init() {
    this.redraw();
    this.eventBus.on(MouseUpEvent, (e) => this.onMouseUp(e));
  }

  redraw() {
    console.log("structure layer redrawing");
    this.canvas = document.createElement("canvas");
    const context = this.canvas.getContext("2d", { alpha: true });
    if (context === null) throw new Error("2d context not supported");
    this.context = context;
    this.canvas.width = this.game.width();
    this.canvas.height = this.game.height();
    this.game.units().forEach((u) => this.handleUnitRendering(u));
  }

  renderLayer(context: CanvasRenderingContext2D) {
    context.drawImage(
      this.canvas,
      -this.game.width() / 2,
      -this.game.height() / 2,
      this.game.width(),
      this.game.height(),
    );
  }

  private isUnitTypeSupported(unitType: UnitType): boolean {
    return unitType in this.unitConfigs;
  }

  private drawBorder(
    unit: UnitView,
    borderColor: Colord,
    config: UnitRenderConfig,
    distanceFN: DistanceFunction,
    healthPercentage: number,
  ) {
    const borderTiles = this.getCachedTiles(
      unit,
      distanceFN,
      config.borderRadius,
    );

    // Sort tiles by Y-coordinate to simulate a bottom-up fill
    borderTiles.sort((a, b) => this.game.y(a) - this.game.y(b));

    const healthyTileCount = Math.floor(borderTiles.length * healthPercentage);

    const healthyCells: Cell[] = [];
    const damagedCells: Cell[] = [];

    for (let i = 0; i < borderTiles.length; i++) {
      const tile = borderTiles[i];
      const cell = new Cell(this.game.x(tile), this.game.y(tile));

      if (i >= borderTiles.length - healthyTileCount) {
        healthyCells.push(cell);
      } else {
        damagedCells.push(cell);
      }
    }

    this.paintCells(healthyCells, borderColor, 255);
    this.paintCells(damagedCells, colord({ r: 128, g: 128, b: 128 }), 255);

    const territoryCells = this.getCachedTiles(
      unit,
      distanceFN,
      config.territoryRadius,
    ).map((tile) => new Cell(this.game.x(tile), this.game.y(tile)));

    this.paintCells(
      territoryCells,
      unit.type() === UnitType.Construction
        ? underConstructionColor
        : this.theme.territoryColor(unit.owner()),
      130,
    );
  }

  private getDrawFN(type: UnitBorderType) {
    switch (type) {
      case UnitBorderType.Round:
        return euclDistFN;
      case UnitBorderType.Diamond:
        return manhattanDistFN;
      case UnitBorderType.Square:
        return rectDistFN;
      case UnitBorderType.Hexagon:
        return hexDistFN;
    }
  }

  private handleUnitRendering(unit: UnitView) {
    const unitType = unit.constructionType() ?? unit.type();
    const iconType = unitType;
    if (!this.isUnitTypeSupported(unitType)) return;

    const config = this.unitConfigs[unitType];
    let icon: ImageData | undefined;

    if (unitType === UnitType.SAMLauncher && unit.isCooldown()) {
      icon = this.unitIcons.get("reloadingSam");
    } else {
      icon = this.unitIcons.get(iconType);
    }

    if (unitType === UnitType.MissileSilo && unit.isCooldown()) {
      icon = this.unitIcons.get("reloadingSilo");
    } else {
      icon = this.unitIcons.get(iconType);
    }

    if (!config || !icon) return;

    const drawFunction = this.getDrawFN(config.borderType);
    // Clear previous rendering
    for (const tile of this.getCachedTiles(
      unit,
      drawFunction,
      config.borderRadius,
    )) {
      this.clearCell(new Cell(this.game.x(tile), this.game.y(tile)));
    }

    if (!unit.isActive()) return;

    let borderColor = this.theme.borderColor(unit.owner());
    if (unitType === UnitType.SAMLauncher && unit.isCooldown()) {
      borderColor = reloadingColor;
    } else if (unit.type() === UnitType.Construction) {
      borderColor = underConstructionColor;
    }

    if (unitType === UnitType.MissileSilo && unit.isCooldown()) {
      borderColor = reloadingColor;
    } else if (unit.type() === UnitType.Construction) {
      borderColor = underConstructionColor;
    }

    if (this.selectedStructureUnit === unit) {
      borderColor = selectedUnitColor;
    }

    const healthPercentage = unit.hasHealth()
      ? unit.health() / (unit.info().maxHealth ?? 1)
      : 1;

    this.drawBorder(unit, borderColor, config, drawFunction, healthPercentage);

    const startX = this.game.x(unit.tile()) - Math.floor(icon.width / 2);
    const startY = this.game.y(unit.tile()) - Math.floor(icon.height / 2);

    // Draw the icon
    this.renderIcon(
      icon,
      startX,
      startY,
      icon.width,
      icon.height,
      unit,
      healthPercentage,
    );
  }

  private renderIcon(
    iconData: ImageData,
    startX: number,
    startY: number,
    width: number,
    height: number,
    unit: UnitView,
    healthPercentage: number,
  ) {
    let color = this.theme.borderColor(unit.owner());
    if (unit.type() === UnitType.Construction) {
      color = underConstructionColor;
    }

    const healthyHeight = Math.floor(height * healthPercentage);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const iconIndex = (y * width + x) * 4;
        const originalAlpha = iconData.data[iconIndex + 3];

        if (originalAlpha === 0) continue; // Sklip fully transparent pixels

        const targetX = startX + x;
        const targetY = startY + y;

        if (
          targetX >= 0 &&
          targetX < this.game.width() &&
          targetY >= 0 &&
          targetY < this.game.height()
        ) {
          if (y >= height - healthyHeight) {
            // This is the healthy part of the icon
            this.paintCell(new Cell(targetX, targetY), color, originalAlpha);
          } else {
            // This is the unhealthy part of the icon
            this.paintCell(
              new Cell(targetX, targetY),
              colord({ r: 128, g: 128, b: 128 }),
              originalAlpha,
            );
          }
        }
      }
    }
  }

  paintCell(cell: Cell, color: Colord, alpha: number) {
    this.clearCell(cell);
    this.context.fillStyle = color.alpha(alpha / 255).toRgbString();
    this.context.fillRect(cell.x, cell.y, 1, 1);
  }

  clearCell(cell: Cell) {
    this.context.clearRect(cell.x, cell.y, 1, 1);
  }
  private paintCells(cells: Cell[], color: Colord, alpha: number) {
    const path = new Path2D();
    for (const cell of cells) {
      this.clearCell(cell);
      path.rect(cell.x, cell.y, 1, 1);
    }
    this.context.fillStyle = color.alpha(alpha / 255).toRgbString();
    this.context.fill(path);
  }

  private findStructureUnitAtCell(
    cell: { x: number; y: number },
    maxDistance: number = 10,
  ): UnitView | null {
    const targetRef = this.game.ref(cell.x, cell.y);

    const allUnitTypes = Object.values(UnitType);

    const nearby = this.game.nearbyUnits(targetRef, maxDistance, allUnitTypes);

    for (const { unit } of nearby) {
      if (unit.isActive() && this.isUnitTypeSupported(unit.type())) {
        return unit;
      }
    }

    return null;
  }

  private onMouseUp(event: MouseUpEvent) {
    const cell = this.transformHandler.screenToWorldCoordinates(
      event.x,
      event.y,
    );
    if (!this.game.isValidCoord(cell.x, cell.y)) {
      return;
    }

    const clickedUnit = this.findStructureUnitAtCell(cell);
    this.previouslySelected = this.selectedStructureUnit;

    if (clickedUnit) {
      if (clickedUnit.owner() !== this.game.myPlayer()) {
        return;
      }
      const wasSelected = this.previouslySelected === clickedUnit;
      if (wasSelected) {
        this.selectedStructureUnit = null;
        if (this.previouslySelected) {
          this.handleUnitRendering(this.previouslySelected);
        }
        this.unitInfoModal?.onCloseStructureModal();
      } else {
        this.selectedStructureUnit = clickedUnit;
        if (
          this.previouslySelected &&
          this.previouslySelected !== clickedUnit
        ) {
          this.handleUnitRendering(this.previouslySelected);
        }
        this.handleUnitRendering(clickedUnit);

        const screenPos = this.transformHandler.worldToScreenCoordinates(cell);
        const unitTile = clickedUnit.tile();
        this.unitInfoModal?.onOpenStructureModal({
          unit: clickedUnit,
          x: screenPos.x,
          y: screenPos.y,
          tileX: this.game.x(unitTile),
          tileY: this.game.y(unitTile),
        });
      }
    } else {
      this.selectedStructureUnit = null;
      if (this.previouslySelected) {
        this.handleUnitRendering(this.previouslySelected);
      }
      this.unitInfoModal?.onCloseStructureModal();
    }
  }

  public unSelectStructureUnit() {
    if (this.selectedStructureUnit) {
      this.previouslySelected = this.selectedStructureUnit;
      this.selectedStructureUnit = null;
      this.handleUnitRendering(this.previouslySelected);
    }
  }
}
