# Simple Vistas

A Foundry VTT module inspired by [Ember](https://foundryvtt.com/ember/)'s vista system.

### How it works
- create a new scene: I recommend a nice wide background, and not too much recognizable detail on the ground;
- set its vista options: this includes the width of the scene at its closest side, the strength of the parallax effect, and the height of the horizon:
  
![sceneconfig](https://github.com/user-attachments/assets/3b3e141e-e956-4175-b648-de8504d874d6)
- the horizons can also be modified by drag and drop in the vista perspective layer; try to adapt them to your background image's perspective:
  
  ![layer](https://github.com/user-attachments/assets/d5a420c1-bdc9-48fc-bb76-6f1e63c00dbf)
- you can now drag tokens and tiles to this scene; tokens will automatically use the actor portrait image (if available); tiles will keep their texture and their proportion, but can also be resized. Both have settings to define their size in this type of scene:
  
![tokensettings](https://github.com/user-attachments/assets/d597f1de-863f-4bdb-8ec6-7cbdb86329bc)

### Important note
This module is... a prototype at best. Don't expect anything near the level of polish that we saw in Ember. I don't have different biomes, I don't have sprite sheets with optimized textures for each, or the nice configuration windows showed in Ember's preview streams. I use our good ol' tiles and tiles browser for scene building, and it is a little cumbersome.
Also, a module like this is close to useless without actual assets to go with it, but I'm not an artist. I did include a sample scene, built with [this](https://aeynit.itch.io/packfantasyforest1) lovely pack by [Aeynit](https://aeynit.itch.io/), and a few of their assets in the module's folder itself, so that it can be tried out at least.
The goal was to have the basic functionality in place somewhat quickly so that:

 1. we would have something vaguely similar to vistas while we wait for the real thing, and
 2. maybe some community artists could get a head start on creating this kind of assets.

### Less obvious features

 - You can also resize a tile in the scene with the mouse scroll wheel while it's selected and pressing Ctrl or Shift (replaces the tile rotation);
 - You can have your token face the opposite side by using the additional button in the HUD.
   
![mirror](https://github.com/user-attachments/assets/966b6251-f535-415a-85c3-a6f327f05fc3)
