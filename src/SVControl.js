import { Constants } from "./constants.js";

export class SVControlsLayer extends foundry.canvas.layers.InteractionLayer {

    static get layerOptions() {
        return Object.assign(super.layerOptions, {
            name: "svcontrols",
        });
    }

    /** @override */
    static prepareSceneControls() {
        return {
            name: "svcontrols",
            title: "SimpleVistas.SimpleVistas",
            icon: "fa-solid fa-panorama",
            layer: "svcontrols",
            visible: !!canvas.scene?.getFlag(Constants.MODULE_ID, "isVista") && game.user.isGM,
            onChange: (event, active) => {
                if ( active ) canvas.svcontrols.activate();
            },
            tools: {
                modify: {
                    name: "modify",
                    title: "SimpleVistas.Modify",
                    icon: "fas fa-expand",
                    visible: game.user.isGM,
                },
                toggle: {
                    name: "toggle",
                    title: "SimpleVistas.ToggleControls",
                    icon: "fas fa-map-pin",
                    visible: game.user.isGM,
                    toggle: true,
                    active: game.settings.get(Constants.MODULE_ID, "toggleVistaControls"),
                    onChange: (event, toggled) => game.settings.set(Constants.MODULE_ID, "toggleVistaControls", toggled)
                }
            },
            activeTool: "modify",
        };
    }

    interactiveChildren = game.settings.get(Constants.MODULE_ID, "toggleVistaControls");

    _activate() {
        this.controls.visible = true;
    }

    _deactivate() {
        super._deactivate();
        const isToggled = game.settings.get(Constants.MODULE_ID, "toggleVistaControls");
        this.controls.visible = this.interactiveChildren = isToggled;
    }

    async _draw(options = {}) {
        await super._draw(options);

        this.controls = this.addChild(new SVControl());
        this.controls.visible = this.active;
        this.controls.draw(options);
    }

    _onClickLeft(event) {
        if (event.target === this.controls.horizon) {
            event.interactionData.dragControl = this.controls.horizon;
        } else if (event.target === this.controls.maxTop) {
            event.interactionData.dragControl = this.controls.maxTop;
        }
    }
    
    _onDragLeftMove(event) {
        if (event.interactionData.dragControl) {
            const dragControl = event.interactionData.dragControl;
            const r = canvas.dimensions.rect;
            const initialPosition = {x: r.right / 2};
            const offsetX = (canvas.scene._viewPosition.x - initialPosition.x) * canvas.scene.getFlag(Constants.MODULE_ID, "parallax");
            dragControl.removeChildren();
            dragControl.parent._createLineWithRect(dragControl, dragControl.line._lineStyle.color, event.interactionData.destination.y, offsetX);
            dragControl.parent.drawRays();
        }
    }

    _onDragLeftDrop(event) {
        if (event.interactionData.dragControl) {
            const y = event.interactionData.dragControl.centerRect.geometry.graphicsData[0].shape.center.y;
            const flagValue = (y - canvas.scene.dimensions.sceneY) / canvas.scene.dimensions.sceneHeight;
            const flagName = event.interactionData.dragControl === this.controls.horizon ? "horizonTop" : "maxTop";
            canvas.scene.setFlag(Constants.MODULE_ID, flagName, flagValue);
        }
    }

}

export class SVControl extends PIXI.Container {
    
    constructor() {
        super();
        this.horizon = this.addChild(new PIXI.Container());
        this.maxTop = this.addChild(new PIXI.Container());
        this.rays = this.addChild(new PIXI.Container());
        this.interactiveChildren = true;
    }

    _createLineWithRect(container, color, position, offsetX) {
        const controlSize = canvas.scene.grid.size / 4;
        container.line = container.addChild(new PIXI.Graphics());
        container.line.lineStyle(2, color, 1);
        container.line.moveTo(0, position);
        container.line.lineTo(canvas.scene.dimensions.width, position);
        container.centerRect = container.addChild(new PIXI.Graphics());
        container.centerRect.beginFill(color);
        container.centerRect.drawRect(canvas.scene.dimensions.width / 2 - controlSize/2 - offsetX, position - controlSize/2, controlSize, controlSize);
        container.centerRect.endFill();
    }

    drawHorizons() {
        const r = canvas.dimensions.rect;
        const initialPosition = {x: r.right / 2};
        const offsetX = (canvas.scene._viewPosition.x - initialPosition.x) * canvas.scene.getFlag(Constants.MODULE_ID, "parallax");
        const horizonTop = canvas.scene.getFlag(Constants.MODULE_ID, "horizonTop") * canvas.scene.dimensions.sceneHeight + canvas.scene.dimensions.sceneY;
        const maxTop = canvas.scene.getFlag(Constants.MODULE_ID, "maxTop") * canvas.scene.dimensions.sceneHeight + canvas.scene.dimensions.sceneY;

        this.horizon.removeChildren();
        this.horizon.eventMode = "static";
        this._createLineWithRect(this.horizon, 0xff3300, horizonTop, offsetX);
        this.horizon.cursor = "pointer";

        this.maxTop.removeChildren();
        this.maxTop.eventMode = "static";
        this._createLineWithRect(this.maxTop, 0xffd900, maxTop, offsetX);
        this.maxTop.cursor = "pointer";
    }

    drawRays() {
        this.rays.removeChildren();
        const r = canvas.dimensions.rect;
        const initialPosition = {x: r.right / 2};
        const offsetX = (canvas.scene._viewPosition.x - initialPosition.x) * canvas.scene.getFlag(Constants.MODULE_ID, "parallax");
        const horizonTop = this.horizon.centerRect.geometry.graphicsData[0].shape.center.y;
        [[0, 0], [0, 1], [1, 0], [1, 1]].forEach(corner => {
            const cornerX = corner[0] * canvas.scene.dimensions.sceneWidth + canvas.scene.dimensions.sceneX;
            const cornerY = corner[1] * canvas.scene.dimensions.sceneHeight + canvas.scene.dimensions.sceneY;
            const ray = new PIXI.Graphics();
            ray.lineStyle(1, 0x00ffd9, 0.7);
            ray.moveTo(canvas.scene.dimensions.width / 2 - offsetX, horizonTop);
            ray.lineTo(cornerX, cornerY);
            this.rays.addChild(ray);
        });
    }

    draw(options = {}) {
        if (canvas.scene.getFlag(Constants.MODULE_ID, "isVista")) {
            this.drawHorizons();
            this.drawRays();
        }

        const isToggled = game.settings.get(Constants.MODULE_ID, "toggleVistaControls");
        this.visible ||= isToggled;

        return this;
    }
  
}
  