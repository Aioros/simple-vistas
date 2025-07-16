import { SVPlaceableMixin, SVPlaceableDocumentMixin, SVPlaceableHUDMixin } from "./SVPlaceable.js";
import { SVControlsLayer } from "./SVControl.js";
import { SVTilesLayerMixin } from "./SVTilesLayer.js";
import { Constants } from "./constants.js";

/*** Default values for module flags ***
 * Scene Flags:
 * * isVista: boolean - whether the scene is a Vista
 * * foregroundWidth: number - width of the scene at its closest point (in feet)
 * * horizonTop: number (0 to 1) - y-position of the horizon, expressed as fraction of the scene height from the top
 * * maxTop: number (0 to 1) - highest (well, actually minimum) y-position of a placeable, expressed as fraction of the scene height from the top
 * * parallax: number (0 to 1) - strength of the parallax effect on horizontal pan
 * Placeable Flags:
 * * width, height: number - dimensions (in ft) of the object in Vista scenes
 ***/

const defaultFlags = {
    scene: {
        isVista: false,
        foregroundWidth: 20,
        horizonTop: 0.6,
        maxTop: 0.7,
        parallax: 0.2,
    },
    placeable: {
        //width: 0,
        //height: 0,
    }
};

Hooks.on("init", () => {
    // Mixins for Tokens and Tiles
    CONFIG.Token.documentClass = SVPlaceableDocumentMixin(CONFIG.Token.documentClass);
    CONFIG.Token.objectClass = SVPlaceableMixin(CONFIG.Token.objectClass);

    CONFIG.Tile.documentClass = SVPlaceableDocumentMixin(CONFIG.Tile.documentClass);
    CONFIG.Tile.objectClass = SVPlaceableMixin(CONFIG.Tile.objectClass);

    CONFIG.Token.hudClass = SVPlaceableHUDMixin(CONFIG.Token.hudClass);
    CONFIG.Tile.hudClass = SVPlaceableHUDMixin(CONFIG.Tile.hudClass);

    // Mixin for specific Tiles layer features
    CONFIG.Canvas.layers.tiles.layerClass = SVTilesLayerMixin(CONFIG.Canvas.layers.tiles.layerClass);

    // The perspective controls layer
    CONFIG.Canvas.layers.svcontrols = { layerClass: SVControlsLayer, group: "interface" };

    // Setting for the ToggleControls button
    game.settings.register(Constants.MODULE_ID, "toggleVistaControls", {
        name: "SimpleVistas.ToggleControls",
        scope: "client",
        config: false,
        type: Boolean,
        onChange: value => {
            if ( !canvas.ready ) return;
            const layer = canvas.svcontrols;
            layer.controls.visible = layer.interactiveChildren = layer.active || value;
        }
    });
});

Hooks.on("renderTokenConfig", renderSVPlaceableConfig);
Hooks.on("renderTileConfig", renderSVPlaceableConfig);

function renderSVPlaceableConfig(app, html) {
    const flags = foundry.utils.mergeObject(defaultFlags.placeable, app.document.flags[Constants.MODULE_ID]);
    const tab = document.createElement("a");
    tab.classList.toggle("active", app.tabGroups.sheet === "simplevistas");
    tab.dataset.action = "tab";
    tab.dataset.group = "sheet";
    tab.dataset.tab = "simplevistas";
    tab.innerHTML = `<i class="fa-solid fa-panorama"></i> <span>Simple Vista</span>`;
    const contents = document.createElement("div");
    contents.classList.add("tab", "scrollable");
    contents.classList.toggle("active", app.tabGroups.sheet === "simplevistas");
    contents.dataset.group = "sheet";
    contents.dataset.tab = "simplevistas";
    contents.dataset.applicationPart = "simplevistas";
    contents.innerHTML = `
        <div class="form-group">
            <label>${game.i18n.localize("SimpleVistas.Width")}</label>
            <input type="number" name="flags.${Constants.MODULE_ID}.width" data-dtype="Number" min="0" value="${flags.width || ""}">
            <p class="notes">${game.i18n.localize("SimpleVistas.Width_Hint")}</p>
        </div>
        <div class="form-group">
            <label>${game.i18n.localize("SimpleVistas.Height")}</label>
            <input type="number" name="flags.${Constants.MODULE_ID}.height" data-dtype="Number" min="0" value="${flags.height || ""}">
            <p class="notes">${game.i18n.localize("SimpleVistas.Height_Hint")}</p>
        </div>
    `;
    html.querySelector("nav.sheet-tabs").appendChild(tab);
    html.querySelector(".tab:last-of-type").after(contents);
}

Hooks.on("renderSceneConfig", (app, html) => {
    const flags = foundry.utils.mergeObject(defaultFlags.scene, app.document.flags[Constants.MODULE_ID]);
    const tab = document.createElement("a");
    tab.classList.toggle("active", app.tabGroups.sheet === "simplevistas");
    tab.dataset.action = "tab";
    tab.dataset.group = "sheet";
    tab.dataset.tab = "simplevistas";
    tab.innerHTML = `<i class="fa-solid fa-panorama"></i> <span>Vista</span>`;
    const contents = document.createElement("div");
    contents.classList.add("tab", "scrollable");
    contents.classList.toggle("active", app.tabGroups.sheet === "simplevistas");
    contents.dataset.group = "sheet";
    contents.dataset.tab = "simplevistas";
    contents.dataset.applicationPart = "simplevistas";
    contents.innerHTML = `
        <div class="form-group">
            <label>${game.i18n.localize("SimpleVistas.IsVista")}</label>
            <input type="checkbox" name="flags.${Constants.MODULE_ID}.isVista" data-dtype="Boolean" ${flags.isVista ? "checked" : ""}>
            <p class="notes">${game.i18n.localize("SimpleVistas.IsVista_Hint")}</p>
        </div>
        <div class="form-group">
            <label>${game.i18n.localize("SimpleVistas.ForegroundWidth")}</label>
            <input type="number" name="flags.${Constants.MODULE_ID}.foregroundWidth" data-dtype="Number" value="${flags.foregroundWidth || defaultFlags.scene.foregroundWidth}">
            <p class="notes">${game.i18n.localize("SimpleVistas.ForegroundWidth_Hint")}</p>
        </div>
        <div class="form-group">
            <label>${game.i18n.localize("SimpleVistas.HorizonTop")}</label>
            <input type="number" name="flags.${Constants.MODULE_ID}.horizonTop" data-dtype="Number" min="0" max="1" step="0.01" value="${flags.horizonTop || defaultFlags.scene.horizonTop}">
            <p class="notes">${game.i18n.localize("SimpleVistas.HorizonTop_Hint")}</p>
        </div>
        <div class="form-group">
            <label>${game.i18n.localize("SimpleVistas.MaxTop")}</label>
            <input type="number" name="flags.${Constants.MODULE_ID}.maxTop" data-dtype="Number" min="0" max="1" step="0.01" value="${flags.maxTop || defaultFlags.scene.maxTop}">
            <p class="notes">${game.i18n.localize("SimpleVistas.MaxTop_Hint")}</p>
        </div>
        <div class="form-group">
            <label>${game.i18n.localize("SimpleVistas.ParallaxStrength")}</label>
            <div class="form-fields">
                <range-picker name="flags.${Constants.MODULE_ID}.parallax" value="${flags.parallax || defaultFlags.scene.parallax}" min="0" max="1" step="0.05">
                    <input type="range" min="0" max="1" step="0.05"><input type="number" min="0" max="1" step="0.05">
                </range-picker>
            </div>
            <p class="notes">${game.i18n.localize("SimpleVistas.ParallaxStrength_Hint")}</p>
        </div>
    `;
    html.querySelector("nav.sheet-tabs").appendChild(tab);
    html.querySelector(".tab:last-of-type").after(contents);
});

Hooks.on("preUpdateScene", (scene, data, options) => {
    if (data.flags?.[Constants.MODULE_ID]) {
        const isVista = data.flags[Constants.MODULE_ID].isVista || scene.getFlag(Constants.MODULE_ID, "isVista");
        if (isVista) {
            options.autoReposition = true;
            data.flags[Constants.MODULE_ID].horizonTop ||= scene.getFlag(Constants.MODULE_ID, "horizonTop");
            data.flags[Constants.MODULE_ID].maxTop ||= scene.getFlag(Constants.MODULE_ID, "maxTop");
            data.flags[Constants.MODULE_ID].maxTop = Math.max(parseFloat(data.flags[Constants.MODULE_ID].horizonTop) + 0.01, data.flags[Constants.MODULE_ID].maxTop);
            data.flags[Constants.MODULE_ID].horizonTop = Math.round(data.flags[Constants.MODULE_ID].horizonTop * 100) / 100;
            data.flags[Constants.MODULE_ID].maxTop = Math.round(data.flags[Constants.MODULE_ID].maxTop * 100) / 100;
            // check _repositionObjects
            // we should probably disable some controls unless adapted somehow
            if (data.grid) {
                const foregroundWidth = data.flags[Constants.MODULE_ID].foregroundWidth;
                data.grid.type = 0;
                data.grid.distance = Constants.GRID_DISTANCE;
                data.grid.size = Math.round(data.width / foregroundWidth * Constants.GRID_DISTANCE);
                data.tokenVision = false;
            }
        }
    }
});

Hooks.on("updateScene", (scene) => {
    if (scene.flags[Constants.MODULE_ID]?.isVista) {
        // Redraw the perspective
        canvas.svcontrols.draw();
    }
});

// The main parallax implementation
Hooks.once("canvasReady", () => {
    // Store the initial position of the background in the PrimaryCanvasGroup
    const initialBackgroundX = canvas.primary.background.x;
    Hooks.on("canvasPan", (canvas, position) => {
        const isVista = canvas.scene.getFlag(Constants.MODULE_ID, "isVista");
        if (isVista ) {
            // Find the offset
            const r = canvas.dimensions.rect;
            const initialPosition = {x: r.right / 2};
            const offsetX = position.x - initialPosition.x;
            if (offsetX != 0) {
                // Refresh each placeable's position (_refreshPosition also calculates the current offset)
                [...canvas.scene.tokens, ...canvas.scene.tiles].filter(t => t.object).forEach(t => t.object._refreshPosition());
                // Redraw the perspective rays
                canvas.svcontrols.controls.draw();
                // Offset the background
                canvas.primary.background.x = initialBackgroundX - offsetX * canvas.scene.getFlag(Constants.MODULE_ID, "parallax");
            }
        }
    });
});
