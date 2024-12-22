import { z } from "zod";
import mongoose, {Types} from "mongoose";
import {startOfToday} from "date-fns";
import {zodObjectId} from "../../utils/validation.utils.ts";

export const idSchema = z.string().refine((id: any) => mongoose.Types.ObjectId.isValid(id), {
  message: "Invalid ObjectId",
});

export const eventSchema = z.object({
    name: z.string().trim().min(1),
    description: z.string().nullable().optional(),
    date: z.coerce.date().min(startOfToday()),
    location: z.string().trim().min(1),
    private: z.boolean()
});
export type TEventBody = z.infer<typeof eventSchema>;

export const filterEventsValidator = z.object({
    userId: z.string().optional(),
    location: z.string().optional(), //string
    dateStart: z.coerce.date().optional(), //date
    dateEnd: z.coerce.date().optional(), //date
    rating: z.coerce.number().optional(), // number
    category: z.string().pipe(zodObjectId).transform(val => new Types.ObjectId(val)).optional(), //string
    filter: z.enum(['friends-only', 'public-only', 'all']).default('all'),
    pageSize: z.coerce.number().min(1).default(25), //number
    pageNumber: z.coerce.number().min(1).default(1) //number
});

export type TFilterEventsValidator = z.infer<typeof filterEventsValidator>;