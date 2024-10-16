import { getScaleFactor, getScaleFactorByTopY } from "./utils.js";
import { Constants } from "./constants.js";

export function AVTokenMixin(Base) {
    return class AVToken extends Base {

        getCenterPoint(position) {
            const isVista = this.document.parent.getFlag(Constants.MODULE_ID, "isVista");
            if (!isVista) return super.getCenterPoint(position);
            const {x, y} = position ?? this.document;
            return {x: x + (this.document.avPixelWidth / 2), y: y + (this.document.avPixelHeight / 2)};
        }

        getBottomCenterPoint() {
            const centerPoint = this.getCenterPoint();
            return {x: centerPoint.x, y: centerPoint.y + this.document.height * this.scene.grid.size};
        }

        _getShiftedPosition(dx, dy) {
            let result = super._getShiftedPosition(dx, dy);
            const isVista = this.document.parent.getFlag(Constants.MODULE_ID, "isVista");
            if (isVista) {
                const yDiff = result.y - this.document.y;
                const prevBottomY = this.document.y + this.document.height * this.document.parent.grid.size;
                const newBottomY = prevBottomY + yDiff;
                const prevScaleFactor = getScaleFactor(prevBottomY, this.document.parent);
                const newScaleFactor = getScaleFactor(newBottomY, this.document.parent);
                const newHeight = this.document.avBaseHeight / Constants.GRID_DISTANCE * this.document.parent.grid.size * newScaleFactor;
                const newTopY = newBottomY - newHeight;
                const adjustedYDiff = newTopY - this.document.y;
                result.y = this.document.y + adjustedYDiff * prevScaleFactor;
                result.scaleFactor = newScaleFactor;
            }
            return result;
        }

        _onDragLeftMove(event) {    
            const isVista = this.scene.getFlag(Constants.MODULE_ID, "isVista");
            if (!isVista) return super._onDragLeftMove(event);

            const {destination, clones} = event.interactionData;
            const preview = game.settings.get("core", "tokenDragPreview");
            
            // Pan the canvas if the drag event approaches the edge
            canvas._onDragCanvasPan(event);

            // Determine dragged distance
            const origin = this.getBottomCenterPoint();
            let dx = destination.x - origin.x;
            let dy = destination.y - origin.y;

            // Update the position of each clone
            for ( const c of clones ) {
                const o = c._original;
                let position;

                const originalSize = {
                    width: o.document.avBaseWidth / Constants.GRID_DISTANCE,
                    height: o.document.avBaseHeight / Constants.GRID_DISTANCE
                };
                const minY = this.scene.getFlag(Constants.MODULE_ID, "maxTop") * this.scene.dimensions.sceneHeight + this.scene.dimensions.sceneY;

                const cloneOriginBottomPoint = o.getBottomCenterPoint();
                const cloneBottomPoint = {x: cloneOriginBottomPoint.x + dx, y: cloneOriginBottomPoint.y + dy};
                let scaleFactor = getScaleFactor(destination.y, c.scene);
                scaleFactor = Math.max(scaleFactor, getScaleFactor(minY, c.scene));
                c.document.width = originalSize.width * (c.scene.grid.size / c.document.docSizeToPixelsMultiplier) * scaleFactor;
                c.document.height = originalSize.height * (c.scene.grid.size / c.document.docSizeToPixelsMultiplier) * scaleFactor;
                position = {x: cloneBottomPoint.x - c.document.width / 2 * c.document.docSizeToPixelsMultiplier, y: cloneBottomPoint.y - c.document.height * c.document.docSizeToPixelsMultiplier};
                position.y = Math.max(position.y, minY - c.document.height * c.document.docSizeToPixelsMultiplier);
                
                c.document.x = position.x;
                c.document.y = position.y;
                c.document.sort = position.y;
                c.renderFlags.set({refreshPosition: true});
                
                c.draw();

                if ( preview ) c.initializeSources();
            }
        }

        _prepareDragLeftDropUpdates(event) {
            const isVista = canvas.scene.getFlag(Constants.MODULE_ID, "isVista");
            if (!isVista) return super._prepareDragLeftDropUpdates(event);

            const updates = [];
            for ( const clone of event.interactionData.clones ) {
                const {document, _original: original} = clone;
                const dest = {x: document.x, y: document.y, scaleFactor: document.avPixelHeight / (document.avBaseHeight / Constants.GRID_DISTANCE * document.parent.grid.size)};
                const target = clone.getCenterPoint(dest);
                if ( !canvas.dimensions.rect.contains(target.x, target.y) ) continue;
                updates.push({_id: original.id, x: dest.x, y: dest.y, scaleFactor: dest.scaleFactor});
            }
            return updates;
        }
    }
}

export function AVTokenDocumentMixin(Base) {
    return class AVTokenDocument extends Base {

        get docSizeToPixelsMultiplier() {
            return TokenDocument.isPrototypeOf(Base) ? this.parent.grid.size : 1
        }

        get avBaseWidth() {
            return this.getFlag(Constants.MODULE_ID, "width") || (TokenDocument.isPrototypeOf(Base) ? this.getFlag(Constants.MODULE_ID, "originalWidth") * Constants.MD_TOKEN_WIDTH : Constants.MD_TILE_WIDTH);
        }

        get avBaseHeight() {
            return this.getFlag(Constants.MODULE_ID, "height") || (TokenDocument.isPrototypeOf(Base) ? this.getFlag(Constants.MODULE_ID, "originalHeight") * Constants.MD_TOKEN_HEIGHT: Constants.MD_TILE_HEIGHT);
        }

        get avPixelHeight() {
            return this.height * this.docSizeToPixelsMultiplier;
        }
        get avPixelWidth() {
            return this.width * this.docSizeToPixelsMultiplier;
        }

        async _preCreate(data, options, user) {
            if ( user.id === game.user.id ) {
                const isVista = this.parent.getFlag(Constants.MODULE_ID, "isVista");
                if (isVista) {
                    data.y = Math.max(data.y, this.parent.getFlag(Constants.MODULE_ID, "maxTop") * this.parent.dimensions.sceneHeight + this.parent.dimensions.sceneY);
                    const scaleFactor = getScaleFactor(data.y, this.parent);
                    const originalWidth = TokenDocument.isPrototypeOf(Base) ? this.width : 1;
                    const originalHeight = TokenDocument.isPrototypeOf(Base) ? this.height : 1;
                    const baseWidth = data.flags?.[Constants.MODULE_ID]?.width || (TokenDocument.isPrototypeOf(Base) ? originalWidth * Constants.MD_TOKEN_WIDTH : Constants.MD_TILE_WIDTH);
                    const baseHeight = data.flags?.[Constants.MODULE_ID]?.height || (TokenDocument.isPrototypeOf(Base) ? originalHeight * Constants.MD_TOKEN_HEIGHT: Constants.MD_TILE_HEIGHT);
                    const width = baseWidth / Constants.GRID_DISTANCE * (this.parent.grid.size / this.docSizeToPixelsMultiplier) * scaleFactor;
                    const height = baseHeight / Constants.GRID_DISTANCE * (this.parent.grid.size / this.docSizeToPixelsMultiplier) * scaleFactor;
                    const updateData = {
                        x: this.x - width * this.docSizeToPixelsMultiplier / 2,
                        y: data.y - height * this.docSizeToPixelsMultiplier,
                        width: width,
                        height: height,
                        flags: {
                            [Constants.MODULE_ID]: { originalWidth: originalWidth, originalHeight: originalHeight }
                        },
                        sort: this.y - height * this.docSizeToPixelsMultiplier
                    };
                    if (this.actor?.img) {
                        updateData.texture = { src: this.actor.img };
                    }
                    this.updateSource(updateData);
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
                            width: this.avBaseWidth / Constants.GRID_DISTANCE,
                            height: this.avBaseHeight / Constants.GRID_DISTANCE
                        };
                        const minY = this.parent.getFlag(Constants.MODULE_ID, "maxTop") * this.parent.dimensions.sceneHeight + this.parent.dimensions.sceneY;
                        let scaleFactor, newBottomY;
                        if (changed.hasOwnProperty("scaleFactor")) { // this happens when the base height aligns exactly with the horizon, we precalculate the scaleFactor in _prepareDragLeftDropUpdates and _getShiftedPosition
                            scaleFactor = changed.scaleFactor;
                            newBottomY = changed.y + originalSize.height * this.docSizeToPixelsMultiplier * scaleFactor;
                        } else {
                            newBottomY = changed.y + originalSize.height * this.docSizeToPixelsMultiplier * getScaleFactorByTopY(changed.y, originalSize.height, this.parent);
                            newBottomY = Math.max(newBottomY, minY);
                            scaleFactor = getScaleFactor(newBottomY, this.parent);
                        }
                        changed.y = newBottomY - originalSize.height * this.docSizeToPixelsMultiplier * scaleFactor;
                        const width = originalSize.width * (this.parent.grid.size / this.docSizeToPixelsMultiplier) * scaleFactor;
                        const height = originalSize.height * (this.parent.grid.size / this.docSizeToPixelsMultiplier) * scaleFactor;
                        const sort = changed.y + height * this.docSizeToPixelsMultiplier;
                        changed.width = width;
                        changed.height = height;
                        changed.sort = sort;
                    }
                    if (changed.hasOwnProperty("elevation")) {
                        foundry.utils.mergeObject(changed, {texture: {anchorY: 0.5 + changed.elevation / (this.height * (this.docSizeToPixelsMultiplier / this.parent.grid.size) * Constants.GRID_DISTANCE)}});
                    }
                }
            }

            return super._preUpdate(changed, options, user);
        }
    }
}

export function AVTokenHUDMixin(Base) {
    return class AVTokenHUD extends Base {

        setPosition(_position) {
            const isVista = this.document.parent.getFlag(Constants.MODULE_ID, "isVista");
            if (!isVista) return super.setPosition(_position);
            const b = this.object.bounds;
            const {width, height} = this.document;
            const ratio = 1.5;
            const position = {width: width * canvas.dimensions.size / ratio, height: height * canvas.dimensions.size / ratio, left: b.left, top: b.top};
            position.transform = `scale(${ratio})`;
            this.element.css(position);
            this.element[0].classList.toggle("large", height >= 2);
        }

    }
}