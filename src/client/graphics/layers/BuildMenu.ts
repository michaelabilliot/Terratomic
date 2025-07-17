import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import airfieldIcon from "../../../../resources/images/AirfieldIcon.svg";
import warshipIcon from "../../../../resources/images/BattleshipIconWhite.svg";
import academyIcon from "../../../../resources/images/buildings/academy_icon.png";
import cityIcon from "../../../../resources/images/CityIconWhite.svg";
import fighterJetIcon from "../../../../resources/images/FighterJetIcon.svg";
import goldCoinIcon from "../../../../resources/images/GoldCoinIcon.svg";
import hospitalIcon from "../../../../resources/images/HospitalIconWhite.svg";
import mirvIcon from "../../../../resources/images/MIRVIcon.svg";
import missileSiloIcon from "../../../../resources/images/MissileSiloIconWhite.svg";
import hydrogenBombIcon from "../../../../resources/images/MushroomCloudIconWhite.svg";
import atomBombIcon from "../../../../resources/images/NukeIconWhite.svg";
import portIcon from "../../../../resources/images/PortIcon.svg";
import samlauncherIcon from "../../../../resources/images/SamLauncherIconWhite.svg";
import shieldIcon from "../../../../resources/images/ShieldIconWhite.svg";
import { translateText } from "../../../client/Utils";
import { EventBus } from "../../../core/EventBus";
import { Cell, Gold, PlayerActions, UnitType } from "../../../core/game/Game";
import { TileRef } from "../../../core/game/GameMap";
import { GameView } from "../../../core/game/GameView";
import { LangSelector } from "../../LangSelector";
import { BuildUnitIntentEvent } from "../../Transport";
import { renderNumber } from "../../Utils";
import { Layer } from "./Layer";

export enum BuildCategory {
  Nuclear = "nuclear",
  Military = "military",
  Infrastructure = "infrastructure",
}

interface BuildItemDisplay {
  unitType: UnitType;
  icon: string;
  description?: string;
  key?: string;
  countable?: boolean;
  category: BuildCategory;
}

const buildTable: BuildItemDisplay[] = [
  {
    unitType: UnitType.AtomBomb,
    icon: atomBombIcon,
    description: "build_menu.desc.atom_bomb",
    key: "unit_type.atom_bomb",
    countable: false,
    category: BuildCategory.Nuclear,
  },
  {
    unitType: UnitType.MIRV,
    icon: mirvIcon,
    description: "build_menu.desc.mirv",
    key: "unit_type.mirv",
    countable: false,
    category: BuildCategory.Nuclear,
  },
  {
    unitType: UnitType.HydrogenBomb,
    icon: hydrogenBombIcon,
    description: "build_menu.desc.hydrogen_bomb",
    key: "unit_type.hydrogen_bomb",
    countable: false,
    category: BuildCategory.Nuclear,
  },
  {
    unitType: UnitType.FighterJet,
    icon: fighterJetIcon,
    description: "build_menu.desc.fighter_jet",
    key: "unit_type.fighter_jet",
    countable: true,
    category: BuildCategory.Military,
  },
  {
    unitType: UnitType.Warship,
    icon: warshipIcon,
    description: "build_menu.desc.warship",
    key: "unit_type.warship",
    countable: true,
    category: BuildCategory.Military,
  },
  {
    unitType: UnitType.Airfield,
    icon: airfieldIcon,
    description: "build_menu.desc.airfield",
    key: "unit_type.airfield",
    countable: true,
    category: BuildCategory.Infrastructure,
  },
  {
    unitType: UnitType.Port,
    icon: portIcon,
    description: "build_menu.desc.port",
    key: "unit_type.port",
    countable: true,
    category: BuildCategory.Infrastructure,
  },
  {
    unitType: UnitType.MissileSilo,
    icon: missileSiloIcon,
    description: "build_menu.desc.missile_silo",
    key: "unit_type.missile_silo",
    countable: true,
    category: BuildCategory.Infrastructure,
  },
  {
    unitType: UnitType.SAMLauncher,
    icon: samlauncherIcon,
    description: "build_menu.desc.sam_launcher",
    key: "unit_type.sam_launcher",
    countable: true,
    category: BuildCategory.Infrastructure,
  },
  {
    unitType: UnitType.DefensePost,
    icon: shieldIcon,
    description: "build_menu.desc.defense_post",
    key: "unit_type.defense_post",
    countable: true,
    category: BuildCategory.Infrastructure,
  },
  {
    unitType: UnitType.Hospital,
    icon: hospitalIcon,
    description: "build_menu.desc.hospital",
    key: "unit_type.hospital",
    countable: true,
    category: BuildCategory.Infrastructure,
  },
  {
    unitType: UnitType.Academy,
    icon: academyIcon,
    description: "build_menu.desc.academy",
    key: "unit_type.academy",
    countable: true,
    category: BuildCategory.Infrastructure,
  },
  {
    unitType: UnitType.City,
    icon: cityIcon,
    description: "build_menu.desc.city",
    key: "unit_type.city",
    countable: true,
    category: BuildCategory.Infrastructure,
  },
];

@customElement("build-menu")
export class BuildMenu extends LitElement implements Layer {
  public game: GameView;
  public eventBus: EventBus;
  private clickedTile: TileRef;
  private playerActions: PlayerActions | null;
  private filteredBuildTable: BuildItemDisplay[] = [];
  @state()
  private _selectedCategory: BuildCategory = BuildCategory.Infrastructure;

  tick() {
    if (!this._hidden) {
      this.refresh();
    }
  }

  static styles = css`
    :host {
      display: block;
    }
    .build-menu {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 9999;
      background-color: #1e1e1e;
      padding: 15px;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 95vw;
      max-height: 95vh;
      overflow-y: auto;
    }
    .build-description {
      font-size: 0.6rem;
    }
    .build-row {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      width: 100%;
    }
    .build-button {
      position: relative;
      width: 120px;
      height: 140px;
      border: 2px solid #444;
      background-color: #2c2c2c;
      color: white;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      margin: 8px;
      padding: 10px;
      gap: 5px;
    }
    .build-button:not(:disabled):hover {
      background-color: #3a3a3a;
      transform: scale(1.05);
      border-color: #666;
    }
    .build-button:not(:disabled):active {
      background-color: #4a4a4a;
      transform: scale(0.95);
    }
    .build-button:disabled {
      background-color: #1a1a1a;
      border-color: #333;
      cursor: not-allowed;
      opacity: 0.7;
    }
    .build-button:disabled img {
      opacity: 0.5;
    }
    .build-button:disabled .build-cost {
      color: #ff4444;
    }
    .build-icon {
      font-size: 40px;
      margin-bottom: 5px;
    }
    .build-name {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 5px;
      text-align: center;
    }
    .build-cost {
      font-size: 14px;
    }
    .hidden {
      display: none !important;
    }
    .build-count-chip {
      position: absolute;
      top: -10px;
      right: -10px;
      background-color: #2c2c2c;
      color: white;
      padding: 2px 10px;
      border-radius: 10000px;
      transition: all 0.3s ease;
      font-size: 12px;
      display: flex;
      justify-content: center;
      align-content: center;
      border: 1px solid #444;
    }
    .build-button:not(:disabled):hover > .build-count-chip {
      background-color: #3a3a3a;
      border-color: #666;
    }
    .build-button:not(:disabled):active > .build-count-chip {
      background-color: #4a4a4a;
    }
    .build-button:disabled > .build-count-chip {
      background-color: #1a1a1a;
      border-color: #333;
      cursor: not-allowed;
    }
    .build-count {
      font-weight: bold;
      font-size: 14px;
    }

    @media (max-width: 768px) {
      .build-menu {
        padding: 10px;
        max-height: 80vh;
        width: 80vw;
      }
      .build-button {
        width: 140px;
        height: 120px;
        margin: 4px;
        padding: 6px;
        gap: 5px;
      }
      .build-icon {
        font-size: 28px;
      }
      .build-name {
        font-size: 12px;
        margin-bottom: 3px;
      }
      .build-cost {
        font-size: 11px;
      }
      .build-count {
        font-weight: bold;
        font-size: 10px;
      }
      .build-count-chip {
        padding: 1px 5px;
      }
    }

    @media (max-width: 480px) {
      .build-menu {
        padding: 8px;
        max-height: 70vh;
      }
      .build-button {
        width: calc(50% - 6px);
        height: 100px;
        margin: 3px;
        padding: 4px;
        border-width: 1px;
      }
      .build-icon {
        font-size: 24px;
      }
      .build-name {
        font-size: 10px;
        margin-bottom: 2px;
      }
      .build-cost {
        font-size: 9px;
      }
      .build-count {
        font-weight: bold;
        font-size: 8px;
      }
      .build-count-chip {
        padding: 0 3px;
      }
    }
    .category-tabs {
      display: flex;
      justify-content: center;
      margin-bottom: 15px;
      width: 100%;
      flex-wrap: wrap;
    }
    .category-button {
      background-color: #3a3a3a;
      color: white;
      border: 1px solid #555;
      padding: 4px 8px;
      margin: 0 2px;
      border-radius: 6px;
      cursor: pointer;
      transition:
        background-color 0.3s ease,
        border-color 0.3s ease;
      font-weight: bold;
      text-transform: capitalize;
      font-size: 0.7em;
    }
    .category-button:hover {
      background-color: #4a4a4a;
      border-color: #777;
    }
    .category-button.active {
      background-color: #007bff;
      border-color: #007bff;
    }
    @media (max-width: 768px) {
      .category-button {
        padding: 3px 6px;
        margin: 0 1px;
        font-size: 0.6em;
      }
    }
    @media (max-width: 480px) {
      .category-button {
        padding: 2px 4px;
        margin: 0 1px;
        font-size: 0.5em;
      }
    }
  `;

  @state()
  private _hidden = true;

  private canBuild(item: BuildItemDisplay): boolean {
    if (this.game?.myPlayer() === null || this.playerActions === null) {
      return false;
    }
    const buildableUnits = this.playerActions?.buildableUnits ?? [];
    const unit = buildableUnits.filter((u) => u.type === item.unitType);
    if (unit.length === 0) {
      return false;
    }
    return unit[0].canBuild !== false;
  }

  private cost(item: BuildItemDisplay): Gold {
    for (const bu of this.playerActions?.buildableUnits ?? []) {
      if (bu.type === item.unitType) {
        return bu.cost;
      }
    }
    return 0n;
  }

  private count(item: BuildItemDisplay): string {
    const player = this.game?.myPlayer();
    if (!player) {
      return "?";
    }

    return player.units(item.unitType).length.toString();
  }

  public onBuildSelected = (item: BuildItemDisplay) => {
    this.eventBus.emit(
      new BuildUnitIntentEvent(
        item.unitType,
        new Cell(this.game.x(this.clickedTile), this.game.y(this.clickedTile)),
      ),
    );
    this.hideMenu();
  };

  private selectCategory(category: BuildCategory) {
    this._selectedCategory = category;
    this.refresh();
  }

  render() {
    const categories = Object.values(BuildCategory);
    const langSelector = document.querySelector(
      "lang-selector",
    ) as LangSelector;

    // Only render categories if translations are loaded
    if (
      !langSelector ||
      !langSelector.translations ||
      Object.keys(langSelector.translations).length === 0
    ) {
      return html``; // Render nothing until translations are ready
    }

    return html`
      <div
        class="build-menu ${this._hidden ? "hidden" : ""}"
        @contextmenu=${(e) => e.preventDefault()}
      >
        <div class="category-tabs">
          ${categories.map(
            (category) => html`
              <button
                class="category-button ${this._selectedCategory === category
                  ? "active"
                  : ""}"
                @click=${() => this.selectCategory(category)}
              >
                ${translateText(`build_menu.category.${category}`)}
              </button>
            `,
          )}
        </div>
        <div class="build-row">
          ${this.filteredBuildTable.map(
            (item) => html`
              <button
                class="build-button"
                @click=${() => this.onBuildSelected(item)}
                ?disabled=${!this.canBuild(item)}
                title=${!this.canBuild(item)
                  ? translateText("build_menu.not_enough_money")
                  : ""}
              >
                <img
                  src=${item.icon}
                  alt="${item.unitType}"
                  width="40"
                  height="40"
                />
                <span class="build-name"
                  >${item.key && translateText(item.key)}</span
                >
                <span class="build-description"
                  >${item.description && translateText(item.description)}</span
                >
                <span class="build-cost" translate="no">
                  ${renderNumber(
                    this.game && this.game.myPlayer() ? this.cost(item) : 0,
                  )}
                  <img
                    src=${goldCoinIcon}
                    alt="gold"
                    width="12"
                    height="12"
                    style="vertical-align: middle;"
                  />
                </span>
                ${item.countable
                  ? html`<div class="build-count-chip">
                      <span class="build-count">${this.count(item)}</span>
                    </div>`
                  : ""}
              </button>
            `,
          )}
        </div>
      </div>
    `;
  }

  hideMenu() {
    this._hidden = true;
    this.requestUpdate();
  }

  showMenu(clickedTile: TileRef, initialCategory?: BuildCategory) {
    this.clickedTile = clickedTile;
    this._hidden = false;
    this._selectedCategory = initialCategory || BuildCategory.Infrastructure;
    this.refresh();
  }

  private refresh() {
    this.game
      .myPlayer()
      ?.actions(this.clickedTile)
      .then((actions) => {
        this.playerActions = actions;
        this.requestUpdate();
      });

    // removed disabled buildings from the buildtable
    this.filteredBuildTable = this.getBuildableUnits();
  }

  private getBuildableUnits(): BuildItemDisplay[] {
    return buildTable.filter(
      (item) =>
        item.category === this._selectedCategory &&
        !this.game?.config()?.isUnitDisabled(item.unitType),
    );
  }

  get isVisible() {
    return !this._hidden;
  }
}
