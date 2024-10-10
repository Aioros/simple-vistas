import { getScaleFactor, getScaleFactorByTopY, getScaleFactorByCenterY } from "./utils.js";
import { Constants } from "./constants.js";

export function AVTokenMixin(Base) {
    return class AVToken extends Base {

        _getShiftedPosition(dx, dy) {
            let result = super._getShiftedPosition(dx, dy);
            const isVista = this.document.parent.getFlag(Constants.MODULE_ID, "isVista");
            if (isVista) {
                const yDiff = result.y - this.document.y;
                result.y = this.document.y + yDiff * getScaleFactor(this.document.y + this.document.height * Constants.GRID_DISTANCE, this.document.parent);
            }
            return result;
        }

        _onDragLeftMove(event) {
            const {destination, clones} = event.interactionData;
            const preview = game.settings.get("core", "tokenDragPreview");
            
            // Pan the canvas if the drag event approaches the edge
            canvas._onDragCanvasPan(event);

            const isVista = this.scene.getFlag(Constants.MODULE_ID, "isVista");
            
            // Determine dragged distance
            const origin = this.getCenterPoint();
            let dx = destination.x - origin.x;
            let dy = destination.y - origin.y;

            // Update the position of each clone
            for ( const c of clones ) {
                const o = c._original;
                let position;

                if ( isVista ) {
                    const originalSize = {
                        width: o.document.getFlag(Constants.MODULE_ID, "originalWidth") * Constants.MD_TOKEN_WIDTH / Constants.GRID_DISTANCE,
                        height: o.document.getFlag(Constants.MODULE_ID, "originalHeight") * Constants.MD_TOKEN_HEIGHT / Constants.GRID_DISTANCE
                    };
                    const minY = this.scene.getFlag(Constants.MODULE_ID, "maxTop") * this.scene.dimensions.sceneHeight + this.scene.dimensions.sceneY;
                    const cloneOriginCenterPoint = o.getCenterPoint();
                    const cloneCenterPoint = {x: cloneOriginCenterPoint.x + dx, y: cloneOriginCenterPoint.y + dy};
                    let scaleFactor = getScaleFactorByCenterY(cloneCenterPoint.y, originalSize.height, c.scene);
                    scaleFactor = Math.max(scaleFactor, getScaleFactor(minY, c.scene));
                    c.document.width = originalSize.width * scaleFactor;
                    c.document.height = originalSize.height * scaleFactor;
                    position = {x: cloneCenterPoint.x - c.document.width / 2 * c.scene.grid.size, y: cloneCenterPoint.y - c.document.height / 2 * c.scene.grid.size};
                    position.y = Math.max(position.y, minY - c.document.height * c.scene.grid.size);
                } else {
                    position = {x: o.document.x + dx, y: o.document.y + dy};
                }

                if ( !event.shiftKey ) position = c.getSnappedPosition(position);
                if ( preview && !game.user.isGM ) {
                    const collision = o.checkCollision(o.getCenterPoint(position));
                    if ( collision ) continue;
                }
                c.document.x = position.x;
                c.document.y = position.y;
                c.document.sort = position.y;
                c.renderFlags.set({refreshPosition: true});
                
                if ( isVista ) {
                    c.draw();
                }

                if ( preview ) c.initializeSources();
            }
        }
    }
}

export function AVTokenDocumentMixin(Base) {
    return class AVTokenDocument extends Base {

        async _preCreate(data, options, user) {
            if ( user.id === game.user.id ) {
                const isVista = this.parent.getFlag(Constants.MODULE_ID, "isVista");
                if (isVista) {
                    data.y = Math.max(data.y, this.parent.getFlag(Constants.MODULE_ID, "maxTop") * this.parent.dimensions.sceneHeight + this.parent.dimensions.sceneY);
                    const scaleFactor = getScaleFactor(data.y, this.parent);
                    const originalWidth = this.width;
                    const originalHeight = this.height;
                    const width = this.width * Constants.MD_TOKEN_WIDTH / Constants.GRID_DISTANCE * scaleFactor;
                    const height = this.height * Constants.MD_TOKEN_HEIGHT / Constants.GRID_DISTANCE * scaleFactor;
                    this.updateSource({
                        x: this.x - width * this.parent.grid.size / 2,
                        y: data.y - (height-1) * this.parent.grid.size,
                        width: width,
                        height: height,
                        texture: { src: this.actor.img },
                        flags: {
                            [Constants.MODULE_ID]: { originalWidth: this.width, originalHeight: this.height }
                        },
                        sort: this.y - (height-1) * this.parent.grid.size,
                    });
                }

            }

            return super._preCreate(data, options, user);
        }

        async _preUpdate(changed, options, user) {
            if ( user.id === game.user.id ) {
                const isVista = this.parent.getFlag(Constants.MODULE_ID, "isVista");
                if (isVista) {
                    if (changed.hasOwnProperty("y")) {
                        const originalSize = {
                            width: this.getFlag(Constants.MODULE_ID, "originalWidth") * Constants.MD_TOKEN_WIDTH / Constants.GRID_DISTANCE,
                            height: this.getFlag(Constants.MODULE_ID, "originalHeight") * Constants.MD_TOKEN_HEIGHT / Constants.GRID_DISTANCE
                        };
                        const minY = this.parent.getFlag(Constants.MODULE_ID, "maxTop") * this.parent.dimensions.sceneHeight + this.parent.dimensions.sceneY;
                        
                        changed.y = Math.max(changed.y, minY - this.height * this.parent.grid.size);
                        const scaleFactor = getScaleFactorByTopY(changed.y, originalSize.height, this.parent);
                        const width = originalSize.width * scaleFactor;
                        const height = originalSize.height * scaleFactor;
                        const sort = changed.y + height * this.parent.grid.size;
                        changed.width = width;
                        changed.height = height;
                        changed.sort = sort;
                    }
                }
            }

            return super._preUpdate(changed, options, user);
        }
    }
}
