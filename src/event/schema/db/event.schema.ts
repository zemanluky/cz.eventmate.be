import { model, Schema, Types, Document } from "mongoose";

export interface IEvent {
    _id: Types.ObjectId;
    name: string;
    description?: string | null;
    date: Date;
    location: string;
    private: boolean;
    category: string;
    ownerId: Types.ObjectId;
    attendees: Types.ObjectId[];
}


const eventSchema = new Schema<IEvent>({
    name: { type: String, required: true },
    description: { type: String, required: false, default: null },
    date: { type: Date, required: true },
    private: { type: Boolean, required: true },
    location: { type: String, required: true },
    category: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, required: true },
    attendees: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
});


export const Event = model<IEvent>('Event', eventSchema);
