export function getScaleFactor(y, scene) {
    const horizonY = scene.getFlag("aioros-vistas", "horizonTop") * scene.dimensions.sceneHeight;
    return (y - horizonY) / (scene.dimensions.sceneHeight - horizonY);
}