import { Constants } from "./constants.js";

export class AVControlsLayer extends InteractionLayer {

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

        this.controls = this.addChild(new AVControl());
        this.controls.visible = this.active;
        this.controls.draw(options);
    }

}

export class AVControl extends PIXI.Container {

    constructor() {
        super();
        this.horizon = this.addChild(new PIXI.Container());
        this.maxTop = this.addChild(new PIXI.Container());
        this.rays = this.addChild(new PIXI.Container());
    }

    drawHorizons() {
        const r = canvas.dimensions.rect;
        const initialPosition = {x: r.right / 2};
        const offsetX = canvas.scene._viewPosition.x - initialPosition.x;
        const horizonTop = canvas.scene.getFlag(Constants.MODULE_ID, "horizonTop") *  canvas.scene.dimensions.sceneHeight + canvas.scene.dimensions.sceneY;
        const maxTop = canvas.scene.getFlag(Constants.MODULE_ID, "maxTop") *  canvas.scene.dimensions.sceneHeight + canvas.scene.dimensions.sceneY;

        this.horizon.removeChildren();
        this.horizon.line = this.horizon.addChild(new PIXI.Graphics());
        this.horizon.line.lineStyle(2, 0xff3300, 1);
        this.horizon.line.moveTo(0, horizonTop);
        this.horizon.line.lineTo(canvas.scene.dimensions.width, horizonTop);
        this.horizon.centerRect = this.horizon.addChild(new PIXI.Graphics());
        this.horizon.centerRect.beginFill(0xff3300);
        this.horizon.centerRect.drawRect(canvas.scene.dimensions.width / 2 - 15 - offsetX, horizonTop - 15, 30, 30);
        this.horizon.centerRect.endFill();

        this.maxTop.removeChildren();
        this.maxTop.line = this.horizon.addChild(new PIXI.Graphics());
        this.maxTop.line.lineStyle(1, 0xffd900, 1);
        this.maxTop.line.moveTo(0, maxTop);
        this.maxTop.line.lineTo(canvas.scene.dimensions.width, maxTop);
        this.maxTop.centerRect = this.horizon.addChild(new PIXI.Graphics());
        this.maxTop.centerRect.beginFill(0xffd900);
        this.maxTop.centerRect.drawRect(canvas.scene.dimensions.width / 2 - 15 - offsetX, maxTop - 15, 30, 30);
        this.maxTop.centerRect.endFill();
    }

    drawRays() {
        this.rays.removeChildren();
        const r = canvas.dimensions.rect;
        const initialPosition = {x: r.right / 2};
        const offsetX = canvas.scene._viewPosition.x - initialPosition.x;
        const horizonTop = canvas.scene.getFlag(Constants.MODULE_ID, "horizonTop") *  canvas.scene.dimensions.sceneHeight + canvas.scene.dimensions.sceneY;
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

        // Add control interactivity
        this.eventMode = "static";
        this.interactiveChildren = false;
        this.hitArea = new PIXI.Rectangle(-2, -2, 44, 44);
        this.cursor = "pointer";
    
        // Activate listeners
        this.removeAllListeners();
        this.on("pointerover", this._onMouseOver).on("pointerout", this._onMouseOut)
          .on("pointerdown", this._onMouseDown).on("rightdown", this._onRightDown);
        return this;
    }
  
    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */
  
    /**
     * Handle mouse over events on a door control icon.
     * @param {PIXI.FederatedEvent} event      The originating interaction event
     * @protected
     */
    _onMouseOver(event) {
      event.stopPropagation();
      const canControl = game.user.can("WALL_DOORS");
      const blockPaused = game.paused && !game.user.isGM;
      if ( !canControl || blockPaused ) return false;
      this.border.visible = true;
      this.icon.alpha = 1.0;
      this.bg.alpha = 0.25;
      canvas.walls.hover = this.wall;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Handle mouse out events on a door control icon.
     * @param {PIXI.FederatedEvent} event      The originating interaction event
     * @protected
     */
    _onMouseOut(event) {
      event.stopPropagation();
      if ( game.paused && !game.user.isGM ) return false;
      this.border.visible = false;
      this.icon.alpha = 0.6;
      this.bg.alpha = 0;
      canvas.walls.hover = null;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Handle left mouse down events on a door control icon.
     * This should only toggle between the OPEN and CLOSED states.
     * @param {PIXI.FederatedEvent} event      The originating interaction event
     * @protected
     */
    _onMouseDown(event) {
      if ( event.button !== 0 ) return; // Only support standard left-click
      event.stopPropagation();
      const { ds } = this.wall.document;
      const states = CONST.WALL_DOOR_STATES;
  
      // Determine whether the player can control the door at this time
      if ( !game.user.can("WALL_DOORS") ) return false;
      if ( game.paused && !game.user.isGM ) {
        ui.notifications.warn("GAME.PausedWarning", {localize: true});
        return false;
      }
  
      const sound = !(game.user.isGM && game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.ALT));
  
      // Play an audio cue for testing locked doors, only for the current client
      if ( ds === states.LOCKED ) {
        if ( sound ) this.wall._playDoorSound("test");
        return false;
      }
  
      // Toggle between OPEN and CLOSED states
      return this.wall.document.update({ds: ds === states.CLOSED ? states.OPEN : states.CLOSED}, {sound});
    }
  
    /* -------------------------------------------- */
  
    /**
     * Handle right mouse down events on a door control icon.
     * This should toggle whether the door is LOCKED or CLOSED.
     * @param {PIXI.FederatedEvent} event      The originating interaction event
     * @protected
     */
    _onRightDown(event) {
      event.stopPropagation();
      if ( !game.user.isGM ) return;
      let state = this.wall.document.ds;
      const states = CONST.WALL_DOOR_STATES;
      if ( state === states.OPEN ) return;
      state = state === states.LOCKED ? states.CLOSED : states.LOCKED;
      const sound = !(game.user.isGM && game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.ALT));
      return this.wall.document.update({ds: state}, {sound});
    }
  }
  