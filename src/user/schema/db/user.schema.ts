import {type HydratedDocument, type InferRawDocType, model, type Model, Schema, Types} from "mongoose";
import {type IUserRating, type THydratedRatingDocument, userRatingSchema} from "./rating.schema.ts";

export interface IUser {
    _id: Types.ObjectId;
    // User's name
    name: string;
    // User's surname
    surname: string;
    // The email of the user.
    email: string;
    // The username of the user.
    username: string;
    // User's bio
    bio: string|null;
    // Path to the uploaded profile picture
    profile_picture_path: string|null;
    // Array of friends of a given user
    friends: Array<Types.ObjectId>;
    // Array of ratings given to the user
    ratings: Array<IUserRating>;
}

export type THydratedUserDocument = HydratedDocument<IUser & { ratings?: Types.DocumentArray<THydratedRatingDocument> }>;

type TUserModel = Model<IUser, {}, {}, {}, THydratedUserDocument>;

const userSchema = new Schema<IUser, TUserModel>({
    name: { type: String, required: true },
    surname: { type: String, required: true },
    email: { type: String, required: true, index: true, unique: true },
    username: { type: String, required: true, index: true, unique: true },
    bio: { type: String, required: false, default: null },
    profile_picture_path: { type: String, required: false, default: null },
    friends: { type: [Types.ObjectId], required: false, default: [] },
    ratings: { type: [userRatingSchema], required: false, default: [] },
});



export const User = model<IUser, TUserModel>('User', userSchema);
export type TUser = InferRawDocType<typeof userSchema>;