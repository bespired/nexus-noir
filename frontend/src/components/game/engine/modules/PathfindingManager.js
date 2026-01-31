import { Pathfinding } from 'three-pathfinding';

export class PathfindingManager {
    constructor(engine) {
        this.engine = engine;
        this.pathfinding = new Pathfinding();
        this.ZONE = 'level1';
        this.navMesh = null;
    }

    /**
     * Set the current navigation mesh
     * @param {THREE.Mesh} mesh 
     */
    setNavMesh(mesh) {
        if (!mesh || !mesh.geometry) {
            console.warn('[PATH] Invalid NavMesh provided');
            return;
        }

        console.log('[PATH] Registering NavMesh:', mesh.name);
        this.navMesh = mesh;

        // three-pathfinding creates zones from geometries
        this.pathfinding.setZoneData(this.ZONE, Pathfinding.createZone(mesh.geometry));
    }

    /**
     * Find a path between two points
     * @param {THREE.Vector3} start 
     * @param {THREE.Vector3} end 
     * @returns {THREE.Vector3[]|null}
     */
    findPath(start, end) {
        if (!this.navMesh) {
            console.warn('[PATH] No NavMesh registered');
            return [end]; // Fallback to straight line
        }

        const groupID = this.pathfinding.getGroup(this.ZONE, start);
        if (groupID === null) {
            console.warn('[PATH] Start point is outside NavMesh');
            return [end];
        }

        const path = this.pathfinding.findPath(start, end, this.ZONE, groupID);

        if (path && path.length > 0) {
            console.log(`[PATH] Found path with ${path.length} segments`);
            return path.map(p => p.clone());
        }

        console.warn('[PATH] No path found');
        return [end];
    }

    /**
     * Get a point on the NavMesh closest to the given point
     * @param {THREE.Vector3} point 
     * @returns {THREE.Vector3}
     */
    getClosestPoint(point) {
        if (!this.navMesh) return point;
        const groupID = this.pathfinding.getGroup(this.ZONE, point);
        if (groupID === null) return point;
        return this.pathfinding.getClosestNode(point, this.ZONE, groupID).centroid;
    }

    cleanup() {
        this.pathfinding = new Pathfinding();
        this.navMesh = null;
    }
}
