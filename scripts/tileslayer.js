import { Constants } from "./constants.js";

export function AVTilesLayerMixin(Base) {
    return class AVTilesLayer extends Base {
        
        _onMouseWheel(event) {
            const isVista = canvas.scene.getFlag(Constants.MODULE_ID, "isVista");
            if (!isVista) return super._onMouseWheel(event);
            
            const snap = event.shiftKey ? 1.5 : 0.5;
            const delta = snap * Math.sign(event.delta) * -1;
            return this.scaleMany({delta, snap});
        }

        async scaleMany({delta, snap, ids, includeLocked=false}={}) {
            if ( (delta ?? null) === null ) {
                throw new Error("A relative delta must be provided.");
            }

            if ( game.paused && !game.user.isGM ) {
                ui.notifications.warn("GAME.PausedWarning", {localize: true});
                return [];
            }

            // Identify the objects requested for rotation
            const objects = this._getMovableObjects(ids, includeLocked);
            if ( !objects.length ) return objects;

            // Conceal any active HUD
            this.hud?.clear();

            // Commit updates to the Scene
            const updateData = objects.map(o => ({
                _id: o.id,
                flags: {
                    [Constants.MODULE_ID]: o._updateScale({delta, snap})
                }
            }));
            await canvas.scene.updateEmbeddedDocuments(this.constructor.documentName, updateData);
            return objects;
        }


    }
}