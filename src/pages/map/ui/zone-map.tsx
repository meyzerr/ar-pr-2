import type {Zone, Position} from '@/entities/zone'
import {GeoJSONSource, LngLatBounds,Map,MapMouseEvent,NavigationControl,type FilterSpecification,type IControl,type MapLayerMouseEvent,type StyleSpecification, } from "maplibre-gl";
import type {Feature,FeatureCollection, Polygon} from 'geojson';
import MapDrowBox from"@mapbox/mapbox-gl-draw";
import { useEffect, useRef } from 'react';

interface ZoneMapProps{
    zones: Zone[];
    selectedZoneId:string | null;
    isCreating:boolean;
    drawRevision: number;
    onSelectZone:(zoneId:string | null) => void
    onDraftChange:(coordinates:Position[]) => void
}

const ZONE_SOURCE = "zones";
const ZONES_FILL_LAYER = "zones-fill";
const ZONES_LINE_LAYER = "zones-line";
const SELECTED_FILL_LAYER = "selected-zone-fill";
const SELECTED_LINE_LAYER = "selected-zone-line";


const osmStyle: StyleSpecification = {
    version:8,
    sources:{
        osm:{
            type: "raster",
            tiles:["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize:256,
            attribution:"Open Street Map"
        }
    },
    layers:[{id: "osm", type:"raster",source:"osm"}]

}

function zoneFeature(zone:Zone):Feature<Polygon, {id: string; name:string}> {
    return{
        type:"Feature",
        properties:{id:zone.id,name:zone.name},
        geometry:{
            type:"Polygon",
            coordinates:[[...zone.coordinates,zone.coordinates[0]]]
        }
    }
}

function zonesCollection(zones:Zone[]):FeatureCollection<Polygon, {id:string, name:string}>{
    return{
        type:"FeatureCollection",
        features:zones.filter((zone) => zone.coordinates.length > 3)
        .map(zoneFeature)
    }
}

function getPolygonCoordinates(features:Feature[]):Position[]{
    const feature = features.find((item) => item.geometry.type ==="Polygon");
    if(!feature || feature.geometry.type !== "Polygon") return [];
    return feature.geometry.coordinates[0]
    .slice(0,-1)
    .map(([lat,lon]) =>[
        Number(lon.toFixed(6)),
        Number(lat.toFixed(6))
    ]as Position)
}

function getDrawStyles(){
    return MapDrowBox.lib.theme.map(layer => {
        if(layer.type ==="fill"){
            return{
                ...layer,
                paint:{...layer.paint,"fill-color":"#0405fa","fill-opacity":0.22}
            }
        }
        if(layer.type === "circle"){
            const isOuterMarker = layer.id.includes("outher");
            return{
                ...layer,
                paint:{
                    ...layer.paint,
                    "circle-color":isOuterMarker ? "#ffffff":"#0405fa",
                    "circle-stroke-color":isOuterMarker ? "#0405fa" : "#ffffff",
                    "circle-stroke-width":1.5
                }


            }
        }
        if(layer.type !== "line") return layer;

        return{
            ...layer,
            paint:{
                ...layer.paint,
                "line-color" :"#0405fa",
                "line-dasharray":["literal", [1,0]],
                "line-width" : 3
            }
        }
    })
}

function fitZones(map: Map, zones:Zone[]){
    const coordinates = zones.flatMap((zone) => zone.coordinates);
    if(coordinates.length === 0) return;

    const bounds = coordinates.reduce((currentBounds, point) =>  currentBounds.extend(point),new LngLatBounds(coordinates[0],coordinates[0]))
    map.fitBounds(bounds, {padding:90,maxZoom:14,duration:0})
}

export function ZonesMap({
    zones,
    selectedZoneId,
    isCreating,
    drawRevision,
    onSelectZone,
    onDraftChange
}:ZoneMapProps){
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<Map | null>(null);
    const drawRef = useRef<MapDrowBox | null>(null);
    const zonesRef = useRef(zones);
    const isCreatingRef = useRef(isCreating);
    const onSelectZoneRef = useRef(onSelectZone);
    const onDraftChangeRef = useRef(onDraftChange);

    zonesRef.current = zones;
    isCreatingRef.current = isCreating;
    onSelectZoneRef.current = onSelectZone;
    onDraftChangeRef.current = onDraftChange;

    useEffect(() => {
        if(!containerRef.current) return;

        const map = new Map({
            container: containerRef.current,
            style:osmStyle,
            center: [47.2460 ,56.1322],
            zoom:10,
            attributionControl:{compact: true}

        });

        const draw = new MapDrowBox({ displayControlsDefault: false, styles:getDrawStyles()});

        map.addControl(new NavigationControl({showCompass:false}),"bottom-left");

        map.addControl(draw as unknown as IControl);
        mapRef.current = map;
        drawRef.current = draw;

        const syncDraft = (event: MapboxDraw.DrawCreateEvent | MapDrowBox.DrawUpdateEvent) => onDraftChangeRef.current(getPolygonCoordinates(event.features));
        
        const selectZone = (event:MapLayerMouseEvent) => {
            if(isCreatingRef.current) return;
            const zoneId = event.features?.[0]?.properties?.id;
            if(typeof zoneId ==="string") onSelectZoneRef.current(zoneId);

        }
        
        const clearSelection = (event:MapMouseEvent)=>{
            if(isCreatingRef.current) return;
            const features = map.queryRenderedFeatures(
                event.point, {layers:[ZONES_FILL_LAYER] }
            );
            if(features.length === 0) onSelectZoneRef.current(null);
        }

        const showPointer = () => {map.getCanvas().style.cursor = "pointer";};
        const resetPointer = () => {map.getCanvas().style.cursor = "";};

        map.on("draw.create" as never, syncDraft);
        map.on("draw.update" as never, syncDraft);
        map.on("click" as never,ZONES_FILL_LAYER,selectZone);
        map.on("click" as never,clearSelection);
        map.on("mouseenter" as never,ZONES_FILL_LAYER,showPointer);
        map.on("mouseleave" as never,ZONES_FILL_LAYER,resetPointer);

        map.once("load",() =>{
            map.addSource(ZONE_SOURCE,{type:"geojson", data:zonesCollection(zonesRef.current)});
            map.addLayer({
                id:ZONES_FILL_LAYER,
                type:"fill",
                source:ZONE_SOURCE,
                paint:{ "fill-color":"#059669","fill-opacity" :0.2 }
            });
            map.addLayer({
                id:ZONES_LINE_LAYER,
                type:"line",
                source:ZONE_SOURCE,
                paint:{ "line-color":"#047857","line-width" :2 }
            });
            map.addLayer({
                id:SELECTED_FILL_LAYER,
                type:"fill",
                source:ZONE_SOURCE,
                filter:["==",["get","id"],""],
                paint: { "fill-color":"#d97706","fill-opacity" :0.2 }
            });
            map.addLayer({
                id:SELECTED_LINE_LAYER,
                type:"line",
                filter:["==",["get","id"],""],
                source:ZONE_SOURCE,
                paint:{ "line-color":"#059669","line-width" :3 }
            });

            

        })
        fitZones(map, zonesRef.current);

        return() => {
            map.off("draw.create" as never, syncDraft);
            map.off("draw.update" as never, syncDraft);
            map.off("click" as never,ZONES_FILL_LAYER,selectZone);
            map.off("click" as never,clearSelection);
            map.off("mouseenter" as never,ZONES_FILL_LAYER,showPointer);
            map.off("mouseleave" as never,ZONES_FILL_LAYER,resetPointer);
            map.remove();
            mapRef.current = null;
            drawRef.current = null;
        }

    }, []);

    useEffect(() => {
        const source = mapRef.current?.getSource(ZONE_SOURCE) as GeoJSONSource | undefined;
        source?.setData(zonesCollection(zones));
    }, [zones]);

    useEffect(()=> {
        const map = mapRef.current;
        if(!map) return;
        if(!map.getLayer(SELECTED_FILL_LAYER)) return;
        const filter: FilterSpecification = ["==",["get", "id"],selectedZoneId ?? ""];
        map.setFilter(SELECTED_FILL_LAYER,filter);
        map.setFilter(SELECTED_LINE_LAYER,filter);
    },[selectedZoneId]);

    useEffect(() =>{
        const draw = drawRef.current;
        if(!draw) return;
        draw.deleteAll();
        if(isCreating) draw.changeMode("draw_polygon");
        else draw.changeMode("simple_select");

    },[drawRevision,isCreating]);
    return <div ref={containerRef} className="!absolute inset-0"></div>

}