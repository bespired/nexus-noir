import * as THREE from 'three';
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

        console.log('[PATH] Registering NavMesh:', mesh.name || 'unnamed');
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
            return null;
        }

        // Apply a tiny vertical offset to ensure we hit the mesh from above
        const offsetStart = start.clone().add(new THREE.Vector3(0, 0.1, 0));
        const offsetEnd = end.clone().add(new THREE.Vector3(0, 0.1, 0));

        const startGroup = this.pathfinding.getGroup(this.ZONE, offsetStart);
        const endGroup = this.pathfinding.getGroup(this.ZONE, offsetEnd);

        if (startGroup === null) {
            console.warn('[PATH] Start point is outside NavMesh', start);
            return null;
        }

        if (endGroup === null) {
            console.warn('[PATH] End point is outside NavMesh', end);
            return null;
        }

        if (startGroup !== endGroup) {
            console.error(`[PATH] Disconnected islands: Start Group ${startGroup}, End Group ${endGroup}`);
            return null;
        }

        // Snap points to the mesh to ensure they are exactly on the NavMesh before pathfinding
        const startNode = this.pathfinding.getClosestNode(offsetStart, this.ZONE, startGroup);
        const endNode = this.pathfinding.getClosestNode(offsetEnd, this.ZONE, endGroup);

        const snappedStart = startNode ? startNode.centroid : offsetStart;
        const snappedEnd = endNode ? endNode.centroid : offsetEnd;

        const path = this.pathfinding.findPath(snappedStart, snappedEnd, this.ZONE, startGroup);

        if (path && path.length > 0) {
            console.log(`[PATH] Found path with ${path.length} segments`);
            // Add the final precise target point as the last segment
            const finalPath = path.map(p => p.clone());
            finalPath.push(end.clone());
            return finalPath;
        }

        console.warn('[PATH] No path found between snapped points', { snappedStart, snappedEnd });
        return null;
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
