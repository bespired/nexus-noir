
export function useGameAssets() {

    const resolveAssetUrl = (path) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;

        // Explicitly handle /storage prefix if already present
        if (path.startsWith('/storage/')) return path;

        // Standardize 'artwork/' prefix mapping to '/storage/'
        if (path.startsWith('artwork/')) return `/storage/${path}`;

        // Handle specific folders like '3d/glb' mapping to '/storage/3d/glb'
        if (path.startsWith('3d/') || path.startsWith('/3d/')) {
            const clean = path.startsWith('/') ? path.slice(1) : path;
            return `/storage/${clean}`;
        }

        // Default fallback: assume it is in storage if not specified
        if (path.startsWith('/')) return `/storage${path}`;
        return `/storage/${path}`;
    };

    const getVehicleGlbUrl = (path) => {
        if (!path) return '';
        // Strip 'artwork/' if it's at the start
        let cleanPath = path.replace(/^artwork\//, '');

        // Ensure it's in the glb folder if it's just a filename
        if (!cleanPath.includes('/')) {
            cleanPath = `glb/${cleanPath}`;
        }

        const url = resolveAssetUrl(cleanPath);
        console.log(`[DEBUG] Resolved Vehicle URL: ${url} (original: ${path})`);
        return url;
    };

    const getPersonageGlbUrl = (personage) => {
        if (!personage) return null;

        // Check media for 'threefile' type or GLB extension
        if (personage.media && personage.media.length > 0) {
            const glb = personage.media.find(m => m.filepad && m.filepad.endsWith('.glb'));
            if (glb) return resolveAssetUrl(glb.filepad);
        }

        // Fallback if no media found but 'threefile' property exists (legacy catch)
        if (personage.threefile) return resolveAssetUrl(`glb/${personage.threefile}`);

        return null;
    };

    return {
        resolveAssetUrl,
        getVehicleGlbUrl,
        getPersonageGlbUrl
    };
}
