import {useState} from "react";
import { ZonesMap } from "./zone-map";
import { type Position, type Zone } from "@/entities/zone";

export function MapPage(){
    const [zones, setZones] = useState<Zone[]>([]);
    const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
    const [draftCoordinates, setDraftCoordinated] = useState<Position[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [drawRevision, setDrawRevision] = useState(0);

    const handleSave = () => {
        const zone: Zone = {
            id: Date.now().toString(36),
            name: "",
            updateAt: new Date().toISOString(),
            coordinates: draftCoordinates
        };
        const nextZone = [zone, ...zones];
        setZones(nextZone);
        setIsCreating(false);
        setSelectedZoneId(null);
    }

    const startCreating = () => {
        setSelectedZoneId(null);
        setDraftCoordinated([]);
        setIsCreating(true);
        setDrawRevision((revision) => revision + 1);
    };

    return <main className="h-dvh w-full overflow-hidden relatives" >
         <ZonesMap
    zones={zones}
    selectedZoneId={selectedZoneId}
    isCreating={isCreating}
    drawRevision={drawRevision}
    onSelectZone={setSelectedZoneId}
    onDraftChange={setDraftCoordinated}
    />

    <button className="absolute z-20 left-0" onClick={startCreating}>Добавить</button>

    <button className="absolute z-20 left-20" onClick={handleSave}>Сохранить</button>

    </main>
}