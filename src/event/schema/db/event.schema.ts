import {type InferRawDocType, model, type Model, Schema, Types} from "mongoose";
import * as mongoose from "mongoose";

export interface IEvent {
    _id: mongoose.Types.ObjectId;
    name: string;
    description: string;
    date: Date;
    location: string;
    private: boolean;
    category: string;
    ownerId: Types.ObjectId;
}

type TEventModel = Model<IEvent>;

const eventSchema = new Schema<IEvent, TEventModel>({
    name: { type: String, required: true },
    description: { type: String, required: false },
    date: { type: Date, required: true },
    private: { type: Boolean, required: true }, 
    location: { type: String, required: true },
    category: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, required: true },
});

export const Event = model<IEvent, TEventModel>('Event', eventSchema);
export type TEvent = InferRawDocType<typeof eventSchema>;