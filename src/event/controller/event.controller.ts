import express, { type Request, type Response } from "express";
import { BadRequestError } from "../error/response/bad-request.error";
import { Event, type IEvent } from "../schema/db/event.schema";
import { loginGuard } from "../helper/login-guard";
import { bodyValidator, paramValidator, queryValidator } from "../helper/request.validator";
import type { AppRequest } from "../types";
import {eventSchema, idSchema, type TEventBody} from "../schema/request/event.schema";
import mongoose from "mongoose";
import { filterEventsValidator, type TFilterEventsValidator } from "../schema/request/event.schema";
import {createEvent, getEvent, getFilteredEvents, removeAttendance, updateEvent,} from "../service/event.service.ts"
import { successResponse } from "../helper/response.helper.ts";
import { markAttendance } from "../service/event.service.ts";
import { getMonthOverview } from '../service/event.service';

export const eventController = express.Router();

eventController.post("/:id/attendance", loginGuard(), paramValidator(idSchema), (req: AppRequest, res: Response) => {
    const eventId = req.params.id;
    const userId = req.user?.id;

    markAttendance(eventId, userId)
        .then((attendance: any) => {
            successResponse(res, attendance);
        })
        .catch((error: Error) => {
            res.status(500).json({ message: error.message });
        });
});





eventController.get('/',
    loginGuard(), queryValidator(filterEventsValidator),
    async (req: AppRequest<never,never,TFilterEventsValidator>, res: Response) => {
        const events = await getFilteredEvents(req.parsedQuery!, req.user!.id);
        successResponse(res, events);
    });

// Get a specific event by ID
eventController.get("/:id",
    loginGuard(),
    async (req: Request, res: Response) => {
        const event = await getEvent(req.params.id);
        successResponse(res, event);
    }
);

// Create a new event
eventController.post(
    "/", loginGuard(), bodyValidator(eventSchema),
    async (req: AppRequest<never,never,TEventBody>, res: Response) => {
        const newEvent = await createEvent(req.body, req.user!.id);
        successResponse(res, newEvent);
    }
);

// Update an existing event
eventController.put(
    "/:id", loginGuard(), bodyValidator(eventSchema),
    async (req: AppRequest<never,never,TEventBody>, res: Response) => {
        const updatedEvent = await updateEvent(req.params.id, req.body, req.user!.id);
        successResponse(res, updatedEvent);
    }
);

// Not oficially part of the API, just for testing purposes
eventController.get("/list-all", async (req: Request, res: Response) => {
	const events = await Event.find();

	res.status(200).send(events);
});

function next(error: unknown) {
    throw new Error("Function not implemented.");
}
function markAttendance(eventId: any, userId: string) {
    throw new Error("Function not implemented.");
}

eventController.delete("/:id/attendance", loginGuard(), paramValidator(idSchema), async (req: AppRequest, res: Response) => {
    const eventId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const remove = await removeAttendance(eventId, userId);
        successResponse(res, remove);
});

eventController.get('/month-overview', 
    loginGuard(), 
    queryValidator(filterEventsValidator),
    async (req: Request, res: Response) => {
            const events = await getMonthOverview(req.user!.id, req.parsedQuery!);
            successResponse(res, events);    
    }
);
