import { AVTokenMixin, AVTokenDocumentMixin, AVTokenHUDMixin } from "./AVToken.js";
import { AVControlsLayer, AVControl } from "./control.js";
import { Constants } from "./constants.js";

const defaultFlags = {
    scene: {
        isVista: false,
        fov: 90,
        foregroundDistance: 10,
        horizonTop: 0.6,
        maxTop: 0.7,
    },
    placeable: {
        //width: 0,
        //height: 0,
    }
};

Hooks.on("init", () => {
    CONFIG.Token.documentClass = AVTokenDocumentMixin(CONFIG.Token.documentClass);
    CONFIG.Token.objectClass = AVTokenMixin(CONFIG.Token.objectClass);

    CONFIG.Tile.documentClass = AVTokenDocumentMixin(CONFIG.Tile.documentClass);
    CONFIG.Tile.objectClass = AVTokenMixin(CONFIG.Tile.objectClass);

    CONFIG.Token.hudClass = AVTokenHUDMixin(CONFIG.Token.hudClass);
    CONFIG.Tile.hudClass = AVTokenHUDMixin(CONFIG.Tile.hudClass);
    CONFIG.Canvas.layers.avcontrols = { layerClass: AVControlsLayer, group: "interface" };

    game.settings.register(Constants.MODULE_ID, "toggleVistaControls", {
        name: "AiorosVistas.ToggleControls",
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
        title: "AiorosVistas.AiorosVistas",
        icon: "fas fa-panorama",
        layer: "avcontrols",
        visible: game.user.isGM,
        tools: [
            {
                name: "modify",
                title: "AiorosVistas.Modify",
                icon: "fas fa-expand",
                visible: game.user.isGM,
            },
            {
                name: "toggle",
                title: "AiorosVistas.ToggleControls",
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
    const tab = `<a class="item" data-tab="aiorosvista">
        <i class="fas fa-panorama"></i> Aioros Vista
    </a>`;
    const contents = `<div class="tab" data-tab="aiorosvista">
        <div class="form-group">
            <label>${game.i18n.localize("AiorosVistas.IsVista")}</label>
            <input type="checkbox" name="flags.${Constants.MODULE_ID}.isVista" data-dtype="Boolean" ${flags.isVista ? "checked" : ""}>
            <p class="notes">${game.i18n.localize("AiorosVistas.IsVista_Hint")}</p>
        </div>
        <div class="form-group">
            <label>${game.i18n.localize("AiorosVistas.FOV")}</label>
            <input type="number" name="flags.${Constants.MODULE_ID}.fov" data-dtype="Number" min="0" max="120" value="${flags.fov || defaultFlags.scene.fov}">
            <p class="notes">${game.i18n.localize("AiorosVistas.FOV_Hint")}</p>
        </div>
        <div class="form-group">
            <label>${game.i18n.localize("AiorosVistas.ForegroundDistance")}</label>
            <input type="number" name="flags.${Constants.MODULE_ID}.foregroundDistance" data-dtype="Number" value="${flags.foregroundDistance || defaultFlags.scene.foregroundDistance}">
            <p class="notes">${game.i18n.localize("AiorosVistas.ForegroundDistance_Hint")}</p>
        </div>
        <div class="form-group">
            <label>${game.i18n.localize("AiorosVistas.HorizonTop")}</label>
            <input type="number" name="flags.${Constants.MODULE_ID}.horizonTop" data-dtype="Number" min="0" max="1" step="0.01" value="${flags.horizonTop || defaultFlags.scene.horizonTop}">
            <p class="notes">${game.i18n.localize("AiorosVistas.HorizonTop_Hint")}</p>
        </div>
        <div class="form-group">
            <label>${game.i18n.localize("AiorosVistas.MaxTop")}</label>
            <input type="number" name="flags.${Constants.MODULE_ID}.maxTop" data-dtype="Number" min="0" max="1" step="0.01" value="${flags.maxTop || defaultFlags.scene.maxTop}">
            <p class="notes">${game.i18n.localize("AiorosVistas.MaxTop_Hint")}</p>
        </div>
    </div>`;
    html.find(".sheet-tabs:not(.secondary-tabs)").find(".item").last().after(tab);
    html.find(".sheet-tabs:not(.secondary-tabs)").after(contents);
});

Hooks.on("preUpdateScene", (scene, data) => {
    if (data.flags[Constants.MODULE_ID]) {
        const isVista = data.flags[Constants.MODULE_ID].isVista;
        if (isVista) {
            data.flags[Constants.MODULE_ID].horizonTop ||= 0;
            data.flags[Constants.MODULE_ID].maxTop = Math.max(parseFloat(data.flags[Constants.MODULE_ID].horizonTop) + 0.01, data.flags[Constants.MODULE_ID].maxTop || 0);
            // probably also global illumination, no vision
            // check _repositionObjects
            // disable a bunch of controls unless adapted
            // I'm thinking of a "grid square" being 1/2ft
            const foregroundWidth = 2 * data.flags[Constants.MODULE_ID].foregroundDistance * Math.tan(data.flags[Constants.MODULE_ID].fov/2*Math.PI/180);
            data.grid.type = 0;
            data.grid.distance = Constants.GRID_DISTANCE;
            data.grid.size = Math.round(data.width / foregroundWidth * Constants.GRID_DISTANCE);
        }
    }
});

Hooks.on("updateScene", (scene) => {
    if (scene.flags[Constants.MODULE_ID].isVista) {
        canvas.draw();
    }
});

Hooks.on("renderTokenConfig", renderAVPlaceableConfig);
Hooks.on("renderTileConfig", renderAVPlaceableConfig);

function renderAVPlaceableConfig(app, html) {
    const flags = foundry.utils.mergeObject(defaultFlags.placeable, app.object.flags[Constants.MODULE_ID]);
    const tab = `<a class="item" data-tab="aiorosvistas">
        <i class="fas fa-panorama"></i> Vista
    </a>`;
    const contents = `<div class="tab" data-tab="aiorosvistas">
        <div class="form-group">
            <label>${game.i18n.localize("AiorosVistas.Width")}</label>
            <input type="number" name="flags.${Constants.MODULE_ID}.width" data-dtype="Number" min="0" value="${flags.width || ""}">
            <p class="notes">${game.i18n.localize("AiorosVistas.Width_Hint")}</p>
        </div>
        <div class="form-group">
            <label>${game.i18n.localize("AiorosVistas.Height")}</label>
            <input type="number" name="flags.${Constants.MODULE_ID}.height" data-dtype="Number" min="0" value="${flags.height || ""}">
            <p class="notes">${game.i18n.localize("AiorosVistas.Height_Hint")}</p>
        </div>
    </div>`;
    html.find(".sheet-tabs:not(.secondary-tabs)").find(".item").last().after(tab);
    html.find(".sheet-tabs:not(.secondary-tabs)").after(contents);
}
