import { Constants } from "./constants.js";

export function getScaleFactor(bottomY, scene) {
    const horizonY = scene.getFlag(Constants.MODULE_ID, "horizonTop") * scene.dimensions.sceneHeight;
    return Math.max(0.001, bottomY - scene.dimensions.sceneY - horizonY) / (scene.dimensions.sceneHeight - horizonY);
}

export function getScaleFactorByTopY(topY, baseHeight, scene) {
    const horizonY = scene.getFlag(Constants.MODULE_ID, "horizonTop") * scene.dimensions.sceneHeight;
    return Math.max(0.001, topY - scene.dimensions.sceneY - horizonY) / (scene.dimensions.sceneHeight - horizonY - baseHeight * scene.grid.size);
}

export function getScaleFactorByCenterY(centerY, baseHeight, scene) {
    const horizonY = scene.getFlag(Constants.MODULE_ID, "horizonTop") * scene.dimensions.sceneHeight;
    return Math.max(0.001, centerY - scene.dimensions.sceneY - horizonY) / (scene.dimensions.sceneHeight - horizonY - baseHeight / 2 * scene.grid.size);
}