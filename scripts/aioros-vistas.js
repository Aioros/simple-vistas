import { AVTokenMixin } from "./AVToken.js";
import { getScaleFactor } from "./utils.js";
import { Constants } from "./constants.js";

const defaultFlags = {
    isVista: false,
    fov: 90,
    foregroundDistance: 10,
    horizonTop: 0.67,
    maxTop: 0.75,
};

Hooks.on("init", () => {
    CONFIG.Token.objectClass = AVTokenMixin(CONFIG.Token.objectClass);
})

//Hooks.on("canvasDraw", () => {
//    CONFIG.Token.objectClass.prototype._onDragLeftMove = function(event) {
//    //Token.prototype._onDragLeftMove = function(event) {
//        const {destination, clones} = event.interactionData;
//        const preview = game.settings.get("core", "tokenDragPreview");
//        
//        // Pan the canvas if the drag event approaches the edge
//        canvas._onDragCanvasPan(event);
//        
//        // Determine dragged distance
//        const origin = this.getCenterPoint();
//        let dx = destination.x - origin.x;
//        let dy = destination.y - origin.y;
//
//        const isVista = this.scene.getFlag("aioros-vistas", "isVista");
//        if ( isVista ) {
//            dy = Math.max(destination.y, this.scene.getFlag("aioros-vistas", "maxTop") * this.scene.dimensions.sceneHeight) - origin.y;
//        }
//        
//        // Update the position of each clone
//        for ( const c of clones ) {
//            const o = c._original;
//
//            if ( isVista ) {
//                const scaleFactor = getScaleFactor(c.document.y, c.scene);
//                c.document.width = TOKEN_WIDTH / GRID_DISTANCE * scaleFactor;
//                c.document.height = TOKEN_HEIGHT / GRID_DISTANCE * scaleFactor;
//                dx += (o.document.width - c.document.width) * c.scene.grid.size / 2;
//                dy += (o.document.height - c.document.height) * c.scene.grid.size / 2;
//            }
//            
//            let position = {x: o.document.x + dx, y: o.document.y + dy};
//            if ( !event.shiftKey ) position = c.getSnappedPosition(position);
//            if ( preview && !game.user.isGM ) {
//                const collision = o.checkCollision(o.getCenterPoint(position));
//                if ( collision ) continue;
//            }
//            c.document.x = position.x;
//            c.document.y = position.y;
//            c.renderFlags.set({refreshPosition: true});
//            if ( isVista ) {
//                c.draw();
//            }
//            if ( preview ) c.initializeSources();
//        }
//        
//        // Update perception immediately
//        if ( preview ) canvas.perception.update({refreshLighting: true, refreshVision: true});
//    }
//});

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
    app.object.setFlag("aioros-vistas", "isVista", isVista);
    app.object.setFlag("aioros-vistas", "fov", fov);
    app.object.setFlag("aioros-vistas", "foregroundDistance", foregroundDistance);
    app.object.setFlag("aioros-vistas", "horizonTop", horizonTop);
    app.object.setFlag("aioros-vistas", "maxTop", maxTop);
    if ( isVista ) {
        // probably also global illumination
        // check _repositionObjects
        // disable a bunch of controls unless adapted
        // I'm thinking of a "grid square" being 1/2ft
        const foregroundWidth = 2 * foregroundDistance * Math.tan(fov/2*Math.PI/180);
        canvas.scene.update({
            grid: {type: 0, distance: GRID_DISTANCE, size: Math.round(canvas.scene.width / foregroundWidth * GRID_DISTANCE)}
        });
    }
});

Hooks.on("preCreateToken", (tokenDocument, options) => {
    const isVista = tokenDocument.parent.getFlag("aioros-vistas", "isVista");
    if (isVista) {
        const scaleFactor = getScaleFactor(tokenDocument.y, tokenDocument.parent);
        const height = Constants.TOKEN_HEIGHT / Constants.GRID_DISTANCE * scaleFactor;   // Where do I get the size of the actor?
        const width = Constants.TOKEN_WIDTH / Constants.GRID_DISTANCE * scaleFactor;
        tokenDocument.updateSource({
            texture: {
                src: tokenDocument.actor.img
            },
            width: width,
            height: height
        });
    }
});

Hooks.on("preUpdateToken", (tokenDocument, updates) => {
    const isVista = tokenDocument.parent.getFlag("aioros-vistas", "isVista");
    if (isVista) {
        if (updates.y != tokenDocument.y) {
            updates.y = Math.max(updates.y, tokenDocument.parent.getFlag("aioros-vistas", "maxTop") * tokenDocument.parent.dimensions.sceneHeight);
            const scaleFactor = getScaleFactor(updates.y, tokenDocument.parent);
            updates.width = Constants.TOKEN_WIDTH / Constants.GRID_DISTANCE * scaleFactor;
            updates.height = Constants.TOKEN_HEIGHT / Constants.GRID_DISTANCE * scaleFactor;
            updates.sort = updates.y;
        }
    }
});