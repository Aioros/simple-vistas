import { AVPlaceableMixin, AVPlaceableDocumentMixin, AVPlaceableHUDMixin } from "./AVPlaceable.js";
import { AVControlsLayer } from "./control.js";
import { AVTilesLayerMixin } from "./tileslayer.js";
import { Constants } from "./constants.js";

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
    CONFIG.Token.documentClass = AVPlaceableDocumentMixin(CONFIG.Token.documentClass);
    CONFIG.Token.objectClass = AVPlaceableMixin(CONFIG.Token.objectClass);

    CONFIG.Tile.documentClass = AVPlaceableDocumentMixin(CONFIG.Tile.documentClass);
    CONFIG.Tile.objectClass = AVPlaceableMixin(CONFIG.Tile.objectClass);

    CONFIG.Token.hudClass = AVPlaceableHUDMixin(CONFIG.Token.hudClass);
    CONFIG.Tile.hudClass = AVPlaceableHUDMixin(CONFIG.Tile.hudClass);
    CONFIG.Canvas.layers.tiles.layerClass = AVTilesLayerMixin(CONFIG.Canvas.layers.tiles.layerClass);
    CONFIG.Canvas.layers.avcontrols = { layerClass: AVControlsLayer, group: "interface" };

    game.settings.register(Constants.MODULE_ID, "toggleVistaControls", {
        name: "SimpleVistas.ToggleControls",
        scope: "client",
        config: false,
        type: Boolean,
        onChange: value => {
            if ( !canvas.ready ) return;
            const layer = canvas.avcontrols;
            layer.controls.visible = layer.interactiveChildren = layer.active || value;
        }
    });
});

Hooks.on("getSceneControlButtons", (controls) => {
    controls.push({
        name: "avcontrols",
        title: "SimpleVistas.SimpleVistas",
        icon: "fas fa-panorama",
        layer: "avcontrols",
        visible: game.user.isGM,
        tools: [
            {
                name: "modify",
                title: "SimpleVistas.Modify",
                icon: "fas fa-expand",
                visible: game.user.isGM,
            },
            {
                name: "toggle",
                title: "SimpleVistas.ToggleControls",
                icon: "fas fa-map-pin",
                visible: game.user.isGM,
                toggle: true,
                active: game.settings.get(Constants.MODULE_ID, "toggleVistaControls"),
                onClick: toggled => game.settings.set(Constants.MODULE_ID, "toggleVistaControls", toggled)
            }
        ],
        activeTool: "modify",
    });
});

//CONFIG.debug.hooks = true;

Hooks.on("renderSceneConfig", (app, html) => {
    const flags = foundry.utils.mergeObject(defaultFlags.scene, app.object.flags[Constants.MODULE_ID]);
    const tab = `<a class="item" data-tab="simplevista">
        <i class="fas fa-panorama"></i> Simple Vista
    </a>`;
    const contents = `<div class="tab" data-tab="simplevista">
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
    </div>`;
    html.find(".sheet-tabs:not(.secondary-tabs)").find(".item").last().after(tab);
    html.find(".sheet-tabs:not(.secondary-tabs)").after(contents);
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
            // disable a bunch of controls unless adapted
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
    if (scene.flags[Constants.MODULE_ID].isVista) {
        canvas.avcontrols.draw();
    }
});

Hooks.once("canvasReady", () => {
    const initialBackgroundX = canvas.primary.background.x;
    Hooks.on("canvasPan", (canvas, position) => {
        const isVista = canvas.scene.getFlag(Constants.MODULE_ID, "isVista");
        if (isVista ) {
            const r = canvas.dimensions.rect;
            const initialPosition = {x: r.right / 2};
            const offsetX = position.x - initialPosition.x;
            if (offsetX != 0) {
                [...canvas.scene.tokens, ...canvas.scene.tiles].filter(t => t.object).forEach(t => t.object._refreshPosition());
                canvas.avcontrols.controls.draw();
                canvas.primary.background.x = initialBackgroundX - offsetX * canvas.scene.getFlag(Constants.MODULE_ID, "parallax");
            }
        }
    });
});

Hooks.on("renderTokenConfig", renderAVPlaceableConfig);
Hooks.on("renderTileConfig", renderAVPlaceableConfig);

function renderAVPlaceableConfig(app, html) {
    const flags = foundry.utils.mergeObject(defaultFlags.placeable, app.object.flags[Constants.MODULE_ID]);
    const tab = `<a class="item" data-tab="simplevistas">
        <i class="fas fa-panorama"></i> Vista
    </a>`;
    const contents = `<div class="tab" data-tab="simplevistas">
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
    </div>`;
    html.find(".sheet-tabs:not(.secondary-tabs)").find(".item").last().after(tab);
    html.find(".sheet-tabs:not(.secondary-tabs)").after(contents);
}
