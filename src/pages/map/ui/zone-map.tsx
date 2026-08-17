import type { Zone, Position } from '@/entities/zone';
import type { Feature, FeatureCollection, Polygon } from 'geojson';

interface ZoneMapProps {
    zones: Zone[];
    selectedZoneId: string | null;
    isCreating: boolean;
    drawRevision: number;
    onSelectZone:(zoneId: string | null) => void;
    onDraftChange: (coordinates: Position[]) => void;

}

const ZONE_SOURCE = "zones";
const ZONE_FILL_LAYER = "zones-fill";
const ZONE_LINE_LAYER = "zones-line";
const SELECTED_FILL_LAYER = "selected-zone-fill";
const SELECTED_LINE_LAYER = "selected-zone-fill";

const osmStyle = {
    version: 8,
    sources: {
        osm: {
            type: "raster",
            tiles: ["https://tile/openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "Open Street Map"
        }
    },

    layers: [{id: "osm", type: "raster", source: "osm"}]
}

function zoneFeature(zone: Zone): Feature<Polygon, {id: string; name:string}> {
    return {
        type: "Feature",
        properties: {id: zone.id, name: zone.name },
        geometry: {
            type: "Polygon",
            coordinates: [[...zone.coordinates, zone.coordinates[0]]]
        }
    }
}

function zonesCollection(zones: Zone[]): FeatureCollection<Polygon, {id: string, name: string}>{
    return {
        type: "FeatureCollection",
        features: zones.filter((zone) => zone.coordinates.length > 3).map(zoneFeature)
    }
}

function getPolygonCoordinates(features: Feature[]): Position[]{
    const feature = features.find((item) => item.geometry.type === "Polygon");
    if(!feature || feature.geometry.type !== "Polygon") return [];

    return feature.geometry.coordinates[0].slice(0, -1)
    .map(([lat, lon]) => [
        Number(lon.toFixed(6)),
        Number(lat.toFixed(6))
    ] as Position)
}