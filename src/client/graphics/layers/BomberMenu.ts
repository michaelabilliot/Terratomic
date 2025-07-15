/**
 * Simple bottom-bar button that opens a pop-up for choosing a Bomber target
 * and dispatches SendBomberIntentEvent through the EventBus.
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │  [ ✈ Bomb Target ] ▽  ← (button, anchored bottom-centre)     │
 * └──────────────────────────────────────────────────────────────┘
 * When the button is clicked a lightweight <dialog> opens that lets
 * the player pick another player and any UnitType structure.
 */

import { EventBus } from "../../../core/EventBus";
import { isStructureType, PlayerType, UnitType } from "../../../core/game/Game";
import { GameView } from "../../../core/game/GameView";
import { SendBomberIntentEvent } from "../../Transport";
import { Layer } from "./Layer";

export class BomberMenu extends HTMLElement implements Layer {
  /** Injected from createRenderer */
  public eventBus!: EventBus;
  public game!: GameView;

  /* --- Layer no-ops ------------------------------------------------------ */
  shouldTransform() {
    return false;
  }
  renderLayer() {
    /* nothing – pure DOM */
  }
  redraw() {
    /* nothing – CSS handles visuals */
  }
  tick() {
    this.updateVisibility();
  }
  init?() {
    /* nothing */
  }

  /* ---------------------------------------------------------------------- */

  private dialog!: HTMLDialogElement;
  private playerSelect!: HTMLSelectElement;
  private structureSelect!: HTMLSelectElement;

  connectedCallback() {
    // shadow = scoped markup + styles
    const root = this.attachShadow({ mode: "open" });

    root.innerHTML = /*html*/ `
      <style>
        :host {
          position: fixed;
          bottom: 8px;          /* same vertical margin as other bottom UI */
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;        /* above the canvas, below modals */
          pointer-events: all;  /* make sure it’s clickable */
        }
        button {
          font: inherit;
          padding: 6px 12px;
          border-radius: 4px;
          border: 1px solid var(--border-color, #444);
          background: var(--button-bg, #222);
          color: var(--button-fg, #eee);
          cursor: pointer;
        }
        dialog {
          border: none;
          border-radius: 6px;
          background: #1a1a1a;
          padding: 16px 20px;
          max-width: 320px;
          color: #eee;
        }
        dialog::backdrop { background: rgba(0,0,0,.55); }
        label { display:block; margin-top: 8px; font-size: 0.9rem; }
        select, dialog button {
          width: 100%;
          margin-top: 4px;
          padding: 4px 6px;
          background:#2b2b2b;
          color:#eee;
          border:1px solid #555;
        }
        .actions { display:flex; gap:8px; margin-top:12px; }
      </style>

      <button id="open">✈ Bomb Target</button>

      <dialog id="dialog">
        <form method="dialog">
          <label>Player
            <select id="player"></select>
          </label>

          <label>Structure
            <select id="structure"></select>
          </label>

          <div class="actions">
            <button value="cancel">Cancel</button>
             <button id="clear" type="button">Clear Target</button>
            <button id="confirm" value="default">Set</button>
          </div>
        </form>
      </dialog>
    `;

    this.dialog = root.getElementById("dialog") as HTMLDialogElement;
    this.playerSelect = root.getElementById("player") as HTMLSelectElement;
    this.structureSelect = root.getElementById(
      "structure",
    ) as HTMLSelectElement;

    root.getElementById("open")!.addEventListener("click", () => this.open());
    root.getElementById("confirm")!.addEventListener("click", (e) => {
      e.preventDefault(); // keep <dialog> open until we close manually
      this.sendIntent();
    });
    root.getElementById("clear")!.addEventListener("click", (e) => {
      e.preventDefault();
      this.eventBus.emit(new SendBomberIntentEvent(null, null));
      this.dialog.close();
    });

    this.updateVisibility();
  }

  /** Called from createRenderer once game & eventBus exist */
  public populate() {
    if (!this.game) return;

    // --- players (exclude self) ------------------------------------------
    const me = this.game.myPlayer();
    if (!me) return;

    const myID = me.id();

    const players = this.game
      .players()
      .filter(
        (p) =>
          p.id() !== myID &&
          (p.type() === PlayerType.Human || p.type() === PlayerType.FakeHuman),
      )
      .sort((a, b) => {
        // Humans first
        if (a.type() !== b.type()) {
          return a.type() === PlayerType.Human ? -1 : 1;
        }
        // Alphabetical within same type
        return a.name().localeCompare(b.name());
      });

    const optsPlayers = players
      .map((p) => `<option value="${p.id()}">${p.name()}</option>`)
      .join("");

    this.playerSelect.innerHTML =
      optsPlayers || `<option disabled>No players</option>`;

    // --- structure types -------------------------------------------------
    const optsStruct = Object.values(UnitType)
      .filter((s) => isStructureType(s))
      .map((s) => `<option value="${s}">${s}</option>`)
      .join("");
    this.structureSelect.innerHTML = optsStruct;
  }

  /* ------------------------- helpers ----------------------------------- */
  private open() {
    this.populate(); // refresh every time – players could have changed
    this.dialog.showModal();
  }

  private sendIntent() {
    if (!this.eventBus) return;

    const targetID = String(this.playerSelect.value); // ensures it's a string

    const structure = this.structureSelect.value as unknown as UnitType;

    // fire event
    this.eventBus.emit(new SendBomberIntentEvent(targetID, structure));

    this.dialog.close();
  }
  private updateVisibility() {
    if (!this.game) return;
    this.style.display = this.game.inSpawnPhase() ? "none" : "block";
  }
}
customElements.define("bomber-menu", BomberMenu);
