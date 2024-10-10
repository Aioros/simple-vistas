import { AVTokenMixin, AVTokenDocumentMixin } from "./AVToken.js";
import { Constants } from "./constants.js";

const defaultFlags = {
    isVista: false,
    fov: 90,
    foregroundDistance: 10,
    horizonTop: 0.67,
    maxTop: 0.75,
};

Hooks.on("init", () => {
    CONFIG.Token.documentClass = AVTokenDocumentMixin(CONFIG.Token.documentClass);
    CONFIG.Token.objectClass = AVTokenMixin(CONFIG.Token.objectClass);
})

//CONFIG.debug.hooks = true;

Hooks.on("renderSceneConfig", (app, html) => {
    const flags = foundry.utils.mergeObject(defaultFlags, app.object.flags["aioros-vistas"]);
    const tab = `<a class="item" data-tab="aiorosvista">
        <i class="fas fa-panorama"></i> Aioros Vista
    </a>`;
    const contents = `<div class="tab" data-tab="aiorosvista">
        <div class="form-group">
            <label>${game.i18n.localize("AiorosVistas.IsVista")}</label>
            <input id="AV_isVista" type="checkbox" name="AV_isVista" data-dtype="Boolean" ${flags.isVista ? "checked" : ""}>
            <p class="notes">${game.i18n.localize("AiorosVistas.IsVista_Hint")}</p>
        </div>
        <div class="form-group">
            <label>${game.i18n.localize("AiorosVistas.FOV")}</label>
            <input id="AV_fov" type="number" name="AV_fov" data-dtype="Number" min="0" max="120" value="${flags.fov || defaultFlags.fov}">
            <p class="notes">${game.i18n.localize("AiorosVistas.FOV_Hint")}</p>
        </div>
        <div class="form-group">
            <label>${game.i18n.localize("AiorosVistas.ForegroundDistance")}</label>
            <input id="AV_foregroundDistance" type="number" name="AV_foregroundDistance" data-dtype="Number" value="${flags.foregroundDistance || defaultFlags.foregroundDistance}">
            <p class="notes">${game.i18n.localize("AiorosVistas.ForegroundDistance_Hint")}</p>
        </div>
        <div class="form-group">
            <label>${game.i18n.localize("AiorosVistas.HorizonTop")}</label>
            <input id="AV_horizonTop" type="number" name="AV_horizonTop" data-dtype="Number" min="0" max="1" step="0.01" value="${flags.horizonTop || defaultFlags.horizonTop}">
            <p class="notes">${game.i18n.localize("AiorosVistas.HorizonTop_Hint")}</p>
        </div>
        <div class="form-group">
            <label>${game.i18n.localize("AiorosVistas.MaxTop")}</label>
            <input id="AV_maxTop" type="number" name="AV_maxTop" data-dtype="Number" min="0" max="1" step="0.01" value="${flags.maxTop || defaultFlags.maxTop}">
            <p class="notes">${game.i18n.localize("AiorosVistas.MaxTop_Hint")}</p>
        </div>
    </div>`;
    html.find(".sheet-tabs:not(.secondary-tabs)").find(".item").last().after(tab);
    html.find(".sheet-tabs:not(.secondary-tabs)").after(contents);
});

Hooks.on("closeSceneConfig", (app, html) => {
    const isVista = html.find(`input[name="AV_isVista"]`).prop("checked");
    const fov = html.find(`input[name="AV_fov"]`).val();
    const foregroundDistance = html.find(`input[name="AV_foregroundDistance"]`).val();
    const horizonTop = html.find(`input[name="AV_horizonTop"]`).val();
    const maxTop = html.find(`input[name="AV_maxTop"]`).val();
    app.object.setFlag(Constants.MODULE_ID, "isVista", isVista);
    app.object.setFlag(Constants.MODULE_ID, "fov", fov);
    app.object.setFlag(Constants.MODULE_ID, "foregroundDistance", foregroundDistance);
    app.object.setFlag(Constants.MODULE_ID, "horizonTop", horizonTop);
    app.object.setFlag(Constants.MODULE_ID, "maxTop", maxTop);
    if ( isVista ) {
        // probably also global illumination
        // check _repositionObjects
        // disable a bunch of controls unless adapted
        // I'm thinking of a "grid square" being 1/2ft
        const foregroundWidth = 2 * foregroundDistance * Math.tan(fov/2*Math.PI/180);
        canvas.scene.update({
            grid: {type: 0, distance: Constants.GRID_DISTANCE, size: Math.round(canvas.scene.width / foregroundWidth * Constants.GRID_DISTANCE)}
        });
    }
});
