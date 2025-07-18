import { getScaleFactor, getScaleFactorByTopY } from "./utils.js";
import { Constants } from "./constants.js";

// Mixin for Token and Tile
export function SVPlaceableMixin(Base) {
    return class SVPlaceable extends Base {

        // Override - Forces tiles to render at the same sort layer as tokens
        _refreshState() {
            super._refreshState();
            const isVista = this.scene.getFlag(Constants.MODULE_ID, "isVista");
            if (isVista && this instanceof foundry.canvas.placeables.Tile) {
                this.mesh.sortLayer = foundry.canvas.groups.PrimaryCanvasGroup.SORT_LAYERS.TOKENS;
            }
        }

        // Override - Adds the parallax offset to the placeable (only in-memory for the local client)
        _refreshPosition() {
            const isVista = this.scene.getFlag(Constants.MODULE_ID, "isVista");
            if (!isVista || !this.mesh || this._original) return super._refreshPosition();
            const {x, y} = this.document;
            if ( (this.position.x !== x) || (this.position.y !== y) ) foundry.canvas.interaction.MouseInteractionManager.emulateMoveEvent();
            this.position.set(x + this.document.svParallaxOffset, y);
            if (this.mesh) {
                this.mesh.position = this.getCenterPoint(this.position);
            }
        }

        // Override - Replaces the resize handle position on tiles
        async _draw(options={}) {
            return super._draw(options).then(() => {
                const isVista = this.scene.getFlag(Constants.MODULE_ID, "isVista");
                if (isVista && this.frame) {
                    this.frame.removeChild(this.frame.handle);
                    this.frame.handle = this.frame.addChild(new foundry.canvas.containers.ResizeHandle([1, 0]));
                    this.frame.handle.eventMode = "static";
                }
            });
        }

        // Override - This will work for both Tokens and Tiles
        getCenterPoint(position) {
            const isVista = this.document.parent.getFlag(Constants.MODULE_ID, "isVista");
            if (!isVista) return super.getCenterPoint(position);
            const {x, y} = position ?? this.document;
            return {x: x + (this.document.svPixelWidth / 2), y: y + (this.document.svPixelHeight / 2)};
        }

        // Gets the center point at the bottom of the placeable
        getBottomCenterPoint() {
            const centerPoint = this.getCenterPoint();
            return {x: centerPoint.x, y: centerPoint.y + this.document.height * this.document.docSizeToPixelsMultiplier};
        }

        // Determines a new size for the placeable from a delta offset
        _updateScale({delta=0, snap=0}={}) {
            let { width: svWidth, height: svHeight } = this.document.flags[Constants.MODULE_ID];
            let ratio;
            if (!svWidth) {
                ratio = this.width / this.height;
                svWidth = Constants.MD_TILE_WIDTH;
                svHeight = svWidth / ratio;
            } else {
                ratio = svWidth / svHeight;
            }
            let width = svWidth + delta;
            if ( snap > 0 ) width = width.toNearest(snap);
            let height = width / ratio;
            return { width, height };
        }

        // Override - Corrects movement with arrow keys
        _getShiftedPosition(dx, dy, dz) {
            let result = super._getShiftedPosition(dx, dy, dz);
            const isVista = this.document.parent.getFlag(Constants.MODULE_ID, "isVista");
            if (isVista) {
                const xDiff = result.x - this.document.x;
                const yDiff = result.y - this.document.y;
                const prevBottomY = this.document.y + this.document.height * this.document.docSizeToPixelsMultiplier;
                const newBottomY = prevBottomY + yDiff;
                const prevScaleFactor = getScaleFactor(prevBottomY, this.document.parent);
                const newScaleFactor = getScaleFactor(newBottomY, this.document.parent);
                const newHeight = this.document.svBaseHeight / Constants.GRID_DISTANCE * this.document.parent.grid.size * newScaleFactor;
                const newWidth = this.document.svBaseWidth / Constants.GRID_DISTANCE * this.document.parent.grid.size * newScaleFactor;
                const newTopY = newBottomY - newHeight;
                const adjustedYDiff = newTopY - this.document.y;
                result.x = Math.round(this.document.x + xDiff * prevScaleFactor);
                result.y = Math.round(this.document.y + adjustedYDiff * prevScaleFactor);
                result.width = Math.round(newWidth / this.document.docSizeToPixelsMultiplier * 10000) / 10000;
                result.height = Math.round(newHeight / this.document.docSizeToPixelsMultiplier * 10000) / 10000;
                result.scaleFactor = newScaleFactor;
            }
            return result;
        }

        _onDragLeftMove(event) {
            const isVista = this.scene.getFlag(Constants.MODULE_ID, "isVista");
            if (!isVista) return super._onDragLeftMove(event);

            // Tiles can be resized with the frame handle
            if ( event.interactionData.dragHandle ) return this._onHandleDragMove(event);

            const {destination, clones} = event.interactionData;
            const preview = game.settings.get("core", "tokenDragPreview");
            canvas._onDragCanvasPan(event);

            const origin = this.getBottomCenterPoint();
            let dx = destination.x - origin.x;
            let dy = destination.y - origin.y;

            for ( const c of clones ) {
                const o = c._original;
                let position;

                const originalSize = {
                    width: o.document.svBaseWidth / Constants.GRID_DISTANCE,
                    height: o.document.svBaseHeight / Constants.GRID_DISTANCE
                };
                const minY = this.scene.getFlag(Constants.MODULE_ID, "maxTop") * this.scene.dimensions.sceneHeight + this.scene.dimensions.sceneY;

                const cloneOriginBottomPoint = o.getBottomCenterPoint();
                const cloneBottomPoint = {x: cloneOriginBottomPoint.x + dx, y: cloneOriginBottomPoint.y + dy};
                let scaleFactor = getScaleFactor(destination.y, c.scene);
                scaleFactor = Math.max(scaleFactor, getScaleFactor(minY, c.scene));
                c.document.width = originalSize.width * (c.scene.grid.size / c.document.docSizeToPixelsMultiplier) * scaleFactor;
                c.document.height = originalSize.height * (c.scene.grid.size / c.document.docSizeToPixelsMultiplier) * scaleFactor;
                // We keep the clone position right above the mouse. I feel that's the most intuitive way to get a feel of the scale factor at the moment
                // I do like having the clone centered better, but it leads to unintuitive behavior when the center of the placeable is above the horizon
                position = {x: cloneBottomPoint.x - c.document.width / 2 * c.document.docSizeToPixelsMultiplier, y: cloneBottomPoint.y - c.document.height * c.document.docSizeToPixelsMultiplier};
                position.y = Math.max(position.y, minY - c.document.height * c.document.docSizeToPixelsMultiplier);
                
                c.document.x = position.x;
                c.document.y = position.y;
                c.document.sort = position.y + c.document.svPixelHeight;
                c.renderFlags.set({refreshPosition: true});
                c.draw();

                if ( preview ) c.initializeSources();
            }
        }

        // Override - The resize handle is in a different corner, so we need a different calculation.
        // The function is the same, but I needed to replace #getResizedDimensions which is private
        // TO DO: avoid scaling to negative y
        _onHandleDragMove(event) {
            const isVista = this.scene.getFlag(Constants.MODULE_ID, "isVista");
            if (!isVista) return super._onHandleDragMove(event);

            canvas._onDragCanvasPan(event);
            const d = this._getResizedDimensions(event);
            this.document.x = d.x;
            this.document.y = d.y;
            this.document.width = d.width;
            this.document.height = d.height;
            this.document.rotation = 0;
            this.document.texture.scaleX = d.sx;
            this.document.texture.scaleY = d.sy;
            this.renderFlags.set({refreshTransform: true});
        }

        _getResizedDimensions(event) {
            const o = this.document._source;
            const {origin, destination} = event.interactionData;
            const dx = destination.x - origin.x;
            const dy = destination.y - origin.y;
            let w = Math.abs(o.width) + dx;
            let h = Math.abs(o.height) - dy;
            if ( event.altKey && this.texture?.valid ) {
                const ar = this.texture.width / this.texture.height;
                if ( Math.abs(w) > Math.abs(h) ) h = w / ar;
                else w = h * ar;
            }
            const {x, y, width, height} = new PIXI.Rectangle(o.x, destination.y, w, h).normalize();
            const sx = (Math.sign(destination.x - o.x) || 1) * o.texture.scaleX;
            const sy = (Math.sign(o.y + o.height - destination.y) || 1) * o.texture.scaleY;
            return {x, y, width, height, sx, sy};
        }

        // Override - When a tile is resized via the handle, we update its Vista size flags accordingly
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

        // Override - Sometimes, the actual height of a placeable will be just exactly the same as the horizon. In that case, our scale factor calculation in _preUpdate,
        // which is based on the top-y coordinate (getScaleFactorByTopY), will fail miserably. To get around that, we calculate the scale factor here (and in _getShiftedPosition too)
        // based on the size of the clone.
        _prepareDragLeftDropUpdates(event) {
            const isVista = canvas.scene.getFlag(Constants.MODULE_ID, "isVista");
            if (!isVista) return super._prepareDragLeftDropUpdates(event);
        
            const updates = [];
            for ( const clone of event.interactionData.clones ) {
                const {document, _original: original} = clone;
                const scaleFactor = document.svPixelHeight / (document.svBaseHeight / Constants.GRID_DISTANCE * document.parent.grid.size);
                const dest = {
                    x: document.x,
                    y: document.y,
                    scaleFactor
                };
                const originalSize = {
                    width: original.document.svBaseWidth / Constants.GRID_DISTANCE,
                    height: original.document.svBaseHeight / Constants.GRID_DISTANCE
                };
                const width = originalSize.width * (document.parent.grid.size / document.docSizeToPixelsMultiplier) * scaleFactor;
                const height = originalSize.height * (document.parent.grid.size / document.docSizeToPixelsMultiplier) * scaleFactor;
                dest.width = Math.round(width * 10000) / 10000;
                dest.height = Math.round(height * 10000) / 10000;

                const target = clone.getCenterPoint(dest);
                if ( !canvas.dimensions.rect.contains(target.x, target.y) ) continue;
                updates.push({_id: original.id, ...dest});
            }
            return updates;
        }
    }
}

// Mixin for TokenDocument and TileDocument
export function SVPlaceableDocumentMixin(Base) {
    return class SVPlaceableDocument extends Base {

        // Token width/height is measured in grid squares, tile width/height is in pixels
        get docSizeToPixelsMultiplier() {
            return this instanceof TokenDocument ? this.parent.grid.size : 1;
        }

        get svPixelHeight() {
            return this.height * this.docSizeToPixelsMultiplier;
        }
        get svPixelWidth() {
            return this.width * this.docSizeToPixelsMultiplier;
        }

        // The width of this object in Vista scenes, in feet.
        get svBaseWidth() {
            return this.getFlag(Constants.MODULE_ID, "width") || (this instanceof TokenDocument ? this.getFlag(Constants.MODULE_ID, "originalWidth") * Constants.MD_TOKEN_WIDTH : Constants.MD_TILE_WIDTH);
        }

        // The width of this object in Vista scenes, in feet.
        get svBaseHeight() {
            return this.getFlag(Constants.MODULE_ID, "height") || (this instanceof TokenDocument ? this.getFlag(Constants.MODULE_ID, "originalHeight") * Constants.MD_TOKEN_HEIGHT: this.height / this.width * this.svBaseWidth);
        }

        // The current parallax offset for this object
        get svParallaxOffset() {
            return this.getParallaxOffset(this.y + this.svPixelHeight);
        }

        getParallaxOffset(bottomY) {
            const r = canvas.dimensions.rect;
            const initialPosition = {x: r.right / 2};
            const offsetX = canvas.scene._viewPosition.x - initialPosition.x;
            const scaleFactor = getScaleFactor(bottomY, this.parent);
            return offsetX * (scaleFactor - 1) * this.parent.getFlag(Constants.MODULE_ID, "parallax");
        }

        // Override - Sets up the new document
        async _preCreate(data, options, user) {
            if ( user.id === game.user.id ) {
                const isVista = this.parent.getFlag(Constants.MODULE_ID, "isVista");
                if (isVista) {
                    // data.y is the top-left corner of the token/tile. We add half height to "reach" the mouse position
                    data.y += data.height / 2;
                    data.y = Math.max(data.y, this.parent.getFlag(Constants.MODULE_ID, "maxTop") * this.parent.dimensions.sceneHeight + this.parent.dimensions.sceneY);
                    const scaleFactor = getScaleFactor(data.y, this.parent);
                    // originalWidth and originalHeight are mostly used for tokens without Vista flags: we use their original token size as a multiplier on the default token Vista size
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
                    // Fix for pf2e
                    if (data.flags?.pf2e) {
                        updateData.flags.pf2e = {linkToActorSize: false};
                    }
                    
                    // For tokens, use the portrait image
                    if (this.actor?.img && game.settings.get(Constants.MODULE_ID, "tokenSource") === "portrait") {
                        updateData.texture = { src: this.actor.img };
                    }
                    this.updateSource(updateData);
                }

            }

            return super._preCreate(data, options, user);
        }

        // Override - Manages updates to the document
        async _preUpdate(changed, options, user) {
            const isVista = this.parent.getFlag(Constants.MODULE_ID, "isVista");

            if (options.movement?.[this.id] && isVista && user.id === game.user.id) {
                const movementData = options.movement[this.id];
                const destination = movementData.waypoints.at(-1);

                if (destination.hasOwnProperty("y") && destination.y !== this.y) {
                    const originalSize = {
                        width: this.svBaseWidth / Constants.GRID_DISTANCE,
                        height: this.svBaseHeight / Constants.GRID_DISTANCE
                    };
                    const minY = this.parent.getFlag(Constants.MODULE_ID, "maxTop") * this.parent.dimensions.sceneHeight + this.parent.dimensions.sceneY;
                    let scaleFactor, newBottomY;
                    if (false && destination.scaleFactor) {
                        // REMOVED FOR NOW, TO BE REVIEWED
                        // This happens when the base height aligns exactly with the horizon, we precalculate the scaleFactor in _prepareDragLeftDropUpdates and _getShiftedPosition
                        scaleFactor = destination.scaleFactor;
                        newBottomY = destination.y + originalSize.height * this.docSizeToPixelsMultiplier * scaleFactor;
                    } else {
                        newBottomY = destination.y + originalSize.height * this.docSizeToPixelsMultiplier * getScaleFactorByTopY(destination.y, originalSize.height, this.parent);
                        newBottomY = Math.max(newBottomY, minY);
                        scaleFactor = getScaleFactor(newBottomY, this.parent);
                    }
                    
                    destination.y = Math.round(newBottomY - originalSize.height * this.docSizeToPixelsMultiplier * scaleFactor);
                    const width = originalSize.width * (this.parent.grid.size / this.docSizeToPixelsMultiplier) * scaleFactor;
                    const height = originalSize.height * (this.parent.grid.size / this.docSizeToPixelsMultiplier) * scaleFactor;
                    const sort = destination.y + height * this.docSizeToPixelsMultiplier;
                    destination.width = Math.round(width * 10000) / 10000;
                    destination.height = Math.round(height * 10000) / 10000;
                    changed.sort = Math.round(sort);
                }

                if (destination.hasOwnProperty("elevation") && destination.elevation !== this.elevation) {
                    foundry.utils.mergeObject(changed, {texture: {anchorY: 0.5 + destination.elevation / (this.height * (this.docSizeToPixelsMultiplier / this.parent.grid.size) * Constants.GRID_DISTANCE)}});
                }
            }

            const newFlagHeight = changed.flags?.[Constants.MODULE_ID]?.height;
            const currentFlagHeight = this.flags?.[Constants.MODULE_ID]?.height;
            if (newFlagHeight && newFlagHeight !== currentFlagHeight) {
                const currentScaleFactor = getScaleFactor(this.y + this.svPixelHeight, this.parent);
                const currentBaseWidth = this.svPixelWidth / this.parent.grid.size * Constants.GRID_DISTANCE / currentScaleFactor;
                const currentBaseHeight = this.svPixelHeight / this.parent.grid.size * Constants.GRID_DISTANCE / currentScaleFactor;                        
                const transitionScaleFactorWidth = changed.flags?.[Constants.MODULE_ID]?.width / currentBaseWidth;
                const transitionScaleFactorHeight = newFlagHeight / currentBaseHeight;
                changed.width = transitionScaleFactorWidth * this.width;
                changed.height = transitionScaleFactorHeight * this.height;
                changed.y = Math.round(this.y - (transitionScaleFactorHeight - 1) * this.svPixelHeight);
                changed.sort = Math.round(changed.y + changed.height * this.docSizeToPixelsMultiplier);
            }

            return super._preUpdate(changed, options, user);
        }

        // Disable auto-rotation because it never makes sense in our scenes
        async _preUpdateMovement(movement, operation) {
            movement.autoRotate &&= !this.parent.getFlag(Constants.MODULE_ID, "isVista");
        }

    }
}

export function SVPlaceableHUDMixin(Base) {
    return class SVPlaceableHUD extends Base {

        _onRender(context, options) {
            const isVista = this.document.parent.getFlag(Constants.MODULE_ID, "isVista");
            if (!isVista) return super._onRender(context, options);
            const mirror = document.createElement("div");
            mirror.classList.add("control-icon");
            mirror.setAttribute("data-tooltip", "SimpleVistas.Mirror");
            mirror.setAttribute("data-action", "mirror");
            const mirrorIcon = document.createElement("i");
            mirrorIcon.classList.add("fas", "fa-right-left");
            mirror.appendChild(mirrorIcon);
            this.element.querySelector(".col.left").appendChild(mirror);
            this.element.querySelector(`.control-icon[data-action="mirror"]`).addEventListener("click", () => {
                this.document.update({"texture.scaleX": this.document.texture.scaleX * -1});
            });

            // We try to keep the hud at a consistent size
            const b = this.object.bounds;
            const {width, height} = this.document;
            const ratio = 1.0;
            this.element.style.width = `${width * canvas.dimensions.size / ratio}px`;
            this.element.style.height = `${height * canvas.dimensions.size / ratio}px`;
            this.element.style.left = b.left;
            this.element.style.top = b.top;
            this.element.style.transform = `scale(${ratio})`;
            this.element.classList.toggle("large", height >= 2);
        }

    }
}