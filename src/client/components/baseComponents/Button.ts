import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { translateText } from "../../Utils";

@customElement("o-button")
export class OButton extends LitElement {
  @property({ type: String }) title = "";
  @property({ type: String }) translationKey = "";
  @property({ type: Boolean }) secondary = false;
  @property({ type: Boolean }) block = false;
  @property({ type: Boolean }) blockDesktop = false;
  @property({ type: Boolean }) disable = false;
  @property({ type: String }) iconSrc = "";

  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <button
        class=${classMap({
          "c-button": true,
          "c-button--block": this.block,
          "c-button--blockDesktop": this.blockDesktop,
          "c-button--secondary": this.secondary,
          "c-button--disabled": this.disable,
        })}
        ?disabled=${this.disable}
      >
        <span class="c-button__content">
          ${this.iconSrc
            ? html`<img
                src="${this.iconSrc}"
                alt="icon"
                class="c-button__icon"
              />`
            : ""}
          ${`${this.translationKey}` === ""
            ? `${this.title}`
            : `${translateText(this.translationKey)}`}
        </span>
      </button>
    `;
  }
}
