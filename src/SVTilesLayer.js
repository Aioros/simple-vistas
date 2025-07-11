import { Constants } from "./constants.js";

export function SVTilesLayerMixin(Base) {
    return class SVTilesLayer extends Base {
        
        // Override - Replace wheel behavior with scaling
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
            const objects = this._getMovableObjects(ids, includeLocked);
            if ( !objects.length ) return objects;
            this.hud?.close();
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