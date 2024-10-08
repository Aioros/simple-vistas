import { getScaleFactor } from "./utils.js";
import { Constants } from "./constants.js";

export function AVTokenMixin(Base) {
    return class AVToken extends Base {
        constructor(...args) {
            super(...args);
            console.log("THIS IS A SPECIAL TOKEN");
        }

        _onDragLeftMove(event) {
            //Token.prototype._onDragLeftMove = function(event) {
            const {destination, clones} = event.interactionData;
            const preview = game.settings.get("core", "tokenDragPreview");
            
            // Pan the canvas if the drag event approaches the edge
            canvas._onDragCanvasPan(event);
            
            // Determine dragged distance
            const origin = this.getCenterPoint();
            let dx = destination.x - origin.x;
            let dy = destination.y - origin.y;
    
            const isVista = this.scene.getFlag("aioros-vistas", "isVista");
            if ( isVista ) {
                dy = Math.max(destination.y, this.scene.getFlag("aioros-vistas", "maxTop") * this.scene.dimensions.sceneHeight) - origin.y;
            }
            
            // Update the position of each clone
            for ( const c of clones ) {
                const o = c._original;
    
                if ( isVista ) {
                    const scaleFactor = getScaleFactor(c.document.y, c.scene);
                    c.document.width = Constants.TOKEN_WIDTH / Constants.GRID_DISTANCE * scaleFactor;
                    c.document.height = Constants.TOKEN_HEIGHT / Constants.GRID_DISTANCE * scaleFactor;
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
    }
}

