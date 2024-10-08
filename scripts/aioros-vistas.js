import { AVTokenMixin, AVToken } from "./AVToken.js";
//import { sbiWindow } from "./sbiWindow.js";

//class AVScene extends Scene {
//
//    async view() {
//        console.log("Viewing an AVScene");
//        // Note: view() has the canvas.draw() call (21362)
//        return super.view();
//    }
//
//}
//
//CONFIG.Scene.documentClass = AVScene;

//CONFIG.Token.objectClass = AVToken;//AVTokenMixin(Token);

const GRID_DISTANCE = 0.5;
const TOKEN_HEIGHT = 6;
const TOKEN_WIDTH = 5;

const defaultFlags = {
    isVista: false,
    fov: 90,
    foregroundDistance: 10,
    horizonTop: 0.67,
    maxTop: 0.75,
};

Hooks.on("ready", () => {
    console.log(Token.prototype._onDragLeftMove);
    console.log(CONFIG.Token.objectClass.prototype._onDragLeftMove);
    //CONFIG.Token.objectClass.prototype._onDragLeftMove = function(event) {
    Token.prototype._onDragLeftMove = function(event) {
        const {destination, clones} = event.interactionData;
        const preview = game.settings.get("core", "tokenDragPreview");
        
        // Pan the canvas if the drag event approaches the edge
        canvas._onDragCanvasPan(event);
        
        // Determine dragged distance
        const origin = this.getCenterPoint();
        let dx = destination.x - origin.x;
        let dy = destination.y - origin.y;
        
        // Update the position of each clone
        for ( const c of clones ) {
            const o = c._original;

            const isVista = this.scene.getFlag("aioros-vistas", "isVista");
            if (isVista) {
                const scaleFactor = getScaleFactor(c.document.y, c.scene);
                c.document.width = TOKEN_WIDTH / GRID_DISTANCE * scaleFactor;
                c.document.height = TOKEN_HEIGHT / GRID_DISTANCE * scaleFactor;
                dx += (o.document.width - c.document.width) * c.scene.grid.size / 2;
                dy += (o.document.height - c.document.height) * c.scene.grid.size / 2;
            }
            
            let position = {x: o.document.x + dx, y: o.document.y + dy};
            if ( !event.shiftKey ) position = c.getSnappedPosition(position);
            if ( preview && !game.user.isGM ) {
                const collision = o.checkCollision(o.getCenterPoint(position));
                if ( collision ) continue;
            }
            c.document.x = position.x;
            c.document.y = position.y;
            c.renderFlags.set({refreshPosition: true});
            if ( isVista ) {
                c.draw();
            }
            if ( preview ) c.initializeSources();
        }
        
        // Update perception immediately
        if ( preview ) canvas.perception.update({refreshLighting: true, refreshVision: true});
    }
});

//CONFIG.debug.hooks = true;

Hooks.on("renderSceneConfig", (app, html) => {
    console.log(app, html);
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
    </div>`;
    html.find(".sheet-tabs:not(.secondary-tabs)").find(".item").last().after(tab);
    html.find(".sheet-tabs:not(.secondary-tabs)").after(contents);
});

Hooks.on("closeSceneConfig", (app, html) => {
    const isVista = html.find(`input[name="AV_isVista"]`).prop("checked");
    const fov = html.find(`input[name="AV_fov"]`).val();
    const foregroundDistance = html.find(`input[name="AV_foregroundDistance"]`).val();
    const horizonTop = html.find(`input[name="AV_horizonTop"]`).val();
    app.object.setFlag("aioros-vistas", "isVista", isVista);
    app.object.setFlag("aioros-vistas", "fov", fov);
    app.object.setFlag("aioros-vistas", "foregroundDistance", foregroundDistance);
    app.object.setFlag("aioros-vistas", "horizonTop", horizonTop);
    if (isVista) {
        // probably also global illumination
        // check _repositionObjects
        // disable a bunch of controls unless adapted
        // I'm thinking of a "grid square" being 1/2ft
        const foregroundWidth = 2 * foregroundDistance * Math.tan(fov/2*Math.PI/180);
        console.log(foregroundWidth);
        canvas.scene.update({
            grid: {type: 0, distance: GRID_DISTANCE, size: Math.round(canvas.scene.width / foregroundWidth * GRID_DISTANCE)}
        });
    }
});

function getScaleFactor(y, scene) {
    const horizonY = scene.getFlag("aioros-vistas", "horizonTop") * scene.dimensions.sceneHeight;
    //const minY = scene.getFlag("aioros-vistas", "maxTop") * scene.dimensions.sceneHeight;
    return (y - horizonY) / (scene.dimensions.sceneHeight - horizonY);
}

Hooks.on("preCreateToken", (tokenDocument, options) => {
    console.log(tokenDocument, options);
    const isVista = tokenDocument.parent.getFlag("aioros-vistas", "isVista");
    if (isVista) {
        //console.log("PRECREATE");
        const scaleFactor = getScaleFactor(tokenDocument.y, tokenDocument.parent);
        const height = TOKEN_HEIGHT / GRID_DISTANCE * scaleFactor;   // Where do I get the size of the actor?
        const width = TOKEN_WIDTH / GRID_DISTANCE * scaleFactor;
        tokenDocument.updateSource({
            texture: {
                src: tokenDocument.actor.img
            },
            width: width,
            height: height
        });
    }
});

Hooks.on("drawToken", (token) => {
    //console.log("DRAW", token);
});
//
//Hooks.on("createToken", (token) => {
//    console.log("CREATE");
//});

//Hooks.on("refreshToken", (token) => {
//    const isVista = token.scene.getFlag("aioros-vistas", "isVista");
//    if (isVista) {
//        //console.log("REFRESH", token);
//        if (token.isPreview) {
//            //console.log("REFRESH PREVIEW");
//            const scaleFactor = getScaleFactor(token.document.y, token.scene);
//            token.document.width = TOKEN_WIDTH / GRID_DISTANCE * scaleFactor;
//            token.document.height = TOKEN_HEIGHT / GRID_DISTANCE * scaleFactor;
//            //token.document.x += (token._original.document.x - token.document.x) / 2;
//
//            //token.renderFlags.set({"redraw": true});
//            token.draw();
//        }
//    }
//});

Hooks.on("preUpdateToken", (tokenDocument, updates) => {
    const isVista = tokenDocument.parent.getFlag("aioros-vistas", "isVista");
    if (isVista) {
        console.log(tokenDocument.parent.getFlag("aioros-vistas", "maxTop"));
        if (updates.y != tokenDocument.y) {
            updates.y = Math.min(updates.y, tokenDocument.parent.getFlag("aioros-vistas", "maxTop") * tokenDocument.parent.dimensions.sceneHeight);
            const scaleFactor = getScaleFactor(updates.y, tokenDocument.parent);
            updates.width = TOKEN_WIDTH / GRID_DISTANCE * scaleFactor;
            updates.height = TOKEN_HEIGHT / GRID_DISTANCE * scaleFactor;
        }
    }
});