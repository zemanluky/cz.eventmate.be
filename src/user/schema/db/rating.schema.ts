import {type HydratedDocument, type Model, Schema, Types} from "mongoose";

export interface IUserRating {
    _id: Types.ObjectId;
    // The user who rated
    author: Types.ObjectId;
    // Number of stars given to the user
    starRating: number;
    // The comment given
    comment: string;
    // The date when the rating was given
    createdAt: Date;
}

export type THydratedRatingDocument = HydratedDocument<IUserRating>;
export type TUserRatingModel = Model<IUserRating, {}, {}, {}, THydratedRatingDocument>;

export const userRatingSchema = new Schema<IUserRating, TUserRatingModel>({
    author: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    starRating: { type: Number, required: true, min: 0, max: 5 },
    comment: { type: String, required: false, default: null },
    createdAt: { type: Date, required: true, default: Date.now }
});
