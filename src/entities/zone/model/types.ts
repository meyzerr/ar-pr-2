export  type Position = [longitude: number, latitude: number];

export interface Zone {
    id: string;
    name: string;
    coordinates: Position[];
    updatedAt: string;
}