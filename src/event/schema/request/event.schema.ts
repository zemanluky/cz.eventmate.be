import {z} from "zod";

export const allEventsValidator = z.object({
    pageSize: z.string(), //number
    pageNumber: z.string() //number
});

export const friendsEventsValidator = z.object({
    pageSize: z.string(), //number
    pageNumber: z.string() //number
});

export const userEventsValidator = z.object({
    userId: z.string(), //id
    pageSize: z.string(), //number
    pageNumber: z.string() //number
});

export const filterEventsValidator = z.object({
    longtitude: z.string().optional(), //number
    latitude: z.string().optional(), // number
    range: z.string().optional(), //number
    dateStart: z.string().optional(), //date
    dateEnd: z.string().optional(), //date
    rating: z.string().optional(), // number
    type: z.string().optional(), //type?
    pageSize: z.string(), //number
    pageNumber: z.string() //number
});

export type TAllEventsValidator = z.infer<typeof allEventsValidator>;
export type TFriendsEventsValidator = z.infer<typeof friendsEventsValidator>;
export type TUserEventsValidator = z.infer<typeof userEventsValidator>;
export type TFilterEventsValidator = z.infer<typeof filterEventsValidator>;