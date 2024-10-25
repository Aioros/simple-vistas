import { getScaleFactor, getScaleFactorByTopY } from "./utils.js";
import { Constants } from "./constants.js";

export function AVPlaceableMixin(Base) {
    return class AVPlaceable extends Base {
        _refreshState() {
            super._refreshState();
            const isVista = this.scene.getFlag(Constants.MODULE_ID, "isVista");
            if (isVista && this instanceof Tile) {
                this.mesh.sortLayer = PrimaryCanvasGroup.SORT_LAYERS.TOKENS;
            }
        }

        _refreshPosition() {
            const isVista = this.scene.getFlag(Constants.MODULE_ID, "isVista");
            if (!isVista || !this.mesh || this._original) return super._refreshPosition();
            const {x, y} = this.document;
            if ( (this.position.x !== x) || (this.position.y !== y) ) MouseInteractionManager.emulateMoveEvent();
            this.position.set(x + this.document.avParallaxOffset, y);
            if (this.mesh) {
                this.mesh.position = this.getCenterPoint(this.position);
            }
        }

        async _draw(options={}) {
            return super._draw(options).then(() => {
                const isVista = this.scene.getFlag(Constants.MODULE_ID, "isVista");
                if (isVista && this.frame) {
                    this.frame.removeChild(this.frame.handle);
                    this.frame.handle = this.frame.addChild(new ResizeHandle([1, 0]));
                    this.frame.handle.eventMode = "static";
                }
            });
        }

        getCenterPoint(position) {
            const isVista = this.document.parent.getFlag(Constants.MODULE_ID, "isVista");
            if (!isVista) return super.getCenterPoint(position);
            const {x, y} = position ?? this.document;
            return {x: x + (this.document.avPixelWidth / 2), y: y + (this.document.avPixelHeight / 2)};
        }

        getBottomCenterPoint() {
            const centerPoint = this.getCenterPoint();
            return {x: centerPoint.x, y: centerPoint.y + this.document.height * this.document.docSizeToPixelsMultiplier};
        }

        _updateScale({delta=0, snap=0}={}) {
            const avFlags = this.document.flags[Constants.MODULE_ID];
            const ratio = avFlags.width / avFlags.height;
            let width = avFlags.width + delta;
            if ( snap > 0 ) width = width.toNearest(snap);
            let height = width / ratio;
            return { width, height };
        }

        _getShiftedPosition(dx, dy) {
            let result = super._getShiftedPosition(dx, dy);
            const isVista = this.document.parent.getFlag(Constants.MODULE_ID, "isVista");
            if (isVista) {
                const xDiff = result.x - this.document.x;
                const yDiff = result.y - this.document.y;
                const prevBottomY = this.document.y + this.document.height * this.document.docSizeToPixelsMultiplier;
                const newBottomY = prevBottomY + yDiff;
                const prevScaleFactor = getScaleFactor(prevBottomY, this.document.parent);
                const newScaleFactor = getScaleFactor(newBottomY, this.document.parent);
                const newHeight = this.document.avBaseHeight / Constants.GRID_DISTANCE * this.document.parent.grid.size * newScaleFactor;
                const newTopY = newBottomY - newHeight;
                const adjustedYDiff = newTopY - this.document.y;
                result.x = this.document.x + xDiff * prevScaleFactor;
                result.y = this.document.y + adjustedYDiff * prevScaleFactor;
                result.scaleFactor = newScaleFactor;
            }
            return result;
        }

        _onDragLeftMove(event) {    
            const isVista = this.scene.getFlag(Constants.MODULE_ID, "isVista");
            if (!isVista) return super._onDragLeftMove(event);

            if ( event.interactionData.dragHandle ) return this._onHandleDragMove(event);

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
                c.document.sort = position.y + c.document.avPixelHeight;
                c.renderFlags.set({refreshPosition: true});
                
                c.draw();

                if ( preview ) c.initializeSources();
            }
        }

        _onHandleDragMove(event) {
            canvas._onDragCanvasPan(event);
            const interaction = event.interactionData;
            const d = this._getResizedDimensions(event);
            this.document.x = d.x;
            this.document.y = d.y;
            this.document.width = d.width;
            this.document.height = d.height;
            this.document.rotation = 0;
        
            // Mirror horizontally or vertically
            this.document.texture.scaleX = d.sx;
            this.document.texture.scaleY = d.sy;
            this.renderFlags.set({refreshTransform: true});
        }

        _onHandleDragDrop(event) {
            const interaction = event.interactionData;
            interaction.resetDocument = false;
            const d = this._getResizedDimensions(event);
            const scaleFactor = getScaleFactor(d.y + d.height, this.document.parent);
            this.document.update({
                flags: {
                    [Constants.MODULE_ID]: {
                        width: d.width * this.document.docSizeToPixelsMultiplier / this.document.parent.grid.size * Constants.GRID_DISTANCE / scaleFactor,
                        height: d.height * this.document.docSizeToPixelsMultiplier / this.document.parent.grid.size * Constants.GRID_DISTANCE / scaleFactor
                    }
                }
            }).then(() => this.renderFlags.set({refreshTransform: true}));
        }

        _getResizedDimensions(event) {
            const o = this.document._source;
            const {origin, destination} = event.interactionData;
        
            // Identify the new width and height as positive dimensions
            const dx = destination.x - origin.x;
            const dy = destination.y - origin.y;
            let w = Math.abs(o.width) + dx;
            let h = Math.abs(o.height) - dy;
        
            // Constrain the aspect ratio using the ALT key
            if ( event.altKey && this.texture?.valid ) {
                const ar = this.texture.width / this.texture.height;
                if ( Math.abs(w) > Math.abs(h) ) h = w / ar;
                else w = h * ar;
            }
            const {x, y, width, height} = new PIXI.Rectangle(o.x, destination.y, w, h).normalize();
        
            // Comparing destination coord and source coord to apply mirroring and append to nr
            const sx = (Math.sign(destination.x - o.x) || 1) * o.texture.scaleX;
            const sy = (Math.sign(o.y + o.height - destination.y) || 1) * o.texture.scaleY;
            return {x, y, width, height, sx, sy};
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

export function AVPlaceableDocumentMixin(Base) {
    return class AVPlaceableDocument extends Base {

        get docSizeToPixelsMultiplier() {
            return this instanceof TokenDocument ? this.parent.grid.size : 1;
        }

        get avBaseWidth() {
            return this.getFlag(Constants.MODULE_ID, "width") || (this instanceof TokenDocument ? this.getFlag(Constants.MODULE_ID, "originalWidth") * Constants.MD_TOKEN_WIDTH : Constants.MD_TILE_WIDTH);
        }

        get avBaseHeight() {
            return this.getFlag(Constants.MODULE_ID, "height") || (this instanceof TokenDocument ? this.getFlag(Constants.MODULE_ID, "originalHeight") * Constants.MD_TOKEN_HEIGHT: Constants.MD_TILE_HEIGHT);
        }

        get avPixelHeight() {
            return this.height * this.docSizeToPixelsMultiplier;
        }
        get avPixelWidth() {
            return this.width * this.docSizeToPixelsMultiplier;
        }

        get avParallaxOffset() {
            return this.getParallaxOffset(this.y + this.avPixelHeight);
        }

        getParallaxOffset(bottomY) {
            const r = canvas.dimensions.rect;
            const initialPosition = {x: r.right / 2};
            const offsetX = canvas.scene._viewPosition.x - initialPosition.x;
            const scaleFactor = getScaleFactor(bottomY, this.parent);
            return offsetX * (scaleFactor - 1) * this.parent.getFlag(Constants.MODULE_ID, "parallax");
        }

        async _preCreate(data, options, user) {
            if ( user.id === game.user.id ) {
                const isVista = this.parent.getFlag(Constants.MODULE_ID, "isVista");
                if (isVista) {
                    data.y += data.height / 2;
                    data.y = Math.max(data.y, this.parent.getFlag(Constants.MODULE_ID, "maxTop") * this.parent.dimensions.sceneHeight + this.parent.dimensions.sceneY);
                    const scaleFactor = getScaleFactor(data.y, this.parent);
                    const originalWidth = this instanceof TokenDocument ? this.width : 1;
                    const originalHeight = this instanceof TokenDocument ? this.height : 1;
                    const baseWidth = data.flags?.[Constants.MODULE_ID]?.width || (this instanceof TokenDocument ? originalWidth * Constants.MD_TOKEN_WIDTH : Constants.MD_TILE_WIDTH);
                    const baseHeight = data.flags?.[Constants.MODULE_ID]?.height || (this instanceof TokenDocument ? originalHeight * Constants.MD_TOKEN_HEIGHT: data.height / data.width * baseWidth);
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
                        sort: this.y + height * this.docSizeToPixelsMultiplier
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
                    if (changed.hasOwnProperty("y") && changed.y != this.y || changed.hasOwnProperty("scaleFactor")) {
                        const originalSize = {
                            width: (changed.flags?.[Constants.MODULE_ID]?.width || this.avBaseWidth) / Constants.GRID_DISTANCE,
                            height: (changed.flags?.[Constants.MODULE_ID]?.height || this.avBaseHeight) / Constants.GRID_DISTANCE
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
                    } else if (changed.flags?.[Constants.MODULE_ID]?.height) {
                        const currentScaleFactor = getScaleFactor(this.y + this.avPixelHeight, this.parent);
                        const currentBaseWidth = this.avPixelWidth / this.parent.grid.size * Constants.GRID_DISTANCE / currentScaleFactor;
                        const currentBaseHeight = this.avPixelHeight / this.parent.grid.size * Constants.GRID_DISTANCE / currentScaleFactor;                        
                        const transitionScaleFactorWidth = changed.flags?.[Constants.MODULE_ID]?.width / currentBaseWidth;
                        const transitionScaleFactorHeight = changed.flags?.[Constants.MODULE_ID]?.height / currentBaseHeight;
                        changed.width = transitionScaleFactorWidth * this.width;
                        changed.height = transitionScaleFactorHeight * this.height;
                        changed.y = this.y - (transitionScaleFactorHeight - 1) * this.avPixelHeight;
                        changed.sort = changed.y + changed.height * this.docSizeToPixelsMultiplier;
                    }
                    if (changed.hasOwnProperty("elevation") && changed.elevation != this.elevation) {
                        foundry.utils.mergeObject(changed, {texture: {anchorY: 0.5 + changed.elevation / (this.height * (this.docSizeToPixelsMultiplier / this.parent.grid.size) * Constants.GRID_DISTANCE)}});
                    }
                    if (changed.hasOwnProperty("x") && changed.x != this.x) {
                        // we store the x as if the view was centered, each client will add their own offset
                        const parallaxOffset = this.getParallaxOffset(changed.y + changed.height * this.docSizeToPixelsMultiplier);
                        changed.x -= parallaxOffset;
                    }
                    if (changed.flags?.[Constants.MODULE_ID]?.width) {
                        changed.flags[Constants.MODULE_ID].width = Math.round(changed.flags[Constants.MODULE_ID].width * 100) / 100;
                    }
                    if (changed.flags?.[Constants.MODULE_ID]?.height) {
                        changed.flags[Constants.MODULE_ID].height = Math.round(changed.flags[Constants.MODULE_ID].height * 100) / 100;
                    }
                }
            }

            return super._preUpdate(changed, options, user);
        }

    }
}

export function AVPlaceableHUDMixin(Base) {
    return class AVPlaceableHUD extends Base {

        setPosition(_position) {
            const isVista = this.document.parent.getFlag(Constants.MODULE_ID, "isVista");
            if (!isVista) return super.setPosition(_position);
            const b = this.object.bounds;
            const {width, height} = this.document;
            const ratio = 1.0;
            const position = {width: width * canvas.dimensions.size / ratio, height: height * canvas.dimensions.size / ratio, left: b.left, top: b.top};
            position.transform = `scale(${ratio})`;
            this.element.css(position);
            this.element[0].classList.toggle("large", height >= 2);
        }

    }
}